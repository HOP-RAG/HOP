import json
from datetime import datetime
from datetime import timezone
from typing import Any
from typing import Annotated
from urllib.parse import parse_qsl
from urllib.parse import urlencode
from urllib.parse import urlsplit
from urllib.parse import urlunsplit
from uuid import uuid4

from fastapi import APIRouter
from fastapi import Depends
from fastapi import Query
from fastapi import Request
from pydantic import BaseModel
from pydantic import Field
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from onyx.auth.users import current_curator_or_admin_user
from onyx.configs.app_configs import WEB_DOMAIN
from onyx.configs.constants import DocumentSource
from onyx.db.connector_account import create_connector_sync_job
from onyx.db.connector_account import fetch_connector_account_by_id_for_user
from onyx.db.connector_account import fetch_connector_account_by_identity
from onyx.db.connector_account import fetch_connector_accounts_for_user
from onyx.db.credentials import create_credential
from onyx.db.credentials import fetch_credentials_by_source_for_user
from onyx.db.credentials import backend_update_credential_json
from onyx.db.engine.sql_engine import get_session
from onyx.db.enums import ConnectorAccountStatus
from onyx.db.enums import ConnectorCredentialPairStatus
from onyx.db.enums import ConnectorCredentialType
from onyx.db.enums import SyncStatus
from onyx.db.index_attempt import get_latest_index_attempt_for_cc_pair_id
from onyx.db.models import Connector
from onyx.db.models import ConnectorAccount
from onyx.db.models import ConnectorCredentialPair
from onyx.db.models import Credential
from onyx.db.models import User
from onyx.error_handling.error_codes import OnyxErrorCode
from onyx.error_handling.exceptions import OnyxError
from onyx.redis.redis_pool import get_redis_client
from onyx.server.documents.connector import trigger_indexing_for_cc_pair
from onyx.server.documents.connector_account_adapters import (
    ExistingCredentialAccountInfo,
)
from onyx.server.documents.connector_account_adapters import (
    get_connector_account_adapter,
)
from onyx.server.documents.models import CredentialBase
from onyx.server.documents.models import CredentialSnapshot
from onyx.server.models import StatusResponse
from shared_configs.contextvars import get_current_tenant_id

router = APIRouter(prefix="/manage/connectors")

_OAUTH_STATE_KEY_FMT = "oauth_state:{state}"
_OAUTH_STATE_EXPIRATION_SECONDS = 10 * 60
_DESIRED_RETURN_URL_KEY = "desired_return_url"
_ADDITIONAL_KWARGS_KEY = "additional_kwargs"
_RECONNECT_ACCOUNT_ID_KEY = "reconnect_account_id"


class OAuthAdditionalKwargDescription(BaseModel):
    name: str
    display_name: str
    description: str


class OAuthStartResponse(BaseModel):
    url: str


class ConnectorAccountSnapshot(BaseModel):
    id: int
    source: DocumentSource
    name: str | None
    status: ConnectorAccountStatus
    credential_type: ConnectorCredentialType
    external_account_id: str | None
    external_account_email: str | None
    account_metadata: dict[str, Any] = Field(default_factory=dict)
    settings: dict[str, Any] = Field(default_factory=dict)
    last_error: str | None
    last_connected_at: datetime | None
    last_sync_at: datetime | None
    last_sync_status: SyncStatus | None
    linked_connector_count: int
    can_disconnect: bool
    can_reconnect: bool
    can_sync: bool
    credential: CredentialSnapshot | None


class ConnectorProviderStatusResponse(BaseModel):
    source: DocumentSource
    oauth_enabled: bool
    additional_kwargs: list[OAuthAdditionalKwargDescription]
    accounts: list[ConnectorAccountSnapshot]


class ConnectorAccountSettingsUpdateRequest(BaseModel):
    settings: dict[str, Any]


class OAuthCallbackRedirectResponse(BaseModel):
    redirect_url: str


def _append_query_params(url: str, params: dict[str, str | int]) -> str:
    split_result = urlsplit(url)
    query_params = dict(parse_qsl(split_result.query, keep_blank_values=True))
    for key, value in params.items():
        query_params[key] = str(value)

    return urlunsplit(
        (
            split_result.scheme,
            split_result.netloc,
            split_result.path,
            urlencode(query_params),
            split_result.fragment,
        )
    )


