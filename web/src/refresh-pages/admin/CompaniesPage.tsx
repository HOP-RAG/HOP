"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import landingStyles from "@/app/Landing.module.css";
import AccessRestrictedPage from "@/components/errorPages/AccessRestrictedPage";
import { toast } from "@/hooks/useToast";
import * as SettingsLayouts from "@/layouts/settings-layouts";
import { ADMIN_ROUTES } from "@/lib/admin-routes";
import { humanReadableFormatShort, timeAgo } from "@/lib/time";
import { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useUser } from "@/providers/UserProvider";
import Tag from "@/refresh-components/buttons/Tag";
import Card from "@/refresh-components/cards/Card";
import InputTypeIn from "@/refresh-components/inputs/InputTypeIn";
import Switch from "@/refresh-components/inputs/Switch";
import SimpleLoader from "@/refresh-components/loaders/SimpleLoader";
import Separator from "@/refresh-components/Separator";
import DataTable from "@/refresh-components/table/DataTable";
import { createTableColumns } from "@/refresh-components/table/columns";
import Text from "@/refresh-components/texts/Text";
import SvgNoResult from "@opal/illustrations/no-result";
import { Button } from "@opal/components";
import { Disabled } from "@opal/core";
import {
  SvgEdit,
  SvgGlobe,
  SvgOrganization,
  SvgPlusCircle,
  SvgUser,
  SvgUserPlus,
  SvgUsers,
} from "@opal/icons";
import { Content, IllustrationContent } from "@opal/layouts";
import type {
  CompanyCreatePayload,
  CompanyDetail,
  CompanySnapshot,
  CompanyUpdatePayload,
  CompanyUserSnapshot,
  PaginatedResponse,
} from "./CompaniesPage/interfaces";
import {
  activateCompany,
  COMPANIES_FETCH_URL,
  createCompany,
  deactivateCompany,
  fetchCompanies,
  fetchCompany,
  inviteCompanyAdmin,
  updateCompany,
} from "./CompaniesPage/svc";

const route = ADMIN_ROUTES.COMPANIES;
const tc = createTableColumns<CompanySnapshot>();

function metricValue(value: number) {
  return value.toLocaleString();
}

function normalizeOptionalString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function roleLabel(role: UserRole | null) {
  if (!role) {
    return "Pending";
  }

  switch (role) {
    case UserRole.ADMIN:
      return "Admin";
    case UserRole.CURATOR:
      return "Curator";
    case UserRole.GLOBAL_CURATOR:
      return "Global Curator";
    case UserRole.BASIC:
      return "Basic";
    case UserRole.LIMITED:
      return "Limited";
    default:
      return role.replaceAll("_", " ");
  }
}

function userStatusLabel(user: CompanyUserSnapshot) {
  if (!user.mapping_active) {
    return "Removed";
  }
  if (!user.registered) {
    return "Invited";
  }
  return user.is_active ? "Active" : "Disabled";
}

function CompanyStatusTag({ isActive }: { isActive: boolean }) {
  return (
    <Tag
      label={isActive ? "Active" : "Inactive"}
      className={cn(
        "border",
        isActive
          ? "border-status-success-01 bg-status-success-01"
          : "border-status-warning-01 bg-status-warning-01"
      )}
    />
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Text as="p" mainUiAction text04>
          {label}
        </Text>
        {hint ? (
          <Text as="p" secondaryBody text03>
            {hint}
          </Text>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-16 border border-[color:var(--landing-border)] bg-[color:var(--landing-card-solid)] p-4 shadow-[0_18px_38px_-28px_rgba(51,108,250,0.42)]">
      <Text
        as="p"
        className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--landing-accent-strong)]"
      >
        {label}
      </Text>
      <Text
        as="p"
        className="pt-3 text-[2rem] font-semibold tracking-[-0.06em] text-[var(--landing-text)]"
      >
        {value}
      </Text>
      <Text
        as="p"
        className="pt-1 text-sm leading-6 text-[var(--landing-muted)]"
      >
        {detail}
      </Text>
    </div>
  );
}

