import json
from abc import ABC
from abc import abstractmethod
from typing import Any
from typing import cast
from urllib.parse import urlencode

import requests
from google.oauth2.credentials import Credentials as GoogleOAuthCredentials
from pydantic import BaseModel
from pydantic import Field

from onyx.configs.app_configs import OAUTH_GOOGLE_DRIVE_CLIENT_ID
from onyx.configs.app_configs import OAUTH_GOOGLE_DRIVE_CLIENT_SECRET
from onyx.configs.app_configs import OAUTH_SLACK_CLIENT_ID
from onyx.configs.app_configs import OAUTH_SLACK_CLIENT_SECRET
from onyx.configs.constants import DocumentSource
from onyx.connectors.cross_connector_utils.miscellaneous_utils import (
    get_oauth_callback_uri,
)
from onyx.connectors.google_utils.google_auth import get_google_creds
from onyx.connectors.google_utils.google_auth import get_google_oauth_creds
from onyx.connectors.google_utils.google_auth import sanitize_oauth_credentials
from onyx.connectors.google_utils.resources import get_drive_service
from onyx.connectors.google_utils.resources import get_gmail_service
from onyx.connectors.google_utils.shared_constants import (
    CUSTOMER_MANAGED_GOOGLE_AUTH_METHODS,
)
from onyx.connectors.google_utils.shared_constants import (
    DB_CREDENTIALS_AUTHENTICATION_METHOD,
)
from onyx.connectors.google_utils.shared_constants import (
    DB_CREDENTIALS_DICT_SERVICE_ACCOUNT_KEY,
)
from onyx.connectors.google_utils.shared_constants import (
    DB_CREDENTIALS_DICT_TOKEN_KEY,
)
from onyx.connectors.google_utils.shared_constants import (
    DB_CREDENTIALS_PRIMARY_ADMIN_KEY,
)
from onyx.connectors.google_utils.shared_constants import GOOGLE_SCOPES
from onyx.connectors.google_utils.shared_constants import (
    GoogleOAuthAuthenticationMethod,
)
from onyx.connectors.google_utils.shared_constants import (
    PLATFORM_MANAGED_GOOGLE_AUTH_METHODS,
)
from onyx.connectors.interfaces import OAuthConnector
from onyx.db.enums import ConnectorCredentialType
from onyx.utils.subclasses import find_all_subclasses_in_package

_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
_SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access"
_SLACK_AUTH_TEST_URL = "https://slack.com/api/auth.test"
_SLACK_REVOKE_URL = "https://slack.com/api/auth.revoke"
_SLACK_BOT_SCOPE = (
    "channels:history,"
    "channels:read,"
    "groups:history,"
    "groups:read,"
    "channels:join,"
    "im:history,"
    "users:read,"
    "users:read.email,"
    "usergroups:read"
)


class EmptyOauthKwargs(BaseModel):
    pass


class OAuthCredentialExchangeResult(BaseModel):
    credential_json: dict[str, Any]
    credential_name: str
    credential_type: ConnectorCredentialType
    display_name: str | None = None
    external_account_id: str | None = None
    external_account_email: str | None = None
    provider_metadata: dict[str, Any] = Field(default_factory=dict)


class CredentialHealthCheckResult(BaseModel):
    valid: bool
    error_message: str | None = None
    updated_credential_json: dict[str, Any] | None = None


class ExistingCredentialAccountInfo(BaseModel):
    credential_type: ConnectorCredentialType
    display_name: str | None = None
    external_account_id: str | None = None
    external_account_email: str | None = None
    provider_metadata: dict[str, Any] = Field(default_factory=dict)