def _index_attempt_status_to_sync_status(status_value: str | None) -> SyncStatus | None:
    if status_value is None:
        return None
    if status_value == "in_progress":
        return SyncStatus.IN_PROGRESS
    if status_value in {"success", "completed_with_errors"}:
        return SyncStatus.SUCCESS
    if status_value == "canceled":
        return SyncStatus.CANCELED
    if status_value == "failed":
        return SyncStatus.FAILED
    return None


def _additional_kwarg_descriptions(source: DocumentSource) -> list[OAuthAdditionalKwargDescription]:
    adapter = get_connector_account_adapter(source)
    if not adapter:
        return []

    schema = adapter.additional_kwargs_model().model_json_schema()
    properties = schema.get("properties", {})
    descriptions: list[OAuthAdditionalKwargDescription] = []
    for key, value in properties.items():
        descriptions.append(
            OAuthAdditionalKwargDescription(
                name=key,
                display_name=value.get("title", key),
                description=value.get("description", ""),
            )
        )
    return descriptions


def _build_oauth_start_response(
    request: Request,
    source: DocumentSource,
    desired_return_url: str | None,
    account_id: int | None,
) -> OAuthStartResponse:
    adapter = get_connector_account_adapter(source)
    if not adapter or not adapter.oauth_enabled():
        raise OnyxError(
            OnyxErrorCode.NOT_IMPLEMENTED,
            f"OAuth is not enabled for {source.value}.",
        )

    tenant_id = get_current_tenant_id()
    additional_kwargs = _validated_additional_kwargs(request, source)
    state = str(uuid4())
    return_url = desired_return_url or f"{WEB_DOMAIN}/admin/connectors/{source.value}"

    _store_oauth_state(
        tenant_id=tenant_id,
        state=state,
        payload={
            _DESIRED_RETURN_URL_KEY: return_url,
            _ADDITIONAL_KWARGS_KEY: additional_kwargs,
            _RECONNECT_ACCOUNT_ID_KEY: account_id,
        },
    )

    try:
        oauth_url = adapter.oauth_authorization_url(
            base_domain=WEB_DOMAIN,
            state=state,
            additional_kwargs=additional_kwargs,
        )
    except Exception as e:
        raise OnyxError(OnyxErrorCode.INVALID_INPUT, str(e)) from e

    return OAuthStartResponse(
        url=oauth_url
    )


def _validated_additional_kwargs(
    request: Request,
    source: DocumentSource,
) -> dict[str, str]:
    adapter = get_connector_account_adapter(source)
    if not adapter:
        return {}

    additional_kwargs = {
        key: value
        for key, value in request.query_params.items()
        if key not in {"desired_return_url", "account_id"}
    }

    try:
        adapter.additional_kwargs_model()(**additional_kwargs)
    except ValidationError as e:
        raise OnyxError(OnyxErrorCode.VALIDATION_ERROR, str(e)) from e

    return additional_kwargs


def _load_oauth_state(
    state: str,
    tenant_id: str | None,
) -> dict[str, Any]:
    redis_client = get_redis_client(tenant_id=tenant_id)
    state_bytes = redis_client.get(_OAUTH_STATE_KEY_FMT.format(state=state))
    if not state_bytes:
        raise OnyxError(OnyxErrorCode.INVALID_INPUT, "Invalid or expired OAuth state.")
    return json.loads(state_bytes.decode("utf-8"))


def _store_oauth_state(
    tenant_id: str | None,
    state: str,
    payload: dict[str, Any],
) -> None:
    redis_client = get_redis_client(tenant_id=tenant_id)
    redis_client.set(
        _OAUTH_STATE_KEY_FMT.format(state=state),
        json.dumps(payload),
        ex=_OAUTH_STATE_EXPIRATION_SECONDS,
    )


def _clear_oauth_state(state: str, tenant_id: str | None) -> None:
    redis_client = get_redis_client(tenant_id=tenant_id)
    redis_client.delete(_OAUTH_STATE_KEY_FMT.format(state=state))


def _linked_cc_pairs_for_account(
    db_session: Session,
    account: ConnectorAccount,
) -> list[ConnectorCredentialPair]:
    if account.credential_id is None:
        return []

    stmt = (
        select(ConnectorCredentialPair)
        .join(Connector, Connector.id == ConnectorCredentialPair.connector_id)
        .where(ConnectorCredentialPair.credential_id == account.credential_id)
        .where(Connector.source == account.source)
    )
    return list(db_session.scalars(stmt).all())