function buildColumns(onSelect: (companyId: string) => void) {
  return [
    tc.qualifier({
      content: "avatar-user",
      getInitials: (company) => company?.name.slice(0, 2).toUpperCase() ?? "",
      selectable: false,
    }),
    tc.column("name", {
      header: "Company",
      weight: 32,
      minWidth: 210,
      cell: (_value, row) => (
        <Content
          sizePreset="main-ui"
          variant="section"
          title={row.name}
          description={row.domain ?? row.tenant_id}
        />
      ),
    }),
    tc.column("user_count", {
      header: "Users",
      weight: 10,
      minWidth: 90,
      cell: (value) => (
        <Text as="span" mainUiAction text04>
          {metricValue(value)}
        </Text>
      ),
    }),
    tc.column("is_active", {
      header: "Status",
      weight: 12,
      minWidth: 110,
      cell: (value) => <CompanyStatusTag isActive={value} />,
    }),
    tc.column("created_at", {
      header: "Created",
      weight: 18,
      minWidth: 160,
      cell: (value, row) => (
        <div className="flex flex-col">
          <Text as="span" mainUiBody text03>
            {humanReadableFormatShort(value)}
          </Text>
          <Text as="span" secondaryBody text03>
            by {row.created_by}
          </Text>
        </div>
      ),
    }),
    tc.actions({
      cell: (row) => (
        <Button size="sm" prominence="tertiary" onClick={() => onSelect(row.id)}>
          View
        </Button>
      ),
    }),
  ];
}

function CreateCompanyCard({
  onCreate,
  isSubmitting,
}: {
  onCreate: (payload: CompanyCreatePayload) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  const canSubmit = name.trim() && adminEmail.trim();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || isSubmitting) {
      return;
    }

    await onCreate({
      name: name.trim(),
      domain: normalizeOptionalString(domain),
      admin_email: adminEmail.trim(),
    });

    setName("");
    setDomain("");
    setAdminEmail("");
  }

  return (
    <div className="rounded-20 border border-[color:var(--landing-border)] bg-[color:var(--landing-card)] p-5 shadow-[0_26px_60px_-36px_rgba(33,64,120,0.52)] backdrop-blur-sm">
      <div className="rounded-16 border border-[color:var(--landing-border)] bg-[image:var(--landing-card-tint)] p-5">
        <div className="flex flex-col gap-2">
          <div className="inline-flex w-fit rounded-full border border-[color:var(--landing-border)] bg-[var(--landing-accent-pale)] px-3 py-1">
            <Text
              as="span"
              className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--landing-accent-strong)]"
            >
              New company
            </Text>
          </div>
          <Text
            as="p"
            className="text-[1.4rem] font-semibold tracking-[-0.04em] text-[var(--landing-text)]"
          >
            Provision a tenant and seed its first admin in one step.
          </Text>
          <Text
            as="p"
            className="text-sm leading-7 text-[var(--landing-muted)]"
          >
            This uses the Phase 3 company APIs, so schema creation, migrations,
            tenant setup, and the first invitation all happen from the same
            workflow.
          </Text>
        </div>

        <form className="flex flex-col gap-4 pt-6" onSubmit={handleSubmit}>
          <FormField label="Company name">
            <InputTypeIn
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Acme Holdings"
            />
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Domain"
              hint="Optional now, ready for future domain-based auto-join."
            >
              <InputTypeIn
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                placeholder="acme.com"
              />
            </FormField>

            <FormField label="Initial admin email">
              <InputTypeIn
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
                placeholder="bob@acme.com"
                type="email"
              />
            </FormField>
          </div>

          <div className="flex justify-end">
            <Disabled disabled={!canSubmit || isSubmitting}>
              <Button type="submit" icon={SvgPlusCircle}>
                {isSubmitting ? "Creating..." : "Create company"}
              </Button>
            </Disabled>
          </div>
        </form>
      </div>
    </div>
  );
}

