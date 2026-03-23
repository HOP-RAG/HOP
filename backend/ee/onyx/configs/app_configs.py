import json
import os
import logging

from shared_configs.configs import THIRD_PARTY_ANALYTICS_ENABLED


#####
# Auto Permission Sync
#####
# should generally only be used for sources that support polling of permissions
# e.g. can pull in only permission changes rather than having to go through all
# documents every time
DEFAULT_PERMISSION_DOC_SYNC_FREQUENCY = int(
    os.environ.get("DEFAULT_PERMISSION_DOC_SYNC_FREQUENCY") or 5 * 60
)


#####
# Confluence
#####

# In seconds, default is 30 minutes
CONFLUENCE_PERMISSION_GROUP_SYNC_FREQUENCY = int(
    os.environ.get("CONFLUENCE_PERMISSION_GROUP_SYNC_FREQUENCY") or 30 * 60
)
# In seconds, default is 30 minutes
CONFLUENCE_PERMISSION_DOC_SYNC_FREQUENCY = int(
    os.environ.get("CONFLUENCE_PERMISSION_DOC_SYNC_FREQUENCY") or 30 * 60
)
# This is a boolean that determines if anonymous access is public
# Default behavior is to not make the page public and instead add a group
# that contains all the users that we found in Confluence
CONFLUENCE_ANONYMOUS_ACCESS_IS_PUBLIC = (
    os.environ.get("CONFLUENCE_ANONYMOUS_ACCESS_IS_PUBLIC", "").lower() == "true"
)


#####
# JIRA
#####

# In seconds, default is 30 minutes
JIRA_PERMISSION_DOC_SYNC_FREQUENCY = int(
    os.environ.get("JIRA_PERMISSION_DOC_SYNC_FREQUENCY") or 30 * 60
)
# In seconds, default is 30 minutes
JIRA_PERMISSION_GROUP_SYNC_FREQUENCY = int(
    os.environ.get("JIRA_PERMISSION_GROUP_SYNC_FREQUENCY") or 30 * 60
)


#####
# Google Drive
#####
GOOGLE_DRIVE_PERMISSION_GROUP_SYNC_FREQUENCY = int(
    os.environ.get("GOOGLE_DRIVE_PERMISSION_GROUP_SYNC_FREQUENCY") or 5 * 60
)


#####
# GitHub
#####
# In seconds, default is 5 minutes
GITHUB_PERMISSION_DOC_SYNC_FREQUENCY = int(
    os.environ.get("GITHUB_PERMISSION_DOC_SYNC_FREQUENCY") or 5 * 60
)
# In seconds, default is 5 minutes
GITHUB_PERMISSION_GROUP_SYNC_FREQUENCY = int(
    os.environ.get("GITHUB_PERMISSION_GROUP_SYNC_FREQUENCY") or 5 * 60
)


#####
# Slack
#####
SLACK_PERMISSION_DOC_SYNC_FREQUENCY = int(
    os.environ.get("SLACK_PERMISSION_DOC_SYNC_FREQUENCY") or 5 * 60
)

NUM_PERMISSION_WORKERS = int(os.environ.get("NUM_PERMISSION_WORKERS") or 2)


#####
# Teams
#####
# In seconds, default is 5 minutes
TEAMS_PERMISSION_DOC_SYNC_FREQUENCY = int(
    os.environ.get("TEAMS_PERMISSION_DOC_SYNC_FREQUENCY") or 5 * 60
)

#####
# SharePoint
#####
# In seconds, default is 30 minutes
SHAREPOINT_PERMISSION_DOC_SYNC_FREQUENCY = int(
    os.environ.get("SHAREPOINT_PERMISSION_DOC_SYNC_FREQUENCY") or 30 * 60
)

# In seconds, default is 5 minutes
SHAREPOINT_PERMISSION_GROUP_SYNC_FREQUENCY = int(
    os.environ.get("SHAREPOINT_PERMISSION_GROUP_SYNC_FREQUENCY") or 5 * 60
)


####
# Celery Job Frequency
####
CHECK_TTL_MANAGEMENT_TASK_FREQUENCY_IN_HOURS = float(
    os.environ.get("CHECK_TTL_MANAGEMENT_TASK_FREQUENCY_IN_HOURS") or 1
)  # float for easier testing


STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")

# JWT Public Key URL
JWT_PUBLIC_KEY_URL: str | None = os.getenv("JWT_PUBLIC_KEY_URL", None)


def _parse_super_users(raw_super_users: str | None) -> list[str]:
    if not raw_super_users:
        return []

    try:
        parsed_super_users = json.loads(raw_super_users)
        if isinstance(parsed_super_users, list):
            return [
                str(email).strip().lower()
                for email in parsed_super_users
                if str(email).strip()
            ]
    except json.JSONDecodeError:
        pass

    return [
        email.strip().lower()
        for email in raw_super_users.split(",")
        if email.strip()
    ]


# Platform Admins
SUPER_USERS = _parse_super_users(os.environ.get("SUPER_USERS"))
PLATFORM_ADMIN_API_KEY = os.environ.get(
    "PLATFORM_ADMIN_API_KEY",
    os.environ.get("SUPER_CLOUD_API_KEY", "api_key"),
)
# Backwards compatibility for older code/configs that still reference the old name.
SUPER_CLOUD_API_KEY = PLATFORM_ADMIN_API_KEY

_logger = logging.getLogger(__name__)

_raw_posthog_api_key = os.environ.get("POSTHOG_API_KEY")
POSTHOG_HOST = os.environ.get("POSTHOG_HOST") or "https://us.i.posthog.com"
POSTHOG_DEBUG_LOGS_ENABLED = (
    os.environ.get("POSTHOG_DEBUG_LOGS_ENABLED", "").lower() == "true"
)
POSTHOG_API_KEY = _raw_posthog_api_key if THIRD_PARTY_ANALYTICS_ENABLED else None

_raw_marketing_posthog_api_key = os.environ.get("MARKETING_POSTHOG_API_KEY")
MARKETING_POSTHOG_API_KEY = (
    _raw_marketing_posthog_api_key if THIRD_PARTY_ANALYTICS_ENABLED else None
)

_raw_hubspot_tracking_url = os.environ.get("HUBSPOT_TRACKING_URL")
HUBSPOT_TRACKING_URL = (
    _raw_hubspot_tracking_url if THIRD_PARTY_ANALYTICS_ENABLED else None
)

if not THIRD_PARTY_ANALYTICS_ENABLED:
    ignored_analytics_env_vars = [
        env_var
        for env_var, value in (
            ("POSTHOG_API_KEY", _raw_posthog_api_key),
            ("MARKETING_POSTHOG_API_KEY", _raw_marketing_posthog_api_key),
            ("HUBSPOT_TRACKING_URL", _raw_hubspot_tracking_url),
        )
        if value
    ]
    if ignored_analytics_env_vars:
        _logger.warning(
            "Ignoring EE third-party analytics configuration because the global "
            "third-party analytics opt-in is disabled: %s",
            ", ".join(ignored_analytics_env_vars),
        )

GATED_TENANTS_KEY = "gated_tenants"

# License enforcement - when True, blocks API access for gated/expired licenses
LICENSE_ENFORCEMENT_ENABLED = (
    os.environ.get("LICENSE_ENFORCEMENT_ENABLED", "true").lower() == "true"
)

# Cloud data plane URL - self-hosted instances call this to reach cloud proxy endpoints
# Used when MULTI_TENANT=false (self-hosted mode)
CLOUD_DATA_PLANE_URL = os.environ.get(
    "CLOUD_DATA_PLANE_URL", "https://cloud.onyx.app/api"
)
