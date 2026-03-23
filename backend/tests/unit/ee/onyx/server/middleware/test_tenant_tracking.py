from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from starlette.requests import Request


@pytest.mark.asyncio
@patch("ee.onyx.server.middleware.tenant_tracking.is_valid_schema_name", return_value=True)
@patch(
    "ee.onyx.server.middleware.tenant_tracking.retrieve_auth_token_data_from_redis",
    new_callable=AsyncMock,
)
@patch(
    "ee.onyx.server.middleware.tenant_tracking.extract_tenant_from_auth_header",
    return_value=None,
)
async def test_get_tenant_id_from_request_reads_redis_session_payload(
    _mock_extract_tenant: MagicMock,
    mock_retrieve_auth_token_data: AsyncMock,
    _mock_is_valid_schema_name: MagicMock,
) -> None:
    from ee.onyx.server.middleware.tenant_tracking import _get_tenant_id_from_request

    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/me",
            "headers": [],
            "query_string": b"",
        }
    )
    logger = MagicMock()
    mock_retrieve_auth_token_data.return_value = {
        "sub": "user-123",
        "tenant_id": "tenant_123",
    }

    tenant_id = await _get_tenant_id_from_request(request, logger)

    assert tenant_id == "tenant_123"