function CompanyUsersList({ users }: { users: CompanyUserSnapshot[] }) {
  if (!users.length) {
    return (
      <div className="rounded-16 border border-dashed border-border-02 bg-background-neutral-01 p-5">
        <Text as="p" secondaryBody text03>
          No invited users yet. Invite a customer admin to start the company
          onboarding flow.
        </Text>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {users.map((user) => (
        <div
          key={`${user.email}-${user.mapping_active}`}
          className="flex flex-col gap-3 rounded-16 border border-border-01 bg-background-neutral-00 p-4 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex flex-col gap-1">
            <Text as="p" mainUiAction text04>
              {user.email}
            </Text>
            <Text as="p" secondaryBody text03>
              {user.registered
                ? "Registered in tenant"
                : "Invitation pending registration"}
            </Text>
          </div>
          <div className="flex flex-wrap gap-2">
            <Tag label={roleLabel(user.role)} />
            <Tag label={userStatusLabel(user)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function CompanyDetailPanel({
  company,
  isLoading,
  error,
  onSaveDetails,
  onInviteAdmin,
  onToggleActive,
  isMutating,
}: {
  company: CompanyDetail | undefined;
  isLoading: boolean;
  error: Error | undefined;
  onSaveDetails: (payload: CompanyUpdatePayload) => Promise<void>;
  onInviteAdmin: (email: string) => Promise<void>;
  onToggleActive: (nextActive: boolean) => Promise<void>;
  isMutating: boolean;
}) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    setName(company?.name ?? "");
    setDomain(company?.domain ?? "");
    setInviteEmail("");
  }, [company?.id, company?.name, company?.domain]);

  if (isLoading) {
    return (
      <div className="flex min-h-[18rem] items-center justify-center rounded-20 border border-border-01 bg-background-neutral-00">
        <SimpleLoader className="h-6 w-6" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-20 border border-status-error-01 bg-status-error-01 p-6">
        <Text as="p" mainUiAction className="text-status-error-05">
          Failed to load company details.
        </Text>
        <Text as="p" secondaryBody text03 className="pt-2">
          Try selecting the company again or refresh the page.
        </Text>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="rounded-20 border border-dashed border-border-02 bg-background-neutral-01 p-8">
        <Text as="p" headingH3>
          No company selected
        </Text>
        <Text as="p" secondaryBody text03 className="pt-3">
          Choose a company from the table to inspect users, update metadata, or
          invite another customer admin.
        </Text>
      </div>
    );
  }

  const currentCompany = company;
  const normalizedDomain = normalizeOptionalString(domain);
  const originalDomain = currentCompany.domain ?? null;
  const hasChanges =
    name.trim() !== currentCompany.name || normalizedDomain !== originalDomain;

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasChanges || isMutating || !name.trim()) {
      return;
    }

    await onSaveDetails({
      name: name.trim(),
      domain: normalizedDomain,
    });
  }

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inviteEmail.trim() || isMutating) {
      return;
    }

    await onInviteAdmin(inviteEmail.trim());
    setInviteEmail("");
  }

  async function handleToggle(nextActive: boolean) {
    if (nextActive === currentCompany.is_active || isMutating) {
      return;
    }

    const approved = window.confirm(
      nextActive
        ? `Activate ${currentCompany.name}? Users mapped to this company will be able to log in again.`
        : `Deactivate ${currentCompany.name}? Existing mappings stay in place, but login and registration will be blocked.`
    );

    if (!approved) {
      return;
    }

    await onToggleActive(nextActive);
  }

  return (
    <div className="flex flex-col gap-6 rounded-20 border border-border-01 bg-background-neutral-00 p-6 shadow-[0_18px_45px_-36px_var(--mask-04)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Text as="p" headingH3>
              {currentCompany.name}
            </Text>
            <CompanyStatusTag isActive={currentCompany.is_active} />
          </div>
          <Text as="p" secondaryBody text03>
            Tenant schema: {currentCompany.tenant_id}
          </Text>
          <Text as="p" secondaryBody text03>
            Created {humanReadableFormatShort(currentCompany.created_at)} by{" "}
            {currentCompany.created_by}
          </Text>
        </div>

        <div className="flex items-center gap-3 rounded-full border border-border-01 bg-background-neutral-01 px-4 py-2">
          <Text as="span" mainUiBody text03>
            Company access
          </Text>
          <Switch
            checked={currentCompany.is_active}
            onCheckedChange={handleToggle}
            disabled={isMutating}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-16 border border-border-01 bg-background-neutral-01 p-4">
          <Text as="p" secondaryBody text03>
            Managed users
          </Text>
          <Text as="p" headingH3 className="pt-2">
            {metricValue(currentCompany.user_count)}
          </Text>
        </div>
        <div className="rounded-16 border border-border-01 bg-background-neutral-01 p-4">
          <Text as="p" secondaryBody text03>
            Last updated
          </Text>
          <Text as="p" headingH3 className="pt-2">
            {timeAgo(currentCompany.updated_at) ?? "Just now"}
          </Text>
        </div>
        <div className="rounded-16 border border-border-01 bg-background-neutral-01 p-4">
          <Text as="p" secondaryBody text03>
            Join domain
          </Text>
          <Text as="p" headingH3 className="pt-2">
            {currentCompany.domain ?? "Not set"}
          </Text>
        </div>
      </div>

      <Separator noPadding />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form className="flex flex-col gap-4" onSubmit={handleSave}>
          <div className="flex items-center gap-2">
            <SvgEdit className="h-4 w-4 stroke-text-03" />
            <Text as="p" mainUiAction text04>
              Company metadata
            </Text>
          </div>

          <FormField label="Display name">
            <InputTypeIn
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Company display name"
            />
          </FormField>

          <FormField
            label="Domain"
            hint="Optional. Keep it blank if you are not using domain-based matching yet."
          >
            <InputTypeIn
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder="company.com"
            />
          </FormField>

          <div className="flex justify-end">
            <Disabled disabled={!hasChanges || isMutating}>
              <Button type="submit">
                {isMutating ? "Saving..." : "Save changes"}
              </Button>
            </Disabled>
          </div>
        </form>

        <form className="flex flex-col gap-4" onSubmit={handleInvite}>
          <div className="flex items-center gap-2">
            <SvgUserPlus className="h-4 w-4 stroke-text-03" />
            <Text as="p" mainUiAction text04>
              Invite customer admin
            </Text>
          </div>

          <FormField
            label="Admin email"
            hint="If the user already exists in this tenant, they will be promoted to Admin automatically."
          >
            <InputTypeIn
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="alice@company.com"
            />
          </FormField>

          <div className="flex justify-end">
            <Disabled
              disabled={
                !inviteEmail.trim() || isMutating || !currentCompany.is_active
              }
            >
              <Button type="submit" icon={SvgUserPlus}>
                {isMutating ? "Sending..." : "Invite admin"}
              </Button>
            </Disabled>
          </div>

          {!currentCompany.is_active ? (
            <Text as="p" secondaryBody className="text-status-warning-05">
              Reactivate this company before sending new admin invitations.
            </Text>
          ) : null}
        </form>
      </div>

      <Separator noPadding />

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <SvgUsers className="h-4 w-4 stroke-text-03" />
          <Text as="p" mainUiAction text04>
            Users in company
          </Text>
        </div>
        <CompanyUsersList users={currentCompany.users} />
      </div>
    </div>
  );
}

