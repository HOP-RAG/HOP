import asyncio
from collections.abc import Sequence
from uuid import UUID
from uuid import uuid4

from email_validator import EmailNotValidError
from email_validator import validate_email
from sqlalchemy import func
from sqlalchemy import select

from onyx.auth.invited_users import get_invited_users
from onyx.auth.invited_users import get_invited_admin_users
from onyx.auth.invited_users import remove_user_from_invited_admin_users
from onyx.auth.invited_users import write_invited_admin_users
from onyx.auth.invited_users import write_invited_users
from onyx.auth.schemas import UserRole
from onyx.db.engine.sql_engine import get_session_with_shared_schema
from onyx.db.engine.sql_engine import get_session_with_tenant
from onyx.db.models import Company
from onyx.db.models import User
from onyx.db.models import UserTenantMapping
from onyx.db.users import get_user_by_email
from onyx.error_handling.error_codes import OnyxErrorCode
from onyx.error_handling.exceptions import OnyxError
from shared_configs.configs import TENANT_ID_PREFIX
from shared_configs.contextvars import CURRENT_TENANT_ID_CONTEXTVAR

_UNSET = object()


def _normalize_email(email: str) -> str:
    try:
        email_info = validate_email(email, check_deliverability=False)
    except EmailNotValidError as e:
        raise OnyxError(OnyxErrorCode.INVALID_INPUT, f"Invalid email address: {e}")

    return email_info.normalized.lower()


def _normalize_company_name(name: str) -> str:
    normalized_name = name.strip()
    if not normalized_name:
        raise OnyxError(OnyxErrorCode.MISSING_REQUIRED_FIELD, "Company name is required")
    return normalized_name


def _normalize_domain(domain: str | None) -> str | None:
    if domain is None:
        return None

    normalized_domain = domain.strip().lower()
    return normalized_domain or None


def _get_company_or_raise(company_id: UUID) -> Company:
    with get_session_with_shared_schema() as db_session:
        company = db_session.get(Company, company_id)
        if company is None:
            raise OnyxError(OnyxErrorCode.NOT_FOUND, "Company not found")
        db_session.expunge(company)
        return company


def _write_invited_user(tenant_id: str, email: str) -> None:
    token = CURRENT_TENANT_ID_CONTEXTVAR.set(tenant_id)
    try:
        invited_users = get_invited_users()
        if email not in invited_users:
            write_invited_users(invited_users + [email])
    finally:
        CURRENT_TENANT_ID_CONTEXTVAR.reset(token)


def _write_invited_admin_user(tenant_id: str, email: str) -> None:
    token = CURRENT_TENANT_ID_CONTEXTVAR.set(tenant_id)
    try:
        invited_admin_users = get_invited_admin_users()
        if email not in invited_admin_users:
            write_invited_admin_users(invited_admin_users + [email])
    finally:
        CURRENT_TENANT_ID_CONTEXTVAR.reset(token)


def _remove_invited_admin_user(tenant_id: str, email: str) -> None:
    token = CURRENT_TENANT_ID_CONTEXTVAR.set(tenant_id)
    try:
        remove_user_from_invited_admin_users(email)
    finally:
        CURRENT_TENANT_ID_CONTEXTVAR.reset(token)


def _get_company_user_rows(
    tenant_id: str,
) -> list[tuple[UserTenantMapping, User | None]]:
    with get_session_with_shared_schema() as shared_session:
        mappings = list(
            shared_session.scalars(
                select(UserTenantMapping)
                .where(UserTenantMapping.tenant_id == tenant_id)
                .order_by(UserTenantMapping.active.desc(), UserTenantMapping.email.asc())
            ).all()
        )

    if not mappings:
        return []

    lower_emails = [mapping.email.lower() for mapping in mappings]
    with get_session_with_tenant(tenant_id=tenant_id) as tenant_session:
        users = list(
            tenant_session.scalars(
                select(User).where(func.lower(User.email).in_(lower_emails))
            ).unique().all()
        )

    users_by_email = {user.email.lower(): user for user in users}
    return [
        (mapping, users_by_email.get(mapping.email.lower())) for mapping in mappings
    ]


def get_company_by_tenant_id(tenant_id: str) -> Company | None:
    with get_session_with_shared_schema() as db_session:
        company = db_session.scalar(
            select(Company).where(Company.tenant_id == tenant_id)
        )
        if company is not None:
            db_session.expunge(company)
        return company


