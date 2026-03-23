from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import Query

from ee.onyx.auth.users import current_platform_admin
from ee.onyx.server.tenants.models import CompanyCreateRequest
from ee.onyx.server.tenants.models import CompanyDetail
from ee.onyx.server.tenants.models import CompanyInviteAdminRequest
from ee.onyx.server.tenants.models import CompanySnapshot
from ee.onyx.server.tenants.models import CompanyUpdateRequest
from ee.onyx.server.tenants.models import CompanyUserSnapshot
from onyx.configs.constants import PUBLIC_API_TAGS
from onyx.db.company import activate_company as activate_company_in_db
from onyx.db.company import create_company as create_company_in_db
from onyx.db.company import deactivate_company as deactivate_company_in_db
from onyx.db.company import get_company as get_company_in_db
from onyx.db.company import invite_company_admin
from onyx.db.company import list_companies as list_companies_in_db
from onyx.db.company import update_company as update_company_in_db
from onyx.db.models import Company
from onyx.db.models import User
from onyx.db.models import UserTenantMapping
from onyx.server.documents.models import PaginatedReturn


router = APIRouter(prefix="/admin/companies", tags=PUBLIC_API_TAGS)


def _active_user_count(
    user_rows: list[tuple[UserTenantMapping, User | None]],
) -> int:
    return sum(1 for mapping, _user in user_rows if mapping.active)


def _company_detail_from_rows(
    company: Company,
    user_rows: list[tuple[UserTenantMapping, User | None]],
) -> CompanyDetail:
    users = [
        CompanyUserSnapshot(
            email=mapping.email,
            mapping_active=mapping.active,
            registered=user is not None,
            role=user.role if user is not None else None,
            is_active=user.is_active if user is not None else None,
        )
        for mapping, user in user_rows
    ]
    return CompanyDetail(
        **CompanySnapshot.from_model(
            company, user_count=_active_user_count(user_rows)
        ).model_dump(),
        users=users,
    )


@router.post("")
async def create_company(
    create_request: CompanyCreateRequest,
    user: User = Depends(current_platform_admin),
) -> CompanyDetail:
    company = await create_company_in_db(
        name=create_request.name,
        domain=create_request.domain,
        admin_email=create_request.admin_email,
        created_by=user.email,
    )
    company, user_rows = get_company_in_db(company.id)
    return _company_detail_from_rows(company, user_rows)


@router.get("")
def list_companies(
    _: User = Depends(current_platform_admin),
    page_num: int = Query(0, ge=0),
    page_size: int = Query(25, ge=1, le=250),
) -> PaginatedReturn[CompanySnapshot]:
    rows, total_items = list_companies_in_db(page_num=page_num, page_size=page_size)
    return PaginatedReturn(
        items=[
            CompanySnapshot.from_model(company, user_count=user_count)
            for company, user_count in rows
        ],
        total_items=total_items,
    )


@router.get("/{company_id}")
def get_company(
    company_id: UUID,
    _: User = Depends(current_platform_admin),
) -> CompanyDetail:
    company, user_rows = get_company_in_db(company_id)
    return _company_detail_from_rows(company, user_rows)


@router.patch("/{company_id}")
def update_company(
    company_id: UUID,
    update_request: CompanyUpdateRequest,
    _: User = Depends(current_platform_admin),
) -> CompanySnapshot:
    update_values = update_request.model_dump(exclude_unset=True)
    company = update_company_in_db(
        company_id,
        **update_values,
    )
    refreshed_company, user_rows = get_company_in_db(company.id)
    return CompanySnapshot.from_model(
        refreshed_company, user_count=_active_user_count(user_rows)
    )


@router.post("/{company_id}/deactivate")
def deactivate_company(
    company_id: UUID,
    _: User = Depends(current_platform_admin),
) -> CompanySnapshot:
    company = deactivate_company_in_db(company_id)
    refreshed_company, user_rows = get_company_in_db(company.id)
    return CompanySnapshot.from_model(
        refreshed_company, user_count=_active_user_count(user_rows)
    )


@router.post("/{company_id}/activate")
def activate_company(
    company_id: UUID,
    _: User = Depends(current_platform_admin),
) -> CompanySnapshot:
    company = activate_company_in_db(company_id)
    refreshed_company, user_rows = get_company_in_db(company.id)
    return CompanySnapshot.from_model(
        refreshed_company, user_count=_active_user_count(user_rows)
    )


@router.post("/{company_id}/invite-admin")
def invite_admin(
    company_id: UUID,
    invite_request: CompanyInviteAdminRequest,
    _: User = Depends(current_platform_admin),
) -> CompanyDetail:
    company, user_rows = invite_company_admin(company_id, invite_request.email)
    return _company_detail_from_rows(company, user_rows)
