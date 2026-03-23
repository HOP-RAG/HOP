from datetime import datetime
from datetime import timezone
from uuid import UUID

from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest

from ee.onyx.server.tenants.models import CompanyCreateRequest
from ee.onyx.server.tenants.models import CompanyUpdateRequest
from onyx.db.models import Company


def _make_company() -> Company:
    return Company(
        id=UUID("33333333-3333-3333-3333-333333333333"),
        tenant_id="tenant_333",
        name="Acme",
        domain="acme.com",
        is_active=True,
        created_by="platform@example.com",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


@pytest.mark.asyncio
@patch("ee.onyx.server.tenants.company_api.get_company_in_db")
@patch("ee.onyx.server.tenants.company_api.create_company_in_db", new_callable=AsyncMock)
async def test_create_company_endpoint_uses_platform_admin_email(
    mock_create_company_in_db: AsyncMock,
    mock_get_company_in_db: MagicMock,
) -> None:
    from ee.onyx.server.tenants.company_api import create_company

    company = _make_company()
    platform_admin = MagicMock()
    platform_admin.email = "platform@example.com"

    mock_create_company_in_db.return_value = company
    mock_get_company_in_db.return_value = (company, [])

    response = await create_company(
        CompanyCreateRequest(
            name="Acme",
            admin_email="bob@acme.com",
            domain="acme.com",
        ),
        user=platform_admin,
    )

    mock_create_company_in_db.assert_awaited_once_with(
        name="Acme",
        domain="acme.com",
        admin_email="bob@acme.com",
        created_by="platform@example.com",
    )
    assert response.id == company.id
    assert response.name == "Acme"


@patch("ee.onyx.server.tenants.company_api.get_company_in_db")
@patch("ee.onyx.server.tenants.company_api.update_company_in_db")
def test_update_company_endpoint_only_forwards_provided_fields(
    mock_update_company_in_db: MagicMock,
    mock_get_company_in_db: MagicMock,
) -> None:
    from ee.onyx.server.tenants.company_api import update_company

    company = _make_company()
    mock_update_company_in_db.return_value = company
    mock_get_company_in_db.return_value = (company, [])

    response = update_company(
        company.id,
        CompanyUpdateRequest(name="Renamed"),
        _=MagicMock(),
    )

    mock_update_company_in_db.assert_called_once_with(
        company.id,
        name="Renamed",
    )
    assert response.id == company.id
    assert response.name == "Acme"