def _sync_existing_credentials_into_accounts(
    db_session: Session,
    user: User,
    source: DocumentSource,
) -> None:
    adapter = get_connector_account_adapter(source)
    if not adapter:
        return

    accounts = fetch_connector_accounts_for_user(db_session, user, source)
    existing_by_credential_id = {
        account.credential_id: account for account in accounts if account.credential_id
    }

    credentials = fetch_credentials_by_source_for_user(
        db_session=db_session,
        user=user,
        document_source=source,
        get_editable=False,
    )
    created = False
    for credential in credentials:
        if credential.id in existing_by_credential_id:
            continue

        credential_json = (
            credential.credential_json.get_value(apply_mask=False)
            if credential.credential_json
            else {}
        )
        existing_info = adapter.infer_existing_credential_account(
            credential_json=credential_json,
            credential_name=credential.name,
        )
        account = ConnectorAccount(
            source=source,
            user_id=credential.user_id,
            credential_id=credential.id,
            name=existing_info.display_name or credential.name,
            status=ConnectorAccountStatus.CONNECTED,
            credential_type=existing_info.credential_type,
            external_account_id=existing_info.external_account_id,
            external_account_email=existing_info.external_account_email,
            account_metadata=existing_info.provider_metadata,
            settings={},
            last_connected_at=credential.time_updated or credential.time_created,
            last_sync_status=None,
        )
        db_session.add(account)
        created = True

    if created:
        db_session.commit()


def _resolve_account_snapshot(
    db_session: Session,
    account: ConnectorAccount,
) -> ConnectorAccountSnapshot:
    adapter = get_connector_account_adapter(account.source)
    if not adapter:
        raise OnyxError(
            OnyxErrorCode.NOT_FOUND,
            f"No connector adapter registered for {account.source.value}.",
        )

    if account.credential and account.status != ConnectorAccountStatus.DISCONNECTED:
        credential_json = (
            account.credential.credential_json.get_value(apply_mask=False)
            if account.credential.credential_json
            else {}
        )
        health_result = adapter.health_check(credential_json)
        if health_result.updated_credential_json:
            backend_update_credential_json(
                credential=account.credential,
                credential_json=health_result.updated_credential_json,
                db_session=db_session,
            )
            credential_json = health_result.updated_credential_json

        if not health_result.valid:
            account.last_error = health_result.error_message
            account.status = (
                ConnectorAccountStatus.NEEDS_RECONNECT
                if account.credential_type == ConnectorCredentialType.OAUTH
                else ConnectorAccountStatus.ERROR
            )
        elif account.status in {
            ConnectorAccountStatus.CONNECTING,
            ConnectorAccountStatus.NEEDS_RECONNECT,
            ConnectorAccountStatus.ERROR,
        }:
            account.status = ConnectorAccountStatus.CONNECTED
            account.last_error = None

    linked_cc_pairs = _linked_cc_pairs_for_account(db_session, account)
    linked_connector_count = len({cc_pair.connector_id for cc_pair in linked_cc_pairs})

    resolved_status = account.status
    latest_sync_at = account.last_sync_at
    latest_sync_status = account.last_sync_status

    for cc_pair in linked_cc_pairs:
        latest_attempt = get_latest_index_attempt_for_cc_pair_id(
            db_session=db_session,
            connector_credential_pair_id=cc_pair.id,
            secondary_index=False,
            only_finished=False,
        )
        if latest_attempt and (
            latest_sync_at is None or latest_attempt.time_updated > latest_sync_at
        ):
            latest_sync_at = latest_attempt.time_updated
            latest_sync_status = _index_attempt_status_to_sync_status(
                latest_attempt.status.value if latest_attempt.status else None
            )

        if account.status == ConnectorAccountStatus.CONNECTED and (
            cc_pair.status
            in {
                ConnectorCredentialPairStatus.INITIAL_INDEXING,
                ConnectorCredentialPairStatus.SCHEDULED,
            }
            or (
                latest_attempt is not None
                and latest_attempt.status is not None
                and latest_attempt.status.value == "in_progress"
            )
        ):
            resolved_status = ConnectorAccountStatus.SYNCING

    credential_snapshot = (
        CredentialSnapshot.from_credential_db_model(account.credential)
        if account.credential
        else None
    )

    return ConnectorAccountSnapshot(
        id=account.id,
        source=account.source,
        name=account.name,
        status=resolved_status,
        credential_type=account.credential_type,
        external_account_id=account.external_account_id,
        external_account_email=account.external_account_email,
        account_metadata=account.account_metadata,
        settings=account.settings,
        last_error=account.last_error,
        last_connected_at=account.last_connected_at,
        last_sync_at=latest_sync_at,
        last_sync_status=latest_sync_status,
        linked_connector_count=linked_connector_count,
        can_disconnect=adapter.supports_disconnect(account.credential_type),
        can_reconnect=adapter.supports_reconnect(account.credential_type),
        can_sync=linked_connector_count > 0
        and resolved_status
        in {ConnectorAccountStatus.CONNECTED, ConnectorAccountStatus.SYNCING},
        credential=credential_snapshot,
    )


