import os
from datetime import datetime

import jwt
from fastapi import Depends
from fastapi import Request

from onyx.auth.invited_users import get_invited_admin_users
from ee.onyx.configs.app_configs import PLATFORM_ADMIN_API_KEY
from ee.onyx.configs.app_configs import SUPER_USERS
from ee.onyx.server.seeding import get_seed_config
from onyx.auth.users import current_admin_user
from onyx.configs.app_configs import AUTH_TYPE
from onyx.configs.app_configs import USER_AUTH_SECRET
from onyx.db.models import User
from onyx.error_handling.error_codes import OnyxErrorCode
from onyx.error_handling.exceptions import OnyxError
from onyx.utils.logger import setup_logger


logger = setup_logger()


def verify_auth_setting() -> None:
    # All the Auth flows are valid for EE version, but warn about deprecated 'disabled'
    raw_auth_type = (os.environ.get("AUTH_TYPE") or "").lower()
    if raw_auth_type == "disabled":
        logger.warning(
            "AUTH_TYPE='disabled' is no longer supported. Using 'basic' instead. Please update your configuration."
        )
    logger.notice(f"Using Auth Type: {AUTH_TYPE.value}")


def get_default_admin_user_emails_() -> list[str]:
    seed_config = get_seed_config()
    admin_emails = list(seed_config.admin_user_emails) if (
        seed_config and seed_config.admin_user_emails
    ) else []
    admin_emails.extend(get_invited_admin_users())

    deduped_admin_emails: list[str] = []
    seen_emails: set[str] = set()
    for email in admin_emails:
        normalized_email = email.lower()
        if normalized_email in seen_emails:
            continue
        seen_emails.add(normalized_email)
        deduped_admin_emails.append(normalized_email)

    return deduped_admin_emails


async def current_platform_admin(
    request: Request,
    user: User = Depends(current_admin_user),
) -> User:
    api_key = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    if api_key != PLATFORM_ADMIN_API_KEY:
        raise OnyxError(OnyxErrorCode.UNAUTHENTICATED, "Invalid API key")

    if user and user.email.lower() not in SUPER_USERS:
        raise OnyxError(
            OnyxErrorCode.INSUFFICIENT_PERMISSIONS,
            "Access denied. User must be a platform admin to perform this action.",
        )
    return user


current_cloud_superuser = current_platform_admin


def generate_anonymous_user_jwt_token(tenant_id: str) -> str:
    payload = {
        "tenant_id": tenant_id,
        # Token does not expire
        "iat": datetime.utcnow(),  # Issued at time
    }

    return jwt.encode(payload, USER_AUTH_SECRET, algorithm="HS256")


def decode_anonymous_user_jwt_token(token: str) -> dict:
    return jwt.decode(token, USER_AUTH_SECRET, algorithms=["HS256"])
