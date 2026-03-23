"""Helpers for determining whether the cloud control plane is configured."""

import onyx.configs.app_configs as onyx_app_configs


DEFAULT_CONTROL_PLANE_API_BASE_URL = "http://localhost:8082"


def _normalize_control_plane_api_base_url(control_plane_api_base_url: str | None) -> str:
    return (control_plane_api_base_url or "").strip().rstrip("/")


def is_control_plane_configured(
    control_plane_api_base_url: str | None = None,
) -> bool:
    """Return True only when a non-default control plane URL is configured."""
    configured_base_url = (
        control_plane_api_base_url
        if control_plane_api_base_url is not None
        else onyx_app_configs.CONTROL_PLANE_API_BASE_URL
    )
    normalized_base_url = _normalize_control_plane_api_base_url(configured_base_url)
    normalized_default_base_url = _normalize_control_plane_api_base_url(
        DEFAULT_CONTROL_PLANE_API_BASE_URL
    )
    return bool(normalized_base_url) and (
        normalized_base_url != normalized_default_base_url
    )