def _upsert_connected_account(
    db_session: Session,
    user: User,
    source: DocumentSource,
    credential: Credential,
    result: ExistingCredentialAccountInfo,
    reconnect_account_id: int | None = None,
) -> ConnectorAccount:
    existing_account: ConnectorAccount | None = None
    if reconnect_account_id is not None:
        existing_account = fetch_connector_account_by_id_for_user(
            db_session=db_session,
            user=user,
            account_id=reconnect_account_id,
        )
    elif result.external_account_id or result.external_account_email:
        existing_account = fetch_connector_account_by_identity(
            db_session=db_session,
            source=source,
            user_id=user.id,
            external_account_id=result.external_account_id,
            external_account_email=result.external_account_email,
        )

    if existing_account is None:
        existing_account = ConnectorAccount(
            source=source,
            user_id=user.id,
            credential_id=credential.id,
        )
        db_session.add(existing_account)

    existing_account.user_id = user.id
    existing_account.credential_id = credential.id
    existing_account.name = result.display_name or credential.name
    existing_account.status = ConnectorAccountStatus.CONNECTED
    existing_account.credential_type = result.credential_type
    existing_account.external_account_id = result.external_account_id
    existing_account.external_account_email = result.external_account_email
    existing_account.account_metadata = result.provider_metadata
    existing_account.last_error = None
    existing_account.disconnected_at = None
    existing_account.last_connected_at = datetime.now(timezone.utc)
    return existing_account


@router.get("/{source}/oauth/start")
def start_connector_oauth(
    request: Request,
    source: DocumentSource,
    desired_return_url: Annotated[str | None, Query()] = None,
    account_id: Annotated[int | None, Query()] = None,
    _: User = Depends(current_curator_or_admin_user),
) -> OAuthStartResponse:
    return _build_oauth_start_response(
        request=request,
        source=source,
        desired_return_url=desired_return_url,
        account_id=account_id,
    )


