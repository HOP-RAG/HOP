from unittest.mock import MagicMock

import pytest
from fastapi import Request

from onyx.error_handling.error_codes import OnyxErrorCode
from onyx.error_handling.exceptions import OnyxError


def _make_request(api_key: str) -> Request:
    scope = {
        "type": "http",
        "headers": [
            (b"authorization", f"Bearer {api_key}".encode()),
        ],
    }
    return Request(scope)


@pytest.mark.asyncio
async def test_current_platform_admin_allows_super_user(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from ee.onyx.auth.users import current_platform_admin

    monkeypatch.setattr("ee.onyx.auth.users.PLATFORM_ADMIN_API_KEY", "platform-key")
    monkeypatch.setattr("ee.onyx.auth.users.SUPER_USERS", ["admin@example.com"])

    user = MagicMock()
    user.email = "admin@example.com"

    result = await current_platform_admin(_make_request("platform-key"), user=user)

    assert result is user


def test_parse_super_users_supports_comma_separated_env() -> None:
    from ee.onyx.configs.app_configs import _parse_super_users

    assert _parse_super_users("Admin@Example.com, second@example.com ") == [
        "admin@example.com",
        "second@example.com",
    ]


def test_parse_super_users_supports_legacy_json_list() -> None:
    from ee.onyx.configs.app_configs import _parse_super_users

    assert _parse_super_users('["Admin@Example.com", "second@example.com"]') == [
        "admin@example.com",
        "second@example.com",
    ]


@pytest.mark.asyncio
async def test_current_platform_admin_rejects_invalid_api_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from ee.onyx.auth.users import current_platform_admin

    monkeypatch.setattr("ee.onyx.auth.users.PLATFORM_ADMIN_API_KEY", "platform-key")
    monkeypatch.setattr("ee.onyx.auth.users.SUPER_USERS", ["admin@example.com"])

    user = MagicMock()
    user.email = "admin@example.com"

    with pytest.raises(OnyxError) as exc_info:
        await current_platform_admin(_make_request("wrong-key"), user=user)

    assert exc_info.value.error_code is OnyxErrorCode.UNAUTHENTICATED


@pytest.mark.asyncio
async def test_current_platform_admin_rejects_non_super_user(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from ee.onyx.auth.users import current_platform_admin

    monkeypatch.setattr("ee.onyx.auth.users.PLATFORM_ADMIN_API_KEY", "platform-key")
    monkeypatch.setattr("ee.onyx.auth.users.SUPER_USERS", ["admin@example.com"])

    user = MagicMock()
    user.email = "member@example.com"

    with pytest.raises(OnyxError) as exc_info:
        await current_platform_admin(_make_request("platform-key"), user=user)

    assert exc_info.value.error_code is OnyxErrorCode.INSUFFICIENT_PERMISSIONS