class ConnectorAccountAdapter(ABC):
    @abstractmethod
    def source(self) -> DocumentSource:
        raise NotImplementedError

    def oauth_enabled(self) -> bool:
        return True

    def additional_kwargs_model(self) -> type[BaseModel]:
        return EmptyOauthKwargs

    def supports_custom_oauth_client(self) -> bool:
        return False

    def supported_auth_modes(self) -> list[str]:
        modes: list[str] = []
        if self.oauth_enabled():
            modes.append(GoogleOAuthAuthenticationMethod.PLATFORM_OAUTH.value)
        if self.supports_custom_oauth_client():
            modes.append(GoogleOAuthAuthenticationMethod.CUSTOMER_OAUTH.value)
        return modes

    @abstractmethod
    def oauth_authorization_url(
        self,
        base_domain: str,
        state: str,
        additional_kwargs: dict[str, str],
        oauth_client_override: dict[str, str] | None = None,
    ) -> str:
        raise NotImplementedError

    @abstractmethod
    def oauth_code_to_credential(
        self,
        base_domain: str,
        code: str,
        additional_kwargs: dict[str, str],
        oauth_client_override: dict[str, str] | None = None,
    ) -> OAuthCredentialExchangeResult:
        raise NotImplementedError

    def health_check(
        self,
        credential_json: dict[str, Any],
    ) -> CredentialHealthCheckResult:
        return CredentialHealthCheckResult(valid=True)

    def revoke(self, credential_json: dict[str, Any]) -> None:
        return None

    def supports_disconnect(self, credential_type: ConnectorCredentialType) -> bool:
        return credential_type == ConnectorCredentialType.OAUTH

    def supports_reconnect(self, credential_type: ConnectorCredentialType) -> bool:
        return self.oauth_enabled() and credential_type == ConnectorCredentialType.OAUTH

    def supports_reconnect_credential(
        self,
        credential_type: ConnectorCredentialType,
        credential_json: dict[str, Any] | None,
    ) -> bool:
        return self.supports_reconnect(credential_type)

    def infer_existing_credential_account(
        self,
        credential_json: dict[str, Any],
        credential_name: str | None,
    ) -> ExistingCredentialAccountInfo:
        return ExistingCredentialAccountInfo(
            credential_type=ConnectorCredentialType.CUSTOM,
            display_name=credential_name,
        )

    def oauth_client_override_from_credential(
        self,
        credential_json: dict[str, Any],
    ) -> dict[str, str] | None:
        return None


class StandardOAuthConnectorAdapter(ConnectorAccountAdapter):
    def __init__(self, connector_cls: type[OAuthConnector]) -> None:
        self._connector_cls = connector_cls

    def source(self) -> DocumentSource:
        return self._connector_cls.oauth_id()

    def additional_kwargs_model(self) -> type[BaseModel]:
        return self._connector_cls.AdditionalOauthKwargs

    def oauth_authorization_url(
        self,
        base_domain: str,
        state: str,
        additional_kwargs: dict[str, str],
        oauth_client_override: dict[str, str] | None = None,  # noqa: ARG002
    ) -> str:
        return self._connector_cls.oauth_authorization_url(
            base_domain, state, additional_kwargs
        )

    def oauth_code_to_credential(
        self,
        base_domain: str,
        code: str,
        additional_kwargs: dict[str, str],
        oauth_client_override: dict[str, str] | None = None,  # noqa: ARG002
    ) -> OAuthCredentialExchangeResult:
        token_info = self._connector_cls.oauth_code_to_token(
            base_domain, code, additional_kwargs
        )
        source_name = self.source().value.replace("_", " ").title()
        display_name = cast(str | None, token_info.get("workspace_name"))
        external_account_id = cast(str | None, token_info.get("workspace_id"))
        return OAuthCredentialExchangeResult(
            credential_json=token_info,
            credential_name=f"{source_name} OAuth",
            credential_type=ConnectorCredentialType.OAUTH,
            display_name=display_name,
            external_account_id=external_account_id,
            provider_metadata={},
        )


