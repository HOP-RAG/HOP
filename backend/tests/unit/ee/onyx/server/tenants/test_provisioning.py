from types import SimpleNamespace
from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest

from onyx.auth.users import exceptions
from onyx.error_handling.error_codes import OnyxErrorCode
from onyx.error_handling.exceptions import OnyxError


class _SessionContextManager:
    def __init__(self, session: MagicMock) -> None:
        self._session = session

    def __enter__(self) -> MagicMock:
        return self._session

    def __exit__(self, exc_type, exc, tb) -> bool:  # type: ignore[no-untyped-def]
        return False


class _FakeEventLoop:
    def __init__(self) -> None:
        self.run_in_executor = AsyncMock(return_value=None)


@pytest.mark.asyncio
@patch("ee.onyx.server.tenants.provisioning.MULTI_TENANT", True)
@patch("ee.onyx.server.tenants.provisioning.notify_control_plane", new_callable=AsyncMock)
@patch("ee.onyx.server.tenants.provisioning.create_tenant", new_callable=AsyncMock)
@patch("ee.onyx.server.tenants.provisioning.get_available_tenant", new_callable=AsyncMock)
@patch("ee.onyx.server.tenants.provisioning.submit_to_hubspot", new_callable=AsyncMock)
@patch("onyx.db.company.get_company_by_tenant_id")
@patch("ee.onyx.server.tenants.provisioning.get_tenant_id_for_email")
async def test_get_or_provision_tenant_returns_existing_mapping(
    mock_get_tenant_id: MagicMock,
    mock_get_company_by_tenant_id: MagicMock,
    mock_submit_to_hubspot: AsyncMock,
    mock_get_available_tenant: AsyncMock,
    mock_create_tenant: AsyncMock,
    mock_notify_control_plane: AsyncMock,
) -> None:
    from ee.onyx.server.tenants.provisioning import get_or_provision_tenant

    request = MagicMock()
    mock_get_tenant_id.return_value = "tenant_123"
    mock_get_company_by_tenant_id.return_value = None

    tenant_id = await get_or_provision_tenant(
        "member@example.com",
        referral_source="invite",
        request=request,
    )

    assert tenant_id == "tenant_123"
    mock_submit_to_hubspot.assert_awaited_once_with(
        "member@example.com", "invite", request
    )
    mock_get_available_tenant.assert_not_called()
    mock_create_tenant.assert_not_called()
    mock_notify_control_plane.assert_not_called()


@pytest.mark.asyncio
@patch("ee.onyx.server.tenants.provisioning.MULTI_TENANT", True)
@patch("ee.onyx.server.tenants.provisioning.notify_control_plane", new_callable=AsyncMock)
@patch("ee.onyx.server.tenants.provisioning.create_tenant", new_callable=AsyncMock)
@patch("ee.onyx.server.tenants.provisioning.get_available_tenant", new_callable=AsyncMock)
@patch("ee.onyx.server.tenants.provisioning.submit_to_hubspot", new_callable=AsyncMock)
@patch("onyx.db.company.get_company_by_tenant_id")
@patch("ee.onyx.server.tenants.provisioning.get_tenant_id_for_email")
async def test_get_or_provision_tenant_rejects_unknown_email_without_mapping(
    mock_get_tenant_id: MagicMock,
    mock_get_company_by_tenant_id: MagicMock,
    mock_submit_to_hubspot: AsyncMock,
    mock_get_available_tenant: AsyncMock,
    mock_create_tenant: AsyncMock,
    mock_notify_control_plane: AsyncMock,
) -> None:
    from ee.onyx.server.tenants.provisioning import get_or_provision_tenant

    mock_get_tenant_id.side_effect = exceptions.UserNotExists()
    mock_get_company_by_tenant_id.return_value = None

    with pytest.raises(OnyxError) as exc_info:
        await get_or_provision_tenant("member@example.com")

    assert exc_info.value.error_code is OnyxErrorCode.INSUFFICIENT_PERMISSIONS
    mock_submit_to_hubspot.assert_not_called()
    mock_get_available_tenant.assert_not_called()
    mock_create_tenant.assert_not_called()
    mock_notify_control_plane.assert_not_called()


@pytest.mark.asyncio
@patch("ee.onyx.server.tenants.provisioning.MULTI_TENANT", True)
@patch("ee.onyx.server.tenants.provisioning.submit_to_hubspot", new_callable=AsyncMock)
@patch("onyx.db.company.get_company_by_tenant_id")
@patch("ee.onyx.server.tenants.provisioning.get_tenant_id_for_email")
async def test_get_or_provision_tenant_rejects_inactive_company(
    mock_get_tenant_id: MagicMock,
    mock_get_company_by_tenant_id: MagicMock,
    mock_submit_to_hubspot: AsyncMock,
) -> None:
    from ee.onyx.server.tenants.provisioning import get_or_provision_tenant

    mock_get_tenant_id.return_value = "tenant_123"
    mock_get_company_by_tenant_id.return_value = SimpleNamespace(is_active=False)

    with pytest.raises(OnyxError) as exc_info:
        await get_or_provision_tenant("member@example.com")

    assert exc_info.value.error_code is OnyxErrorCode.INSUFFICIENT_PERMISSIONS
    mock_submit_to_hubspot.assert_not_called()


@pytest.mark.asyncio
@patch("ee.onyx.server.tenants.provisioning.store_settings")
@patch("ee.onyx.server.tenants.provisioning.load_settings")
@patch("ee.onyx.server.tenants.provisioning.setup_onyx")
@patch("ee.onyx.server.tenants.provisioning.configure_default_api_keys")
@patch("ee.onyx.server.tenants.provisioning.get_session_with_tenant")
@patch("ee.onyx.server.tenants.provisioning.asyncio.get_event_loop")
@patch("ee.onyx.server.tenants.provisioning.CURRENT_TENANT_ID_CONTEXTVAR")
async def test_setup_tenant_enables_invite_only_for_new_tenants(
    mock_context_var: MagicMock,
    mock_get_event_loop: MagicMock,
    mock_get_session_with_tenant: MagicMock,
    mock_configure_default_api_keys: MagicMock,
    mock_setup_onyx: MagicMock,
    mock_load_settings: MagicMock,
    mock_store_settings: MagicMock,
) -> None:
    from ee.onyx.server.tenants.provisioning import setup_tenant

    fake_loop = _FakeEventLoop()
    mock_get_event_loop.return_value = fake_loop
    mock_context_var.set.return_value = "tenant-token"

    db_session = MagicMock()
    db_session.query.return_value.filter_by.return_value.first.return_value = None
    mock_get_session_with_tenant.return_value = _SessionContextManager(db_session)

    settings = SimpleNamespace(invite_only_enabled=False)
    mock_load_settings.return_value = settings

    await setup_tenant("tenant_123")

    mock_configure_default_api_keys.assert_called_once_with(db_session)
    mock_setup_onyx.assert_called_once_with(
        db_session, "tenant_123", cohere_enabled=False
    )
    assert settings.invite_only_enabled is True
    mock_store_settings.assert_called_once_with(settings)
    mock_context_var.reset.assert_called_once_with("tenant-token")
