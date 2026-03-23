import json
import uuid
from unittest.mock import AsyncMock
from unittest.mock import MagicMock

import pytest


@pytest.mark.asyncio
async def test_on_after_login_resolves_tenant_for_basic_auth(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import onyx.auth.users as users_module

    resolver = AsyncMock(return_value="tenant_123")
    monkeypatch.setattr(users_module, "AUTH_TYPE", users_module.AuthType.BASIC)
    monkeypatch.setattr(
        users_module,
        "fetch_ee_implementation_or_noop",
        lambda *args, **kwargs: resolver,  # noqa: ARG005
    )

    context_var = MagicMock()
    context_var.get.return_value = "stale-tenant"
    context_var.set.return_value = "tenant-token"
    monkeypatch.setattr(users_module, "CURRENT_TENANT_ID_CONTEXTVAR", context_var)

    identify = MagicMock()
    monkeypatch.setattr(users_module, "mt_cloud_identify", identify)

    user_manager = users_module.UserManager(MagicMock())
    user = MagicMock()
    user.id = "user-123"
    user.email = "member@example.com"

    await user_manager.on_after_login(user)

    resolver.assert_awaited_once_with(email="member@example.com", request=None)
    context_var.set.assert_called_once_with("tenant_123")
    context_var.reset.assert_called_once_with("tenant-token")
    identify.assert_called_once_with(
        distinct_id="user-123",
        properties={"email": "member@example.com", "tenant_id": "tenant_123"},
    )


@pytest.mark.asyncio
async def test_tenant_aware_redis_strategy_writes_tenant_id_into_session_payload(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import onyx.auth.users as users_module

    redis = MagicMock()
    redis.set = AsyncMock()
    monkeypatch.setattr(
        users_module,
        "get_async_redis_connection",
        AsyncMock(return_value=redis),
    )

    resolver = AsyncMock(return_value="tenant_abc")
    monkeypatch.setattr(
        users_module,
        "fetch_ee_implementation_or_noop",
        lambda *args, **kwargs: resolver,  # noqa: ARG005
    )

    strategy = users_module.TenantAwareRedisStrategy(
        lifetime_seconds=120,
        key_prefix="auth:",
    )
    user = MagicMock()
    user.id = uuid.uuid4()
    user.email = "member@example.com"

    token = await strategy.write_token(user)

    resolver.assert_awaited_once_with(email="member@example.com")
    redis.set.assert_awaited_once()
    redis_key, payload = redis.set.await_args.args
    assert redis_key == f"auth:{token}"
    assert json.loads(payload) == {
        "sub": str(user.id),
        "tenant_id": "tenant_abc",
    }
    assert redis.set.await_args.kwargs["ex"] == 120
