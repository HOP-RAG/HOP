from onyx.configs.constants import DocumentSource
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
from onyx.connectors.google_utils.shared_constants import (
    GoogleOAuthAuthenticationMethod,
)
from onyx.db.enums import ConnectorCredentialType
from onyx.server.documents import connector_account_adapters as adapter_module
from onyx.server.documents.connector_account_adapters import (
    GoogleWorkspaceOAuthAdapter,
)


def test_google_workspace_oauth_adapter_only_enabled_with_server_oauth_config(
    monkeypatch,
) -> None:
    adapter = GoogleWorkspaceOAuthAdapter(DocumentSource.GOOGLE_DRIVE)

    monkeypatch.setattr(adapter_module, "OAUTH_GOOGLE_DRIVE_CLIENT_ID", "")
    monkeypatch.setattr(adapter_module, "OAUTH_GOOGLE_DRIVE_CLIENT_SECRET", "")
    assert adapter.oauth_enabled() is False

    monkeypatch.setattr(adapter_module, "OAUTH_GOOGLE_DRIVE_CLIENT_ID", "client-id")
    monkeypatch.setattr(
        adapter_module, "OAUTH_GOOGLE_DRIVE_CLIENT_SECRET", "client-secret"
    )
    assert adapter.oauth_enabled() is True


def test_google_workspace_oauth_adapter_infers_interactive_oauth_metadata() -> None:
    adapter = GoogleWorkspaceOAuthAdapter(DocumentSource.GOOGLE_DRIVE)

    credential_json = {
        DB_CREDENTIALS_DICT_TOKEN_KEY: (
            '{"refresh_token":"refresh","token":"access","expiry":"2030-01-01T00:00:00Z"}'
        ),
        DB_CREDENTIALS_PRIMARY_ADMIN_KEY: "admin@example.com",
        DB_CREDENTIALS_AUTHENTICATION_METHOD: (
            GoogleOAuthAuthenticationMethod.OAUTH_INTERACTIVE.value
        ),
    }

    account_info = adapter.infer_existing_credential_account(
        credential_json=credential_json,
        credential_name="Google Drive OAuth",
    )

    assert account_info.credential_type == ConnectorCredentialType.OAUTH
    assert account_info.display_name == "admin@example.com"
    assert account_info.external_account_email == "admin@example.com"
    assert account_info.provider_metadata == {
        "provider": "google",
        "source": "google_drive",
        "auth_method": "platform_oauth",
        "scopes": [
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/drive.metadata.readonly",
            "https://www.googleapis.com/auth/admin.directory.group.readonly",
            "https://www.googleapis.com/auth/admin.directory.user.readonly",
        ],
        "token_expiry": "2030-01-01T00:00:00Z",
    }


def test_google_workspace_oauth_adapter_infers_manual_json_variants() -> None:
    adapter = GoogleWorkspaceOAuthAdapter(DocumentSource.GOOGLE_DRIVE)

    manual_oauth_json = {
        DB_CREDENTIALS_DICT_TOKEN_KEY: (
            '{"refresh_token":"refresh","token":"access","expiry":"2030-01-01T00:00:00Z"}'
        ),
        DB_CREDENTIALS_PRIMARY_ADMIN_KEY: "admin@example.com",
        DB_CREDENTIALS_AUTHENTICATION_METHOD: (
            GoogleOAuthAuthenticationMethod.CUSTOMER_OAUTH.value
        ),
    }
    service_account_json = {
        DB_CREDENTIALS_DICT_SERVICE_ACCOUNT_KEY: '{"client_email":"svc@example.com"}',
        DB_CREDENTIALS_PRIMARY_ADMIN_KEY: "admin@example.com",
        DB_CREDENTIALS_AUTHENTICATION_METHOD: (
            GoogleOAuthAuthenticationMethod.SERVICE_ACCOUNT_JSON.value
        ),
    }

    manual_oauth_info = adapter.infer_existing_credential_account(
        credential_json=manual_oauth_json,
        credential_name="Uploaded Google OAuth",
    )
    service_account_info = adapter.infer_existing_credential_account(
        credential_json=service_account_json,
        credential_name="Uploaded Service Account",
    )

    assert manual_oauth_info.credential_type == ConnectorCredentialType.OAUTH
    assert manual_oauth_info.provider_metadata["auth_method"] == "customer_oauth"

    assert service_account_info.credential_type == ConnectorCredentialType.SERVICE_ACCOUNT
    assert service_account_info.provider_metadata["auth_method"] == (
        "service_account_json"
    )


def test_google_workspace_oauth_adapter_normalizes_uploaded_oauth_alias() -> None:
    adapter = GoogleWorkspaceOAuthAdapter(DocumentSource.GOOGLE_DRIVE)

    uploaded_oauth_json = {
        DB_CREDENTIALS_DICT_TOKEN_KEY: (
            '{"refresh_token":"refresh","token":"access","expiry":"2030-01-01T00:00:00Z","client_id":"client-id","client_secret":"client-secret"}'
        ),
        DB_CREDENTIALS_AUTHENTICATION_METHOD: (
            GoogleOAuthAuthenticationMethod.UPLOADED.value
        ),
    }

    account_info = adapter.infer_existing_credential_account(
        credential_json=uploaded_oauth_json,
        credential_name="Uploaded Google OAuth",
    )

    assert account_info.credential_type == ConnectorCredentialType.OAUTH
    assert account_info.provider_metadata["auth_method"] == "customer_oauth"


def test_google_workspace_oauth_adapter_extracts_customer_client_override() -> None:
    adapter = GoogleWorkspaceOAuthAdapter(DocumentSource.GOOGLE_DRIVE)

    credential_json = {
        DB_CREDENTIALS_DICT_TOKEN_KEY: (
            '{"refresh_token":"refresh","token":"access","expiry":"2030-01-01T00:00:00Z","client_id":"client-id","client_secret":"client-secret"}'
        ),
        DB_CREDENTIALS_AUTHENTICATION_METHOD: (
            GoogleOAuthAuthenticationMethod.CUSTOMER_OAUTH.value
        ),
    }

    assert adapter.oauth_client_override_from_credential(credential_json) == {
        "client_id": "client-id",
        "client_secret": "client-secret",
    }