export default function CompaniesPage() {
  const { isCloudSuperuser } = useUser();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);
  const [isDetailSubmitting, setIsDetailSubmitting] = useState(false);

  const {
    data: companiesResponse,
    isLoading: isCompaniesLoading,
    error: companiesError,
    mutate: mutateCompanies,
  } = useSWR<PaginatedResponse<CompanySnapshot>>(
    isCloudSuperuser ? COMPANIES_FETCH_URL : null,
    fetchCompanies
  );

  const companies = companiesResponse?.items ?? [];
  const selectedCompanyKey = selectedCompanyId
    ? `/api/admin/companies/${selectedCompanyId}`
    : null;

  const {
    data: selectedCompany,
    isLoading: isSelectedCompanyLoading,
    error: selectedCompanyError,
  } = useSWR<CompanyDetail>(
    isCloudSuperuser ? selectedCompanyKey : null,
    () => fetchCompany(selectedCompanyId as string)
  );

  useEffect(() => {
    const firstCompany = companies[0];

    if (!companies.length) {
      setSelectedCompanyId(null);
      return;
    }

    if (!selectedCompanyId) {
      setSelectedCompanyId(firstCompany ? firstCompany.id : null);
      return;
    }

    const selectedStillExists = companies.some(
      (company) => company.id === selectedCompanyId
    );
    if (!selectedStillExists) {
      setSelectedCompanyId(firstCompany ? firstCompany.id : null);
    }
  }, [companies, selectedCompanyId]);

  const columns = useMemo(
    () => buildColumns((companyId) => setSelectedCompanyId(companyId)),
    []
  );

  const companyMetrics = useMemo(() => {
    const totalCompanies = companies.length;
    const activeCompanies = companies.filter((company) => company.is_active);
    const inactiveCompanies = totalCompanies - activeCompanies.length;
    const totalUsers = companies.reduce(
      (runningTotal, company) => runningTotal + company.user_count,
      0
    );

    return {
      totalCompanies,
      activeCompanies: activeCompanies.length,
      inactiveCompanies,
      totalUsers,
    };
  }, [companies]);

  if (!isCloudSuperuser) {
    return <AccessRestrictedPage />;
  }

  async function refreshCompaniesAndDetail(companyId: string | null) {
    await mutateCompanies();
    if (companyId) {
      await globalMutate(`/api/admin/companies/${companyId}`);
    }
  }

  async function handleCreateCompany(payload: CompanyCreatePayload) {
    setIsCreateSubmitting(true);
    try {
      const company = await createCompany(payload);
      setSelectedCompanyId(company.id);
      await globalMutate(`/api/admin/companies/${company.id}`, company, {
        revalidate: false,
      });
      await mutateCompanies();
      toast.success(`${company.name} is ready for onboarding`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create company"
      );
    } finally {
      setIsCreateSubmitting(false);
    }
  }

  async function handleSaveCompany(payload: CompanyUpdatePayload) {
    if (!selectedCompanyId) {
      return;
    }

    setIsDetailSubmitting(true);
    try {
      await updateCompany(selectedCompanyId, payload);
      await refreshCompaniesAndDetail(selectedCompanyId);
      toast.success("Company details updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update company"
      );
    } finally {
      setIsDetailSubmitting(false);
    }
  }

  async function handleInviteAdmin(email: string) {
    if (!selectedCompanyId) {
      return;
    }

    setIsDetailSubmitting(true);
    try {
      const updatedCompany = await inviteCompanyAdmin(selectedCompanyId, email);
      await globalMutate(
        `/api/admin/companies/${selectedCompanyId}`,
        updatedCompany,
        { revalidate: false }
      );
      await mutateCompanies();
      toast.success("Admin invitation sent");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to invite admin"
      );
    } finally {
      setIsDetailSubmitting(false);
    }
  }

  async function handleToggleCompany(nextActive: boolean) {
    if (!selectedCompanyId) {
      return;
    }

    setIsDetailSubmitting(true);
    try {
      if (nextActive) {
        await activateCompany(selectedCompanyId);
      } else {
        await deactivateCompany(selectedCompanyId);
      }

      await refreshCompaniesAndDetail(selectedCompanyId);
      toast.success(
        nextActive ? "Company reactivated" : "Company deactivated"
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update company status"
      );
    } finally {
      setIsDetailSubmitting(false);
    }
  }

  return (
    <SettingsLayouts.Root width="full">
      <SettingsLayouts.Header
        title={route.title}
        icon={route.icon}
        description="Create, inspect, and control tenant companies from the platform admin console."
        separator
      />

      <SettingsLayouts.Body>
        <section
          className={cn(
            landingStyles.landingFuture,
            "relative overflow-hidden rounded-[1.75rem] border border-[color:var(--landing-border)] bg-[color:var(--landing-surface)] shadow-[0_38px_90px_-54px_rgba(33,64,120,0.55)]"
          )}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,_var(--landing-bg-top),_transparent_72%)]" />
          <div className="pointer-events-none absolute right-[-4rem] top-[-3rem] h-48 w-48 rounded-full bg-[radial-gradient(circle,_var(--landing-bg-spot),_transparent_70%)]" />

          <div className="relative grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
            <div className="flex flex-col gap-5">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--landing-border)] bg-[var(--landing-accent-pale)] px-4 py-2">
                <SvgOrganization className="h-4 w-4 stroke-[var(--landing-accent-strong)]" />
                <Text
                  as="span"
                  className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--landing-accent-strong)]"
                >
                  Platform admin workspace
                </Text>
              </div>

              <div className="max-w-3xl">
                <Text
                  as="p"
                  className="text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[0.95] tracking-[-0.07em] text-[var(--landing-text)]"
                >
                  Run tenant creation, activation, and admin invitations from a
                  single control surface.
                </Text>
                <Text
                  as="p"
                  className="max-w-2xl pt-5 text-[1rem] leading-8 text-[var(--landing-muted)]"
                >
                  The page is tuned for self-hosted multi-tenant operations: it
                  speaks directly to the company APIs from Phase 3 and keeps the
                  platform-only navigation hidden from customer admins.
                </Text>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-16 border border-[color:var(--landing-border)] bg-[color:var(--landing-card)] p-4">
                  <div className="flex items-center gap-2">
                    <SvgGlobe className="h-4 w-4 stroke-[var(--landing-accent-strong)]" />
                    <Text as="p" mainUiAction className="text-[var(--landing-text)]">
                      Domain-aware by design
                    </Text>
                  </div>
                  <Text
                    as="p"
                    className="pt-3 text-sm leading-7 text-[var(--landing-muted)]"
                  >
                    Keep domains optional today, but ready for the auto-join
                    model when you decide to enable it.
                  </Text>
                </div>

                <div className="rounded-16 border border-[color:var(--landing-border)] bg-[color:var(--landing-card)] p-4">
                  <div className="flex items-center gap-2">
                    <SvgUser className="h-4 w-4 stroke-[var(--landing-accent-strong)]" />
                    <Text as="p" mainUiAction className="text-[var(--landing-text)]">
                      Invite-first onboarding
                    </Text>
                  </div>
                  <Text
                    as="p"
                    className="pt-3 text-sm leading-7 text-[var(--landing-muted)]"
                  >
                    Every company starts invite-only, which matches the secure
                    registration flow already wired in the backend.
                  </Text>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Companies"
                value={metricValue(companyMetrics.totalCompanies)}
                detail="Total tenant companies under platform management."
              />
              <MetricCard
                label="Active"
                value={metricValue(companyMetrics.activeCompanies)}
                detail="Companies currently allowed to onboard and log in."
              />
              <MetricCard
                label="Inactive"
                value={metricValue(companyMetrics.inactiveCompanies)}
                detail="Soft-disabled companies kept intact for recovery."
              />
              <MetricCard
                label="Users mapped"
                value={metricValue(companyMetrics.totalUsers)}
                detail="Active user mappings across every company."
              />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <CreateCompanyCard
            onCreate={handleCreateCompany}
            isSubmitting={isCreateSubmitting}
          />

          <Card className="overflow-hidden" padding={0} gap={0}>
            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-2">
                <SvgUsers className="h-4 w-4 stroke-text-03" />
                <Text as="p" headingH3>
                  Company roster
                </Text>
              </div>
              <Text as="p" secondaryBody text03>
                Select a company to inspect users, adjust metadata, or change
                activation state.
              </Text>
              <InputTypeIn
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search companies..."
                leftSearchIcon
              />
            </div>

            {isCompaniesLoading ? (
              <div className="flex justify-center py-12">
                <SimpleLoader className="h-6 w-6" />
              </div>
            ) : companiesError ? (
              <div className="p-6">
                <Text as="p" secondaryBody className="text-status-error-05">
                  Failed to load companies. Refresh the page and try again.
                </Text>
              </div>
            ) : (
              <DataTable
                data={companies}
                columns={columns}
                getRowId={(company) => company?.id ?? ""}
                onRowClick={(company) => {
                  if (company) {
                    setSelectedCompanyId(company.id);
                  }
                }}
                pageSize={8}
                searchTerm={searchTerm}
                footer={{ mode: "summary" }}
                emptyState={
                  <IllustrationContent
                    illustration={SvgNoResult}
                    title="No companies yet"
                    description="Create the first company to provision a tenant and start the invitation flow."
                  />
                }
              />
            )}
          </Card>
        </div>

        <CompanyDetailPanel
          company={selectedCompany}
          isLoading={Boolean(selectedCompanyKey) && isSelectedCompanyLoading}
          error={selectedCompanyError as Error | undefined}
          onSaveDetails={handleSaveCompany}
          onInviteAdmin={handleInviteAdmin}
          onToggleActive={handleToggleCompany}
          isMutating={isDetailSubmitting}
        />
      </SettingsLayouts.Body>
    </SettingsLayouts.Root>
  );
}
