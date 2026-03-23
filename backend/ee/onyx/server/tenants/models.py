from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from onyx.auth.schemas import UserRole
from onyx.db.models import Company
from onyx.server.settings.models import ApplicationStatus


class CheckoutSessionCreationRequest(BaseModel):
    quantity: int


class CreateTenantRequest(BaseModel):
    tenant_id: str
    initial_admin_email: str


class ProductGatingRequest(BaseModel):
    tenant_id: str
    application_status: ApplicationStatus


class ProductGatingFullSyncRequest(BaseModel):
    gated_tenant_ids: list[str]


class SubscriptionStatusResponse(BaseModel):
    subscribed: bool


class BillingInformation(BaseModel):
    stripe_subscription_id: str
    status: str
    current_period_start: datetime
    current_period_end: datetime
    number_of_seats: int
    cancel_at_period_end: bool
    canceled_at: datetime | None
    trial_start: datetime | None
    trial_end: datetime | None
    seats: int
    payment_method_enabled: bool


class CreateCheckoutSessionRequest(BaseModel):
    billing_period: Literal["monthly", "annual"] = "monthly"
    seats: int | None = None
    email: str | None = None


class CheckoutSessionCreationResponse(BaseModel):
    id: str


class ImpersonateRequest(BaseModel):
    email: str


class TenantCreationPayload(BaseModel):
    tenant_id: str
    email: str
    referral_source: str | None = None


class TenantDeletionPayload(BaseModel):
    tenant_id: str
    email: str


class AnonymousUserPath(BaseModel):
    anonymous_user_path: str | None


class ProductGatingResponse(BaseModel):
    updated: bool
    error: str | None


class SubscriptionSessionResponse(BaseModel):
    sessionId: str


class CreateSubscriptionSessionRequest(BaseModel):
    """Request to create a subscription checkout session."""

    billing_period: Literal["monthly", "annual"] = "monthly"


class TenantByDomainResponse(BaseModel):
    tenant_id: str
    number_of_users: int
    creator_email: str


class TenantByDomainRequest(BaseModel):
    email: str


class RequestInviteRequest(BaseModel):
    tenant_id: str


class RequestInviteResponse(BaseModel):
    success: bool
    message: str


class PendingUserSnapshot(BaseModel):
    email: str


class ApproveUserRequest(BaseModel):
    email: str


class StripePublishableKeyResponse(BaseModel):
    publishable_key: str


class CompanyCreateRequest(BaseModel):
    name: str
    admin_email: str
    domain: str | None = None


class CompanyUpdateRequest(BaseModel):
    name: str | None = None
    domain: str | None = None


class CompanyInviteAdminRequest(BaseModel):
    email: str


class CompanyUserSnapshot(BaseModel):
    email: str
    mapping_active: bool
    registered: bool
    role: UserRole | None = None
    is_active: bool | None = None


class CompanySnapshot(BaseModel):
    id: UUID
    tenant_id: str
    name: str
    domain: str | None
    is_active: bool
    created_by: str
    created_at: datetime
    updated_at: datetime
    user_count: int = 0

    @classmethod
    def from_model(
        cls, company: Company, *, user_count: int = 0
    ) -> "CompanySnapshot":
        return cls(
            id=company.id,
            tenant_id=company.tenant_id,
            name=company.name,
            domain=company.domain,
            is_active=company.is_active,
            created_by=company.created_by,
            created_at=company.created_at,
            updated_at=company.updated_at,
            user_count=user_count,
        )


class CompanyDetail(CompanySnapshot):
    users: list[CompanyUserSnapshot]
