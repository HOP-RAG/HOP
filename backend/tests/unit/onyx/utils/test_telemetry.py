from typing import Any
from unittest.mock import Mock

from onyx.configs.constants import MilestoneRecordType
from onyx.utils import telemetry as telemetry_utils


def test_mt_cloud_telemetry_noop_when_not_multi_tenant(monkeypatch: Any) -> None:
    fetch_impl = Mock()
    monkeypatch.setattr(
        telemetry_utils,
        "fetch_versioned_implementation_with_fallback",
        fetch_impl,
    )
    # mt_cloud_telemetry reads the module-local imported symbol, so patch this path.
    monkeypatch.setattr("onyx.utils.telemetry.MULTI_TENANT", False)

    telemetry_utils.mt_cloud_telemetry(
        tenant_id="tenant-1",
        distinct_id="12345678-1234-1234-1234-123456789abc",
        event=MilestoneRecordType.USER_MESSAGE_SENT,
        properties={"origin": "web"},
    )

    fetch_impl.assert_not_called()


def test_mt_cloud_telemetry_calls_event_telemetry_when_multi_tenant(
    monkeypatch: Any,
) -> None:
    event_telemetry = Mock()
    fetch_impl = Mock(return_value=event_telemetry)
    monkeypatch.setattr(
        telemetry_utils,
        "fetch_versioned_implementation_with_fallback",
        fetch_impl,
    )
    # mt_cloud_telemetry reads the module-local imported symbol, so patch this path.
    monkeypatch.setattr("onyx.utils.telemetry.MULTI_TENANT", True)

    telemetry_utils.mt_cloud_telemetry(
        tenant_id="tenant-1",
        distinct_id="12345678-1234-1234-1234-123456789abc",
        event=MilestoneRecordType.USER_MESSAGE_SENT,
        properties={"origin": "web"},
    )

    fetch_impl.assert_called_once_with(
        module="onyx.utils.telemetry",
        attribute="event_telemetry",
        fallback=telemetry_utils.noop_fallback,
    )
    event_telemetry.assert_called_once_with(
        "12345678-1234-1234-1234-123456789abc",
        MilestoneRecordType.USER_MESSAGE_SENT,
        {"origin": "web", "tenant_id": "tenant-1"},
    )


def test_mt_cloud_identify_noop_when_not_multi_tenant(monkeypatch: Any) -> None:
    fetch_impl = Mock()
    monkeypatch.setattr(
        telemetry_utils,
        "fetch_versioned_implementation_with_fallback",
        fetch_impl,
    )
    monkeypatch.setattr("onyx.utils.telemetry.MULTI_TENANT", False)

    telemetry_utils.mt_cloud_identify(
        distinct_id="12345678-1234-1234-1234-123456789abc",
        properties={"email": "user@example.com"},
    )

    fetch_impl.assert_not_called()


def test_mt_cloud_identify_calls_identify_user_when_multi_tenant(
    monkeypatch: Any,
) -> None:
    identify_user = Mock()
    fetch_impl = Mock(return_value=identify_user)
    monkeypatch.setattr(
        telemetry_utils,
        "fetch_versioned_implementation_with_fallback",
        fetch_impl,
    )
    monkeypatch.setattr("onyx.utils.telemetry.MULTI_TENANT", True)

    telemetry_utils.mt_cloud_identify(
        distinct_id="12345678-1234-1234-1234-123456789abc",
        properties={"email": "user@example.com"},
    )

    fetch_impl.assert_called_once_with(
        module="onyx.utils.telemetry",
        attribute="identify_user",
        fallback=telemetry_utils.noop_fallback,
    )
    identify_user.assert_called_once_with(
        "12345678-1234-1234-1234-123456789abc",
        {"email": "user@example.com"},
    )


def test_optional_telemetry_noop_when_disabled(monkeypatch: Any) -> None:
    post_mock = Mock()
    thread_mock = Mock()
    uuid_mock = Mock()

    monkeypatch.setattr("onyx.utils.telemetry.DISABLE_TELEMETRY", True)
    monkeypatch.setattr("onyx.utils.telemetry.requests.post", post_mock)
    monkeypatch.setattr("onyx.utils.telemetry.threading.Thread", thread_mock)
    monkeypatch.setattr("onyx.utils.telemetry.get_or_generate_uuid", uuid_mock)

    telemetry_utils.optional_telemetry(
        record_type=telemetry_utils.RecordType.USAGE,
        data={"action": "test"},
    )

    post_mock.assert_not_called()
    thread_mock.assert_not_called()
    uuid_mock.assert_not_called()


def test_optional_telemetry_starts_background_send_when_enabled(
    monkeypatch: Any,
) -> None:
    post_mock = Mock()
    thread_start_mock = Mock()
    uuid_mock = Mock(return_value="uuid-123")
    thread_target: Any = None

    class FakeThread:
        def __init__(self, target: Any, daemon: bool) -> None:
            nonlocal thread_target
            thread_target = target
            assert daemon is True

        def start(self) -> None:
            thread_start_mock()
            assert thread_target is not None
            thread_target()

    monkeypatch.setattr("onyx.utils.telemetry.DISABLE_TELEMETRY", False)
    monkeypatch.setattr("onyx.utils.telemetry.MULTI_TENANT", False)
    monkeypatch.setattr("onyx.utils.telemetry.ENTERPRISE_EDITION_ENABLED", False)
    monkeypatch.setattr("onyx.utils.telemetry.get_or_generate_uuid", uuid_mock)
    monkeypatch.setattr("onyx.utils.telemetry.requests.post", post_mock)
    monkeypatch.setattr("onyx.utils.telemetry.threading.Thread", FakeThread)

    telemetry_utils.optional_telemetry(
        record_type=telemetry_utils.RecordType.USAGE,
        data={"action": "test"},
        user_id="user-1",
    )

    thread_start_mock.assert_called_once()
    uuid_mock.assert_called_once()
    post_mock.assert_called_once_with(
        "https://telemetry.onyx.app/anonymous_telemetry",
        headers={"Content-Type": "application/json"},
        json={
            "data": {"action": "test"},
            "record": telemetry_utils.RecordType.USAGE,
            "user_id": "user-1",
            "customer_uuid": "uuid-123",
            "is_cloud": False,
        },
    )
