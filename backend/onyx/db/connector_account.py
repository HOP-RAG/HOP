from uuid import UUID

from sqlalchemy import or_
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload

from onyx.configs.constants import DocumentSource
from onyx.db.credentials import fetch_credentials_by_source_for_user
from onyx.db.enums import SyncStatus
from onyx.db.models import ConnectorAccount
from onyx.db.models import ConnectorSyncJob
from onyx.db.models import User


def _accessible_credential_ids_for_source(
    db_session: Session,
    user: User,
    source: DocumentSource,
) -> list[int]:
    credentials = fetch_credentials_by_source_for_user(
        db_session=db_session,
        user=user,
        document_source=source,
        get_editable=False,
    )
    return [credential.id for credential in credentials]


def fetch_connector_accounts_for_user(
    db_session: Session,
    user: User,
    source: DocumentSource,
) -> list[ConnectorAccount]:
    accessible_credential_ids = _accessible_credential_ids_for_source(
        db_session=db_session,
        user=user,
        source=source,
    )

    stmt = (
        select(ConnectorAccount)
        .where(ConnectorAccount.source == source)
        .options(selectinload(ConnectorAccount.credential))
        .order_by(ConnectorAccount.updated_at.desc(), ConnectorAccount.id.desc())
    )

    if accessible_credential_ids:
        stmt = stmt.where(
            or_(
                ConnectorAccount.user_id == user.id,
                ConnectorAccount.credential_id.in_(accessible_credential_ids),
            )
        )
    else:
        stmt = stmt.where(ConnectorAccount.user_id == user.id)

    return list(db_session.scalars(stmt).unique().all())


def fetch_connector_account_by_id_for_user(
    db_session: Session,
    user: User,
    account_id: int,
) -> ConnectorAccount | None:
    stmt = (
        select(ConnectorAccount)
        .where(ConnectorAccount.id == account_id)
        .options(selectinload(ConnectorAccount.credential))
    )

    account = db_session.scalars(stmt).first()
    if not account:
        return None

    accessible_credential_ids = _accessible_credential_ids_for_source(
        db_session=db_session,
        user=user,
        source=account.source,
    )
    if account.user_id == user.id:
        return account
    if account.credential_id and account.credential_id in accessible_credential_ids:
        return account

    return None


def fetch_connector_account_by_credential_id(
    db_session: Session,
    credential_id: int,
) -> ConnectorAccount | None:
    stmt = (
        select(ConnectorAccount)
        .where(ConnectorAccount.credential_id == credential_id)
        .options(selectinload(ConnectorAccount.credential))
    )
    return db_session.scalars(stmt).first()


def fetch_connector_account_by_identity(
    db_session: Session,
    source: DocumentSource,
    user_id: UUID | None,
    external_account_id: str | None,
    external_account_email: str | None,
) -> ConnectorAccount | None:
    stmt = select(ConnectorAccount).where(ConnectorAccount.source == source)
    if user_id is not None:
        stmt = stmt.where(ConnectorAccount.user_id == user_id)

    if external_account_id:
        stmt = stmt.where(ConnectorAccount.external_account_id == external_account_id)
    elif external_account_email:
        stmt = stmt.where(
            ConnectorAccount.external_account_email == external_account_email
        )
    else:
        return None

    return db_session.scalars(stmt).first()


def create_connector_sync_job(
    db_session: Session,
    connector_account_id: int,
    trigger_type: str,
    metadata: dict[str, object] | None = None,
    message: str | None = None,
    status: SyncStatus = SyncStatus.IN_PROGRESS,
) -> ConnectorSyncJob:
    sync_job = ConnectorSyncJob(
        connector_account_id=connector_account_id,
        trigger_type=trigger_type,
        metadata=metadata or {},
        message=message,
        status=status,
    )
    db_session.add(sync_job)
    db_session.flush()
    return sync_job