@router.get("/{source}/oauth/callback")
def complete_connector_oauth(
    source: DocumentSource,
    code: Annotated[str, Query()],
    state: Annotated[str, Query()],
    user: User = Depends(current_curator_or_admin_user),
    db_session: Session = Depends(get_session),
    tenant_id: str | None = Depends(get_current_tenant_id),
) -> OAuthCallbackRedirectResponse:
    adapter = get_connector_account_adapter(source)
    if not adapter:
        raise OnyxError(
            OnyxErrorCode.NOT_FOUND,
            f"OAuth adapter for {source.value} was not found.",
        )

    oauth_state = _load_oauth_state(state=state, tenant_id=tenant_id)
    desired_return_url = oauth_state.get(_DESIRED_RETURN_URL_KEY) or (
        f"{WEB_DOMAIN}/admin/connectors/{source.value}"
    )
    additional_kwargs = oauth_state.get(_ADDITIONAL_KWARGS_KEY, {})
    reconnect_account_id = oauth_state.get(_RECONNECT_ACCOUNT_ID_KEY)

    try:
        try:
            exchange_result = adapter.oauth_code_to_credential(
                base_domain=WEB_DOMAIN,
                code=code,
                additional_kwargs=additional_kwargs,
            )
        except Exception as e:
            raise OnyxError(OnyxErrorCode.BAD_GATEWAY, str(e)) from e

        reconnect_account = None
        if reconnect_account_id is not None:
            reconnect_account = fetch_connector_account_by_id_for_user(
                db_session=db_session,
                user=user,
                account_id=int(reconnect_account_id),
            )
            if reconnect_account is None:
                raise OnyxError(
                    OnyxErrorCode.NOT_FOUND,
                    f"Connector account {reconnect_account_id} was not found.",
                )

        reusable_account = reconnect_account
        if reusable_account is None and (
            exchange_result.external_account_id or exchange_result.external_account_email
        ):
            reusable_account = fetch_connector_account_by_identity(
                db_session=db_session,
                source=source,
                user_id=user.id,
                external_account_id=exchange_result.external_account_id,
                external_account_email=exchange_result.external_account_email,
            )

        credential = reusable_account.credential if reusable_account else None
        if credential is None:
            credential = create_credential(
                credential_data=CredentialBase(
                    credential_json=exchange_result.credential_json,
                    admin_public=True,
                    source=source,
                    name=exchange_result.credential_name,
                ),
                user=user,
                db_session=db_session,
            )
        else:
            credential.name = exchange_result.credential_name
            backend_update_credential_json(
                credential=credential,
                credential_json=exchange_result.credential_json,
                db_session=db_session,
            )

        account_info = ExistingCredentialAccountInfo(
            credential_type=exchange_result.credential_type,
            display_name=exchange_result.display_name,
            external_account_id=exchange_result.external_account_id,
            external_account_email=exchange_result.external_account_email,
            provider_metadata=exchange_result.provider_metadata,
        )
        connector_account = _upsert_connected_account(
            db_session=db_session,
            user=user,
            source=source,
            credential=credential,
            result=account_info,
            reconnect_account_id=(
                int(reconnect_account_id) if reconnect_account_id is not None else None
            ),
        )
        db_session.commit()

        redirect_url = _append_query_params(
            desired_return_url,
            {
                "credentialId": credential.id,
                "connectorAccountId": connector_account.id,
                "message": "connector-account-connected",
            },
        )
        return OAuthCallbackRedirectResponse(redirect_url=redirect_url)
    finally:
        _clear_oauth_state(state=state, tenant_id=tenant_id)


@router.get("/{source}/status")
def get_connector_provider_status(
    source: DocumentSource,
    user: User = Depends(current_curator_or_admin_user),
    db_session: Session = Depends(get_session),
) -> ConnectorProviderStatusResponse:
    _sync_existing_credentials_into_accounts(
        db_session=db_session,
        user=user,
        source=source,
    )

    adapter = get_connector_account_adapter(source)
    accounts = fetch_connector_accounts_for_user(db_session, user, source)
    snapshots = [_resolve_account_snapshot(db_session, account) for account in accounts]
    db_session.commit()

    return ConnectorProviderStatusResponse(
        source=source,
        oauth_enabled=adapter is not None and adapter.oauth_enabled(),
        additional_kwargs=_additional_kwarg_descriptions(source),
        accounts=snapshots,
    )


@router.post("/{source}/reconnect")
def reconnect_connector_provider(
    request: Request,
    source: DocumentSource,
    account_id: Annotated[int, Query()],
    desired_return_url: Annotated[str | None, Query()] = None,
    user: User = Depends(current_curator_or_admin_user),
    db_session: Session = Depends(get_session),
) -> OAuthStartResponse:
    adapter = get_connector_account_adapter(source)
    if not adapter:
        raise OnyxError(
            OnyxErrorCode.NOT_FOUND,
            f"OAuth adapter for {source.value} was not found.",
        )

    account = fetch_connector_account_by_id_for_user(
        db_session=db_session,
        user=user,
        account_id=account_id,
    )
    if not account:
        raise OnyxError(
            OnyxErrorCode.NOT_FOUND,
            f"Connector account {account_id} was not found.",
        )

    if not adapter.supports_reconnect(account.credential_type):
        raise OnyxError(
            OnyxErrorCode.INVALID_INPUT,
            f"{source.value} does not support OAuth reconnect for this account.",
        )

    return _build_oauth_start_response(
        request=request,
        source=source,
        desired_return_url=desired_return_url,
        account_id=account_id,
    )


