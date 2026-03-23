from contextlib import AbstractContextManager
from uuid import UUID

from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest

from onyx.auth.schemas import UserRole
from onyx.db.models import Company


class _SessionContextManager(AbstractContextManager[MagicMock]):
    def __init__(self, session: MagicMock) -> None:
        self._session = session

    def __enter__(self) -> MagicMock:
        return self._session

    def __exit__(self, exc_type, exc, tb) -> bool:  # type: ignore[no-untyped-def]
        return False


@pytest.mark.asyncio
@patch(
    "onyx.db.company.asyncio.to_thread",
    new_callable=AsyncMock,
)
@patch("onyx.db.company._write_invited_user")
@patch("ee.onyx.server.tenants.user_mapping.add_users_to_tenant")
@patch("ee.onyx.server.tenants.provisioning.rollback_tenant_provisioning", new_callable=AsyncMock)
@patch("ee.onyx.server.tenants.provisioning.setup_tenant", new_callable=AsyncMock)
@patch("ee.onyx.server.tenants.schema_management.run_alembic_migrations")
@patch("ee.onyx.server.tenants.schema_management.create_schema_if_not_exists")
@patch("ee.onyx.server.tenants.user_mapping.user_owns_a_tenant", return_value=False)
@patch("onyx.db.company.get_session_with_shared_schema")
@patch("onyx.db.company.uuid4")
async def test_create_company_provisions_tenant_and_invites_initial_admin(
    mock_uuid4: MagicMock,
    mock_get_session_with_shared_schema: MagicMock,
    _mock_user_owns_a_tenant: MagicMock,
    mock_create_schema_if_not_exists: MagicMock,
    mock_run_alembic_migrations: MagicMock,  # noqa: ARG002
    mock_setup_tenant: AsyncMock,
    mock_rollback_tenant_provisioning: AsyncMock,
    mock_add_users_to_tenant: MagicMock,
    mock_write_invited_user: MagicMock,
    mock_to_thread: AsyncMock,
) -> None:
    from onyx.db.company import create_company

    fixed_uuid = UUID("11111111-1111-1111-1111-111111111111")
    mock_uuid4.return_value = fixed_uuid
    mock_to_thread.side_effect = lambda func, *args, **kwargs: func(*args, **kwargs)
    mock_create_schema_if_not_exists.return_value = True

    shared_session = MagicMock()
    shared_session.scalar.return_value = None
    mock_get_session_with_shared_schema.return_value = _SessionContextManager(
        shared_session
    )

    company = await create_company(
        name="Acme",
        domain="Acme.com",
        admin_email="Bob@Acme.com",
        created_by="platform@example.com",
    )

    assert isinstance(company, Company)
    assert company.tenant_id == "tenant_11111111-1111-1111-1111-111111111111"
    assert company.name == "Acme"
    assert company.domain == "acme.com"
    assert company.created_by == "platform@example.com"
    mock_setup_tenant.assert_awaited_once_with(
        "tenant_11111111-1111-1111-1111-111111111111",
        run_migrations=False,
    )
    mock_add_users_to_tenant.assert_called_once_with(
        ["bob@acme.com"],
        "tenant_11111111-1111-1111-1111-111111111111",
    )
    mock_write_invited_user.assert_called_once_with(
        "tenant_11111111-1111-1111-1111-111111111111",
        "bob@acme.com",
    )
    mock_rollback_tenant_provisioning.assert_not_called()


@patch("onyx.db.company.get_company")
@patch("onyx.db.company.get_user_by_email")
@patch("onyx.db.company.get_session_with_tenant")
@patch("onyx.db.company._remove_invited_admin_user")
@patch("onyx.db.company._write_invited_admin_user")
@patch("onyx.db.company._write_invited_user")
@patch("ee.onyx.server.tenants.user_mapping.add_users_to_tenant")
@patch("onyx.db.company._get_company_or_raise")
def test_invite_company_admin_promotes_existing_user_when_present(
    mock_get_company_or_raise: MagicMock,
    mock_add_users_to_tenant: MagicMock,
    mock_write_invited_user: MagicMock,
    mock_write_invited_admin_user: MagicMock,
    mock_remove_invited_admin_user: MagicMock,
    mock_get_session_with_tenant: MagicMock,
    mock_get_user_by_email: MagicMock,
    mock_get_company: MagicMock,
) -> None:
    from onyx.db.company import invite_company_admin

    company = Company(
        id=UUID("22222222-2222-2222-2222-222222222222"),
        tenant_id="tenant_222",
        name="Acme",
        domain="acme.com",
        is_active=True,
        created_by="platform@example.com",
    )
    existing_user = MagicMock()
    existing_user.role = UserRole.BASIC
    tenant_session = MagicMock()

    mock_get_company_or_raise.return_value = company
    mock_get_session_with_tenant.return_value = _SessionContextManager(tenant_session)
    mock_get_user_by_email.return_value = existing_user
    mock_get_company.return_value = (company, [])

    result_company, result_users = invite_company_admin(
        company.id,
        "admin@acme.com",
    )

    assert result_company is company
    assert result_users == []
    assert existing_user.role is UserRole.ADMIN
    tenant_session.commit.assert_called_once()
    mock_add_users_to_tenant.assert_called_once_with(["admin@acme.com"], "tenant_222")
    mock_write_invited_user.assert_called_once_with("tenant_222", "admin@acme.com")
    mock_write_invited_admin_user.assert_not_called()
    mock_remove_invited_admin_user.assert_called_once_with(
        "tenant_222", "admin@acme.com"
    )


@patch("onyx.db.company.get_company")
@patch("onyx.db.company.get_user_by_email", return_value=None)
@patch("onyx.db.company.get_session_with_tenant")
@patch("onyx.db.company._remove_invited_admin_user")
@patch("onyx.db.company._write_invited_admin_user")
@patch("onyx.db.company._write_invited_user")
@patch("ee.onyx.server.tenants.user_mapping.add_users_to_tenant")
@patch("onyx.db.company._get_company_or_raise")
def test_invite_company_admin_marks_unregistered_user_for_admin_role(
    mock_get_company_or_raise: MagicMock,
    mock_add_users_to_tenant: MagicMock,
    mock_write_invited_user: MagicMock,
    mock_write_invited_admin_user: MagicMock,
    mock_remove_invited_admin_user: MagicMock,
    mock_get_session_with_tenant: MagicMock,
    _mock_get_user_by_email: MagicMock,
    mock_get_company: MagicMock,
) -> None:
    from onyx.db.company import invite_company_admin

    company = Company(
        id=UUID("44444444-4444-4444-4444-444444444444"),
        tenant_id="tenant_444",
        name="Beta",
        domain="beta.com",
        is_active=True,
        created_by="platform@example.com",
    )
    tenant_session = MagicMock()

    mock_get_company_or_raise.return_value = company
    mock_get_session_with_tenant.return_value = _SessionContextManager(tenant_session)
    mock_get_company.return_value = (company, [])

    invite_company_admin(
        company.id,
        "future-admin@beta.com",
    )

    mock_add_users_to_tenant.assert_called_once_with(
        ["future-admin@beta.com"], "tenant_444"
    )
    mock_write_invited_user.assert_called_once_with(
        "tenant_444", "future-admin@beta.com"
    )
    mock_write_invited_admin_user.assert_called_once_with(
        "tenant_444", "future-admin@beta.com"
    )
    mock_remove_invited_admin_user.assert_not_called()