class GoogleWorkspaceOAuthAdapter(ConnectorAccountAdapter):
    def __init__(self, source: DocumentSource) -> None:
        self._source = source

    def source(self) -> DocumentSource:
        return self._source

    def oauth_enabled(self) -> bool:
        return bool(
            OAUTH_GOOGLE_DRIVE_CLIENT_ID and OAUTH_GOOGLE_DRIVE_CLIENT_SECRET
        )

    def supports_custom_oauth_client(self) -> bool:
        return True

    def supported_auth_modes(self) -> list[str]:
        modes: list[str] = []
        if self.oauth_enabled():
            modes.append(GoogleOAuthAuthenticationMethod.PLATFORM_OAUTH.value)
        modes.append(GoogleOAuthAuthenticationMethod.CUSTOMER_OAUTH.value)
        modes.append(GoogleOAuthAuthenticationMethod.SERVICE_ACCOUNT_JSON.value)
        return modes

    def _callback_uri(self, base_domain: str) -> str:
        return get_oauth_callback_uri(base_domain, self.source().value)

    def _resolve_oauth_client(
        self,
        oauth_client_override: dict[str, str] | None,
    ) -> tuple[str, str, str]:
        if oauth_client_override:
            client_id = oauth_client_override.get("client_id")
            client_secret = oauth_client_override.get("client_secret")
            if not client_id or not client_secret:
                raise ValueError("Customer-managed OAuth requires client ID and secret.")
            return (
                client_id,
                client_secret,
                GoogleOAuthAuthenticationMethod.CUSTOMER_OAUTH.value,
            )

        if not OAUTH_GOOGLE_DRIVE_CLIENT_ID or not OAUTH_GOOGLE_DRIVE_CLIENT_SECRET:
            raise ValueError(
                "Google Workspace OAuth credentials are not configured on the server."
            )

        return (
            OAUTH_GOOGLE_DRIVE_CLIENT_ID,
            OAUTH_GOOGLE_DRIVE_CLIENT_SECRET,
            GoogleOAuthAuthenticationMethod.PLATFORM_OAUTH.value,
        )

    def _extract_token_metadata(
        self,
        credential_json: dict[str, Any],
    ) -> dict[str, Any]:
        token_json_str = cast(
            str | None, credential_json.get(DB_CREDENTIALS_DICT_TOKEN_KEY)
        )
        if not token_json_str:
            return {}

        try:
            token_payload = json.loads(token_json_str)
        except (TypeError, ValueError):
            return {}

        token_metadata: dict[str, Any] = {
            "scopes": token_payload.get("scopes") or GOOGLE_SCOPES[self.source()],
        }
        if token_payload.get("expiry"):
            token_metadata["token_expiry"] = token_payload["expiry"]

        return token_metadata

    def _resolve_auth_method(self, credential_json: dict[str, Any]) -> str:
        if DB_CREDENTIALS_DICT_SERVICE_ACCOUNT_KEY in credential_json:
            return GoogleOAuthAuthenticationMethod.SERVICE_ACCOUNT_JSON.value

        authentication_method = cast(
            str | None,
            credential_json.get(DB_CREDENTIALS_AUTHENTICATION_METHOD),
        )
        if authentication_method in PLATFORM_MANAGED_GOOGLE_AUTH_METHODS:
            return GoogleOAuthAuthenticationMethod.PLATFORM_OAUTH.value
        if authentication_method in CUSTOMER_MANAGED_GOOGLE_AUTH_METHODS:
            return GoogleOAuthAuthenticationMethod.CUSTOMER_OAUTH.value

        token_json_str = cast(
            str | None, credential_json.get(DB_CREDENTIALS_DICT_TOKEN_KEY)
        )
        if token_json_str:
            try:
                token_payload = json.loads(token_json_str)
            except (TypeError, ValueError):
                token_payload = {}

            if token_payload.get("client_id") and token_payload.get("client_secret"):
                return GoogleOAuthAuthenticationMethod.CUSTOMER_OAUTH.value
            return GoogleOAuthAuthenticationMethod.PLATFORM_OAUTH.value

        return "custom"

    def _build_provider_metadata(
        self,
        credential_json: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "provider": "google",
            "source": self.source().value,
            "auth_method": self._resolve_auth_method(credential_json),
            **self._extract_token_metadata(credential_json),
        }

    def _get_account_email(self, creds: GoogleOAuthCredentials) -> str:
        if self.source() == DocumentSource.GOOGLE_DRIVE:
            drive_service = get_drive_service(creds)
            user_info = (
                drive_service.about().get(fields="user(emailAddress)").execute()
            )
            return cast(str, user_info.get("user", {}).get("emailAddress", ""))

        gmail_service = get_gmail_service(creds)
        user_info = gmail_service.users().getProfile(userId="me").execute()
        return cast(str, user_info.get("emailAddress", ""))

    def oauth_authorization_url(
        self,
        base_domain: str,
        state: str,
        additional_kwargs: dict[str, str],  # noqa: ARG002
        oauth_client_override: dict[str, str] | None = None,
    ) -> str:
        client_id, _, _ = self._resolve_oauth_client(oauth_client_override)

        query = urlencode(
            {
                "client_id": client_id,
                "redirect_uri": self._callback_uri(base_domain),
                "response_type": "code",
                "scope": " ".join(GOOGLE_SCOPES[self.source()]),
                "access_type": "offline",
                "state": state,
                "prompt": "consent",
            }
        )
        return f"https://accounts.google.com/o/oauth2/v2/auth?{query}"

    def oauth_code_to_credential(
        self,
        base_domain: str,
        code: str,
        additional_kwargs: dict[str, str],  # noqa: ARG002
        oauth_client_override: dict[str, str] | None = None,
    ) -> OAuthCredentialExchangeResult:
        client_id, client_secret, auth_method = self._resolve_oauth_client(
            oauth_client_override
        )
        response = requests.post(
            _GOOGLE_TOKEN_URL,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": self._callback_uri(base_domain),
                "grant_type": "authorization_code",
            },
            timeout=30,
        )
        response.raise_for_status()

        token_payload = response.json()
        refresh_token = token_payload.get("refresh_token")
        if not refresh_token:
            raise RuntimeError(
                "Google OAuth did not return a refresh token. Please try again."
            )

        authorized_user_info = {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
        }
        oauth_creds = get_google_oauth_creds(
            token_json_str=json.dumps(authorized_user_info),
            source=self.source(),
        )
        if not oauth_creds:
            raise RuntimeError("Unable to validate Google OAuth credential.")

        account_email = self._get_account_email(oauth_creds)
        source_name = self.source().value.replace("_", " ").title()
        stored_token_json = (
            sanitize_oauth_credentials(oauth_creds)
            if auth_method == GoogleOAuthAuthenticationMethod.PLATFORM_OAUTH.value
            else oauth_creds.to_json()
        )

        return OAuthCredentialExchangeResult(
            credential_json={
                DB_CREDENTIALS_DICT_TOKEN_KEY: stored_token_json,
                DB_CREDENTIALS_PRIMARY_ADMIN_KEY: account_email,
                DB_CREDENTIALS_AUTHENTICATION_METHOD: auth_method,
            },
            credential_name=f"{source_name} OAuth",
            credential_type=ConnectorCredentialType.OAUTH,
            display_name=account_email,
            external_account_id=account_email,
            external_account_email=account_email,
            provider_metadata=self._build_provider_metadata(
                {
                    DB_CREDENTIALS_DICT_TOKEN_KEY: stored_token_json,
                    DB_CREDENTIALS_PRIMARY_ADMIN_KEY: account_email,
                    DB_CREDENTIALS_AUTHENTICATION_METHOD: auth_method,
                }
            ),
        )

    def health_check(
        self,
        credential_json: dict[str, Any],
    ) -> CredentialHealthCheckResult:
        try:
            _, refreshed_credential_json = get_google_creds(
                credentials=cast(dict[str, str], credential_json),
                source=self.source(),
            )
            return CredentialHealthCheckResult(
                valid=True,
                updated_credential_json=refreshed_credential_json,
            )
        except Exception as e:
            return CredentialHealthCheckResult(
                valid=False,
                error_message=str(e),
            )

    def revoke(self, credential_json: dict[str, Any]) -> None:
        token_json_str = cast(
            str | None, credential_json.get(DB_CREDENTIALS_DICT_TOKEN_KEY)
        )
        if not token_json_str:
            return

        token_payload = json.loads(token_json_str)
        token_to_revoke = token_payload.get("refresh_token") or token_payload.get(
            "token"
        )
        if not token_to_revoke:
            return

        response = requests.post(
            _GOOGLE_REVOKE_URL,
            data={"token": token_to_revoke},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30,
        )
        if not response.ok:
            raise RuntimeError(f"Failed to revoke Google credential: {response.text}")

    def infer_existing_credential_account(
        self,
        credential_json: dict[str, Any],
        credential_name: str | None,
    ) -> ExistingCredentialAccountInfo:
        display_name = cast(
            str | None, credential_json.get(DB_CREDENTIALS_PRIMARY_ADMIN_KEY)
        ) or credential_name
        credential_type = ConnectorCredentialType.CUSTOM
        if "google_service_account_key" in credential_json:
            credential_type = ConnectorCredentialType.SERVICE_ACCOUNT
        elif DB_CREDENTIALS_DICT_TOKEN_KEY in credential_json:
            credential_type = ConnectorCredentialType.OAUTH

        return ExistingCredentialAccountInfo(
            credential_type=credential_type,
            display_name=display_name,
            external_account_id=display_name,
            external_account_email=display_name,
            provider_metadata=self._build_provider_metadata(credential_json),
        )

    def oauth_client_override_from_credential(
        self,
        credential_json: dict[str, Any],
    ) -> dict[str, str] | None:
        if (
            self._resolve_auth_method(credential_json)
            != GoogleOAuthAuthenticationMethod.CUSTOMER_OAUTH.value
        ):
            return None

        token_json_str = cast(
            str | None, credential_json.get(DB_CREDENTIALS_DICT_TOKEN_KEY)
        )
        if not token_json_str:
            return None

        try:
            token_payload = json.loads(token_json_str)
        except (TypeError, ValueError):
            return None

        client_id = cast(str | None, token_payload.get("client_id"))
        client_secret = cast(str | None, token_payload.get("client_secret"))
        if not client_id or not client_secret:
            return None

        return {
            "client_id": client_id,
            "client_secret": client_secret,
        }

    def supports_reconnect_credential(
        self,
        credential_type: ConnectorCredentialType,
        credential_json: dict[str, Any] | None,
    ) -> bool:
        if credential_type != ConnectorCredentialType.OAUTH:
            return False
        if credential_json is None:
            return self.oauth_enabled()

        if (
            self._resolve_auth_method(credential_json)
            == GoogleOAuthAuthenticationMethod.CUSTOMER_OAUTH.value
        ):
            return self.oauth_client_override_from_credential(credential_json) is not None

        return self.oauth_enabled()