@router.post("/{source}/disconnect")
def disconnect_connector_provider(
    source: DocumentSource,
    account_id: Annotated[int, Query()],
    user: User = Depends(current_curator_or_admin_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse[int]:
    adapter = get_connector_account_adapter(source)
    if not adapter:
        raise OnyxError(
            OnyxErrorCode.NOT_FOUND,
            f"Connector adapter for {source.value} was not found.",
        )

    account = fetch_connector_account_by_id_for_user(
        db_session=db_session,
        user=user,
        account_id=account_id,
    )
    if not account:
        raise OnyxError(
            OnyxErrorCode.NOT_FOUND,
            f"Connector account {account_id} was not found.",
        )

    if not adapter.supports_disconnect(account.credential_type):
        raise OnyxError(
            OnyxErrorCode.INVALID_INPUT,
            f"{source.value} does not support disconnect for this account.",
        )

    if account.credential and account.credential.credential_json:
        credential_json = account.credential.credential_json.get_value(apply_mask=False)
        adapter.revoke(credential_json)

    account.status = ConnectorAccountStatus.DISCONNECTED
    account.disconnected_at = datetime.now(timezone.utc)
    account.last_error = None
    db_session.commit()

    return StatusResponse(
        success=True,
        message="Connector account disconnected successfully.",
        data=account.id,
    )


@router.post("/{source}/sync")
def sync_connector_provider(
    source: DocumentSource,
    account_id: Annotated[int, Query()],
    user: User = Depends(current_curator_or_admin_user),
    db_session: Session = Depends(get_session),
    tenant_id: str | None = Depends(get_current_tenant_id),
) -> StatusResponse[int]:
    account = fetch_connector_account_by_id_for_user(
        db_session=db_session,
        user=user,
        account_id=account_id,
    )
    if not account:
        raise OnyxError(
            OnyxErrorCode.NOT_FOUND,
            f"Connector account {account_id} was not found.",
        )

    if account.credential_id is None:
        raise OnyxError(
            OnyxErrorCode.INVALID_INPUT,
            "This connector account does not have an attached credential.",
        )

    linked_cc_pairs = _linked_cc_pairs_for_account(db_session, account)
    sync_job = create_connector_sync_job(
        db_session=db_session,
        connector_account_id=account.id,
        trigger_type="manual_sync",
        metadata={
            "connector_ids": [cc_pair.connector_id for cc_pair in linked_cc_pairs],
            "credential_id": account.credential_id,
        },
    )
    sync_job.started_at = datetime.now(timezone.utc)

    if not linked_cc_pairs:
        sync_job.status = SyncStatus.SUCCESS
        sync_job.finished_at = datetime.now(timezone.utc)
        sync_job.message = "No linked connectors were found for this account."
        account.last_sync_at = sync_job.finished_at
        account.last_sync_status = sync_job.status
        db_session.commit()
        return StatusResponse(
            success=True,
            message=sync_job.message,
            data=sync_job.id,
        )

    try:
        triggered = 0
        for cc_pair in linked_cc_pairs:
            triggered += trigger_indexing_for_cc_pair(
                [account.credential_id],
                cc_pair.connector_id,
                False,
                tenant_id,
                db_session,
            )

        sync_job.status = SyncStatus.SUCCESS
        sync_job.finished_at = datetime.now(timezone.utc)
        sync_job.message = (
            f"Queued sync for {len(linked_cc_pairs)} connector(s) "
            f"with {triggered} total indexing trigger(s)."
        )
        account.last_sync_at = sync_job.finished_at
        account.last_sync_status = sync_job.status
        db_session.commit()
        return StatusResponse(
            success=True,
            message=sync_job.message,
            data=sync_job.id,
        )
    except Exception as e:
        sync_job.status = SyncStatus.FAILED
        sync_job.finished_at = datetime.now(timezone.utc)
        sync_job.error_message = str(e)
        account.last_sync_at = sync_job.finished_at
        account.last_sync_status = sync_job.status
        account.last_error = str(e)
        db_session.commit()
        raise OnyxError(OnyxErrorCode.INTERNAL_ERROR, str(e)) from e


@router.patch("/{source}/settings")
def update_connector_provider_settings(
    source: DocumentSource,
    account_id: Annotated[int, Query()],
    settings_update: ConnectorAccountSettingsUpdateRequest,
    user: User = Depends(current_curator_or_admin_user),
    db_session: Session = Depends(get_session),
) -> ConnectorAccountSnapshot:
    account = fetch_connector_account_by_id_for_user(
        db_session=db_session,
        user=user,
        account_id=account_id,
    )
    if not account:
        raise OnyxError(
            OnyxErrorCode.NOT_FOUND,
            f"Connector account {account_id} was not found.",
        )

    account.settings = {
        **account.settings,
        **settings_update.settings,
    }
    db_session.commit()
    return _resolve_account_snapshot(db_session, account)