async def create_company(
    name: str,
    domain: str | None,
    admin_email: str,
    created_by: str,
) -> Company:
    from ee.onyx.server.tenants.provisioning import rollback_tenant_provisioning
    from ee.onyx.server.tenants.provisioning import setup_tenant
    from ee.onyx.server.tenants.schema_management import create_schema_if_not_exists
    from ee.onyx.server.tenants.schema_management import run_alembic_migrations
    from ee.onyx.server.tenants.user_mapping import add_users_to_tenant
    from ee.onyx.server.tenants.user_mapping import user_owns_a_tenant

    normalized_name = _normalize_company_name(name)
    normalized_domain = _normalize_domain(domain)
    normalized_admin_email = _normalize_email(admin_email)
    normalized_created_by = _normalize_email(created_by)

    with get_session_with_shared_schema() as db_session:
        if normalized_domain is not None:
            existing_company = db_session.scalar(
                select(Company).where(func.lower(Company.domain) == normalized_domain)
            )
            if existing_company is not None:
                raise OnyxError(
                    OnyxErrorCode.CONFLICT,
                    "A company with this domain already exists.",
                )

    if user_owns_a_tenant(normalized_admin_email):
        raise OnyxError(
            OnyxErrorCode.CONFLICT,
            "The requested customer admin already belongs to a company.",
        )

    tenant_id: str | None = None
    try:
        for _ in range(5):
            candidate_tenant_id = TENANT_ID_PREFIX + str(uuid4())
            schema_created = await asyncio.to_thread(
                create_schema_if_not_exists, candidate_tenant_id
            )
            if schema_created:
                tenant_id = candidate_tenant_id
                break

        if tenant_id is None:
            raise OnyxError(
                OnyxErrorCode.INTERNAL_ERROR,
                "Failed to allocate a unique tenant ID for the company.",
            )

        await asyncio.to_thread(run_alembic_migrations, tenant_id)
        await setup_tenant(tenant_id, run_migrations=False)
        add_users_to_tenant([normalized_admin_email], tenant_id)
        _write_invited_user(tenant_id, normalized_admin_email)

        with get_session_with_shared_schema() as db_session:
            company = Company(
                tenant_id=tenant_id,
                name=normalized_name,
                domain=normalized_domain,
                is_active=True,
                created_by=normalized_created_by,
            )
            db_session.add(company)
            db_session.commit()
            db_session.refresh(company)
            db_session.expunge(company)
            return company

    except OnyxError:
        if tenant_id is not None:
            await rollback_tenant_provisioning(tenant_id)
        raise
    except Exception as e:
        if tenant_id is not None:
            await rollback_tenant_provisioning(tenant_id)
        raise OnyxError(
            OnyxErrorCode.INTERNAL_ERROR,
            f"Failed to create company: {e}",
        )


def list_companies(
    page_num: int = 0,
    page_size: int = 25,
) -> tuple[Sequence[tuple[Company, int]], int]:
    user_counts_subquery = (
        select(
            UserTenantMapping.tenant_id.label("tenant_id"),
            func.count(UserTenantMapping.email).label("user_count"),
        )
        .where(UserTenantMapping.active.is_(True))
        .group_by(UserTenantMapping.tenant_id)
        .subquery()
    )

    with get_session_with_shared_schema() as db_session:
        total_count = db_session.scalar(select(func.count()).select_from(Company)) or 0
        rows = [
            (company, user_count)
            for company, user_count in db_session.execute(
                select(
                    Company,
                    func.coalesce(user_counts_subquery.c.user_count, 0).label(
                        "user_count"
                    ),
                )
                .outerjoin(
                    user_counts_subquery,
                    Company.tenant_id == user_counts_subquery.c.tenant_id,
                )
                .order_by(Company.created_at.desc())
                .offset(page_num * page_size)
                .limit(page_size)
            ).all()
        ]

        for company, _ in rows:
            db_session.expunge(company)

        return rows, total_count


def get_company(company_id: UUID) -> tuple[Company, list[tuple[UserTenantMapping, User | None]]]:
    company = _get_company_or_raise(company_id)
    user_rows = _get_company_user_rows(company.tenant_id)
    return company, user_rows


def update_company(
    company_id: UUID,
    *,
    name: str | None | object = _UNSET,
    domain: str | None | object = _UNSET,
) -> Company:
    normalized_name = _normalize_company_name(name) if name is not _UNSET else _UNSET
    normalized_domain = _normalize_domain(domain) if domain is not _UNSET else _UNSET

    with get_session_with_shared_schema() as db_session:
        company = db_session.get(Company, company_id)
        if company is None:
            raise OnyxError(OnyxErrorCode.NOT_FOUND, "Company not found")

        if normalized_domain is not _UNSET and normalized_domain is not None:
            existing_company = db_session.scalar(
                select(Company).where(
                    func.lower(Company.domain) == normalized_domain,
                    Company.id != company_id,
                )
            )
            if existing_company is not None:
                raise OnyxError(
                    OnyxErrorCode.CONFLICT,
                    "A company with this domain already exists.",
                )

        if normalized_name is not _UNSET:
            company.name = normalized_name
        if normalized_domain is not _UNSET:
            company.domain = normalized_domain

        db_session.commit()
        db_session.refresh(company)
        db_session.expunge(company)
        return company


def set_company_active(company_id: UUID, *, is_active: bool) -> Company:
    with get_session_with_shared_schema() as db_session:
        company = db_session.get(Company, company_id)
        if company is None:
            raise OnyxError(OnyxErrorCode.NOT_FOUND, "Company not found")

        company.is_active = is_active
        db_session.commit()
        db_session.refresh(company)
        db_session.expunge(company)
        return company


def deactivate_company(company_id: UUID) -> Company:
    return set_company_active(company_id, is_active=False)


def activate_company(company_id: UUID) -> Company:
    return set_company_active(company_id, is_active=True)


def invite_company_admin(
    company_id: UUID,
    admin_email: str,
) -> tuple[Company, list[tuple[UserTenantMapping, User | None]]]:
    from ee.onyx.server.tenants.user_mapping import add_users_to_tenant

    normalized_admin_email = _normalize_email(admin_email)
    company = _get_company_or_raise(company_id)

    if not company.is_active:
        raise OnyxError(
            OnyxErrorCode.CONFLICT,
            "Cannot invite an admin to an inactive company.",
        )

    add_users_to_tenant([normalized_admin_email], company.tenant_id)
    _write_invited_user(company.tenant_id, normalized_admin_email)

    with get_session_with_tenant(tenant_id=company.tenant_id) as tenant_session:
        existing_user = get_user_by_email(normalized_admin_email, tenant_session)
        if existing_user is not None:
            if existing_user.role != UserRole.ADMIN:
                existing_user.role = UserRole.ADMIN
                tenant_session.commit()
            _remove_invited_admin_user(company.tenant_id, normalized_admin_email)
        else:
            _write_invited_admin_user(company.tenant_id, normalized_admin_email)

    return get_company(company_id)