class SlackOAuthAdapter(ConnectorAccountAdapter):
    def source(self) -> DocumentSource:
        return DocumentSource.SLACK

    def oauth_enabled(self) -> bool:
        return bool(OAUTH_SLACK_CLIENT_ID and OAUTH_SLACK_CLIENT_SECRET)

    def oauth_authorization_url(
        self,
        base_domain: str,
        state: str,
        additional_kwargs: dict[str, str],  # noqa: ARG002
        oauth_client_override: dict[str, str] | None = None,  # noqa: ARG002
    ) -> str:
        if not OAUTH_SLACK_CLIENT_ID or not OAUTH_SLACK_CLIENT_SECRET:
            raise ValueError("Slack OAuth credentials are not configured on the server.")

        query = urlencode(
            {
                "client_id": OAUTH_SLACK_CLIENT_ID,
                "redirect_uri": get_oauth_callback_uri(base_domain, self.source().value),
                "scope": _SLACK_BOT_SCOPE,
                "state": state,
            }
        )
        return f"https://slack.com/oauth/v2/authorize?{query}"

    def oauth_code_to_credential(
        self,
        base_domain: str,
        code: str,
        additional_kwargs: dict[str, str],  # noqa: ARG002
        oauth_client_override: dict[str, str] | None = None,  # noqa: ARG002
    ) -> OAuthCredentialExchangeResult:
        response = requests.post(
            _SLACK_TOKEN_URL,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "client_id": OAUTH_SLACK_CLIENT_ID,
                "client_secret": OAUTH_SLACK_CLIENT_SECRET,
                "code": code,
                "redirect_uri": get_oauth_callback_uri(
                    base_domain, self.source().value
                ),
            },
            timeout=30,
        )
        response.raise_for_status()
        token_payload = response.json()

        if not token_payload.get("ok"):
            raise RuntimeError(
                f"Slack OAuth failed: {token_payload.get('error', 'unknown error')}"
            )

        team_info = token_payload.get("team", {}) or {}
        team_name = cast(str | None, team_info.get("name"))
        team_id = cast(str | None, team_info.get("id"))

        return OAuthCredentialExchangeResult(
            credential_json={
                "slack_bot_token": token_payload["access_token"],
            },
            credential_name="Slack OAuth",
            credential_type=ConnectorCredentialType.OAUTH,
            display_name=team_name or "Slack Workspace",
            external_account_id=team_id,
            external_account_email=None,
            provider_metadata={
                "team_id": team_id,
                "team_name": team_name,
                "authed_user_id": token_payload.get("authed_user", {}).get("id"),
            },
        )

    def health_check(
        self,
        credential_json: dict[str, Any],
    ) -> CredentialHealthCheckResult:
        token = cast(str | None, credential_json.get("slack_bot_token"))
        if not token:
            return CredentialHealthCheckResult(
                valid=False, error_message="Missing Slack bot token."
            )

        response = requests.post(
            _SLACK_AUTH_TEST_URL,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        if not response.ok:
            return CredentialHealthCheckResult(
                valid=False,
                error_message=f"Slack auth test failed with status {response.status_code}.",
            )

        payload = response.json()
        if not payload.get("ok"):
            return CredentialHealthCheckResult(
                valid=False,
                error_message=cast(str, payload.get("error", "Slack auth failed.")),
            )

        return CredentialHealthCheckResult(valid=True)

    def revoke(self, credential_json: dict[str, Any]) -> None:
        token = cast(str | None, credential_json.get("slack_bot_token"))
        if not token:
            return

        response = requests.post(
            _SLACK_REVOKE_URL,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={"token": token},
            timeout=30,
        )
        response.raise_for_status()
        payload = response.json()
        if not payload.get("ok"):
            raise RuntimeError(
                f"Failed to revoke Slack credential: {payload.get('error', 'unknown error')}"
            )

    def infer_existing_credential_account(
        self,
        credential_json: dict[str, Any],
        credential_name: str | None,
    ) -> ExistingCredentialAccountInfo:
        return ExistingCredentialAccountInfo(
            credential_type=ConnectorCredentialType.CUSTOM,
            display_name=credential_name or "Slack credential",
            provider_metadata={},
        )


_ADAPTERS: dict[DocumentSource, ConnectorAccountAdapter] = {}


def get_connector_account_adapters() -> dict[DocumentSource, ConnectorAccountAdapter]:
    global _ADAPTERS
    if _ADAPTERS:
        return _ADAPTERS

    adapters: dict[DocumentSource, ConnectorAccountAdapter] = {
        DocumentSource.GOOGLE_DRIVE: GoogleWorkspaceOAuthAdapter(
            DocumentSource.GOOGLE_DRIVE
        ),
        DocumentSource.GMAIL: GoogleWorkspaceOAuthAdapter(DocumentSource.GMAIL),
        DocumentSource.SLACK: SlackOAuthAdapter(),
    }

    oauth_connectors = find_all_subclasses_in_package(
        cast(type[OAuthConnector], OAuthConnector),
        "onyx.connectors",
    )
    for connector_cls in oauth_connectors:
        source = connector_cls.oauth_id()
        if source in adapters:
            continue
        adapters[source] = StandardOAuthConnectorAdapter(connector_cls)

    _ADAPTERS = adapters
    return _ADAPTERS


def get_connector_account_adapter(
    source: DocumentSource,
) -> ConnectorAccountAdapter | None:
    return get_connector_account_adapters().get(source)
