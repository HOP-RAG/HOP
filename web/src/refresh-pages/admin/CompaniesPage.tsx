"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import landingStyles from "@/app/Landing.module.css";
import AccessRestrictedPage from "@/components/errorPages/AccessRestrictedPage";
import { toast } from "@/hooks/useToast";
import * as SettingsLayouts from "@/layouts/settings-layouts";
import { ADMIN_ROUTES, getAdminRouteCopy } from "@/lib/admin-routes";
import { TranslateFn } from "@/lib/i18n/app-language";
import { humanReadableFormatShort, timeAgo } from "@/lib/time";
import { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppLanguage } from "@/providers/AppLanguageProvider";
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

function roleLabel(role: UserRole | null, t: TranslateFn) {
  if (!role) {
    return t("companies.role.pending");
  }

  switch (role) {
    case UserRole.ADMIN:
      return t("companies.role.admin");
    case UserRole.CURATOR:
      return t("companies.role.curator");
    case UserRole.GLOBAL_CURATOR:
      return t("companies.role.globalCurator");
    case UserRole.BASIC:
      return t("companies.role.basic");
    case UserRole.LIMITED:
      return t("companies.role.limited");
    default:
      return role.replaceAll("_", " ");
  }
}

function userStatusLabel(user: CompanyUserSnapshot, t: TranslateFn) {
  if (!user.mapping_active) {
    return t("common.status.removed");
  }
  if (!user.registered) {
    return t("common.status.invited");
  }
  return user.is_active
    ? t("common.status.active")
    : t("common.status.disabled");
}

function CompanyStatusTag({ isActive }: { isActive: boolean }) {
  const { t } = useAppLanguage();

  return (
    <Tag
      label={isActive ? t("common.status.active") : t("common.status.inactive")}
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

function buildColumns(onSelect: (companyId: string) => void, t: TranslateFn) {
  return [
    tc.qualifier({
      content: "avatar-user",
      getInitials: (company) => company?.name.slice(0, 2).toUpperCase() ?? "",
      selectable: false,
    }),
    tc.column("name", {
      header: t("companies.columns.company"),
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
      header: t("companies.columns.users"),
      weight: 10,
      minWidth: 90,
      cell: (value) => (
        <Text as="span" mainUiAction text04>
          {metricValue(value)}
        </Text>
      ),
    }),
    tc.column("is_active", {
      header: t("companies.columns.status"),
      weight: 12,
      minWidth: 110,
      cell: (value) => <CompanyStatusTag isActive={value} />,
    }),
    tc.column("created_at", {
      header: t("companies.columns.created"),
      weight: 18,
      minWidth: 160,
      cell: (value, row) => (
        <div className="flex flex-col">
          <Text as="span" mainUiBody text03>
            {humanReadableFormatShort(value)}
          </Text>
          <Text as="span" secondaryBody text03>
            {t("companies.columns.createdBy", {
              createdBy: row.created_by,
            })}
          </Text>
        </div>
      ),
    }),
    tc.actions({
      cell: (row) => (
        <Button
          size="sm"
          prominence="tertiary"
          onClick={() => onSelect(row.id)}
        >
          {t("companies.buttons.view")}
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
  const { t } = useAppLanguage();
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
    <Card padding={0} gap={0}>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <SvgPlusCircle className="h-4 w-4 stroke-text-03" />
            <Text mainAction text01>
              {t("companies.create.title")}
            </Text>
          </div>
          <Text secondaryBody text03>
            {t("companies.create.description")}
          </Text>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <FormField label={t("companies.fields.companyName")}>
            <InputTypeIn
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("companies.placeholders.companyName")}
            />
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label={t("companies.fields.domain")}
              hint={t("companies.fields.domainHint")}
            >
              <InputTypeIn
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                placeholder={t("companies.placeholders.domain")}
              />
            </FormField>

            <FormField label={t("companies.fields.initialAdminEmail")}>
              <InputTypeIn
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
                placeholder={t("companies.placeholders.adminEmail")}
                type="email"
              />
            </FormField>
          </div>

          <div className="flex justify-end">
            <Disabled disabled={!canSubmit || isSubmitting}>
              <Button type="submit" icon={SvgPlusCircle}>
                {isSubmitting
                  ? t("companies.buttons.creating")
                  : t("companies.buttons.create")}
              </Button>
            </Disabled>
          </div>
        </form>
      </div>
    </Card>
  );
}

function CompanyUsersList({ users }: { users: CompanyUserSnapshot[] }) {
  const { t } = useAppLanguage();

  if (!users.length) {
    return (
      <div className="rounded-16 border border-dashed border-border-02 bg-background-neutral-01 p-5">
        <Text as="p" secondaryBody text03>
          {t("companies.users.empty")}
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
                ? t("companies.users.registered")
                : t("companies.users.pendingRegistration")}
            </Text>
          </div>
          <div className="flex flex-wrap gap-2">
            <Tag label={roleLabel(user.role, t)} />
            <Tag label={userStatusLabel(user, t)} />
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
  const { t } = useAppLanguage();
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
          {t("companies.detail.errorTitle")}
        </Text>
        <Text as="p" secondaryBody text03 className="pt-2">
          {t("companies.detail.errorDescription")}
        </Text>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="rounded-20 border border-dashed border-border-02 bg-background-neutral-01 p-8">
        <Text as="p" headingH3>
          {t("companies.detail.noneTitle")}
        </Text>
        <Text as="p" secondaryBody text03 className="pt-3">
          {t("companies.detail.noneDescription")}
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
        ? t("companies.confirm.activate", {
            name: currentCompany.name,
          })
        : t("companies.confirm.deactivate", {
            name: currentCompany.name,
          })
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
            {t("companies.detail.tenantSchema", {
              tenantId: currentCompany.tenant_id,
            })}
          </Text>
          <Text as="p" secondaryBody text03>
            {t("companies.detail.createdBy", {
              date: humanReadableFormatShort(currentCompany.created_at),
              createdBy: currentCompany.created_by,
            })}
          </Text>
        </div>

        <div className="flex items-center gap-3 rounded-full border border-border-01 bg-background-neutral-01 px-4 py-2">
          <Text as="span" mainUiBody text03>
            {t("companies.detail.companyAccess")}
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
            {t("companies.detail.managedUsers")}
          </Text>
          <Text as="p" headingH3 className="pt-2">
            {metricValue(currentCompany.user_count)}
          </Text>
        </div>
        <div className="rounded-16 border border-border-01 bg-background-neutral-01 p-4">
          <Text as="p" secondaryBody text03>
            {t("companies.detail.lastUpdated")}
          </Text>
          <Text as="p" headingH3 className="pt-2">
            {timeAgo(currentCompany.updated_at) ?? t("common.justNow")}
          </Text>
        </div>
        <div className="rounded-16 border border-border-01 bg-background-neutral-01 p-4">
          <Text as="p" secondaryBody text03>
            {t("companies.detail.joinDomain")}
          </Text>
          <Text as="p" headingH3 className="pt-2">
            {currentCompany.domain ?? t("companies.detail.notSet")}
          </Text>
        </div>
      </div>

      <Separator noPadding />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form className="flex flex-col gap-4" onSubmit={handleSave}>
          <div className="flex items-center gap-2">
            <SvgEdit className="h-4 w-4 stroke-text-03" />
            <Text as="p" mainUiAction text04>
              {t("companies.detail.metadata")}
            </Text>
          </div>

          <FormField label={t("companies.fields.displayName")}>
            <InputTypeIn
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("companies.placeholders.displayName")}
            />
          </FormField>

          <FormField
            label={t("companies.fields.domain")}
            hint={t("companies.fields.domainEditHint")}
          >
            <InputTypeIn
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder={t("companies.placeholders.domain")}
            />
          </FormField>

          <div className="flex justify-end">
            <Disabled disabled={!hasChanges || isMutating}>
              <Button type="submit">
                {isMutating
                  ? t("companies.buttons.saving")
                  : t("companies.buttons.save")}
              </Button>
            </Disabled>
          </div>
        </form>

        <form className="flex flex-col gap-4" onSubmit={handleInvite}>
          <div className="flex items-center gap-2">
            <SvgUserPlus className="h-4 w-4 stroke-text-03" />
            <Text as="p" mainUiAction text04>
              {t("companies.detail.inviteCustomerAdmin")}
            </Text>
          </div>

          <FormField
            label={t("companies.fields.adminEmail")}
            hint={t("companies.fields.adminEmailHint")}
          >
            <InputTypeIn
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder={t("companies.placeholders.inviteEmail")}
            />
          </FormField>

          <div className="flex justify-end">
            <Disabled
              disabled={
                !inviteEmail.trim() || isMutating || !currentCompany.is_active
              }
            >
              <Button type="submit" icon={SvgUserPlus}>
                {isMutating
                  ? t("companies.buttons.sending")
                  : t("companies.buttons.inviteAdmin")}
              </Button>
            </Disabled>
          </div>

          {!currentCompany.is_active ? (
            <Text as="p" secondaryBody className="text-status-warning-05">
              {t("companies.detail.inactiveInviteWarning")}
            </Text>
          ) : null}
        </form>
      </div>

      <Separator noPadding />

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <SvgUsers className="h-4 w-4 stroke-text-03" />
          <Text as="p" mainUiAction text04>
            {t("companies.detail.usersInCompany")}
          </Text>
        </div>
        <CompanyUsersList users={currentCompany.users} />
      </div>
    </div>
  );
}

export default function CompaniesPage() {
  const { t } = useAppLanguage();
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
  } = useSWR<CompanyDetail>(isCloudSuperuser ? selectedCompanyKey : null, () =>
    fetchCompany(selectedCompanyId as string)
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

  const routeCopy = getAdminRouteCopy(route, t);
  const columns = useMemo(
    () => buildColumns((companyId) => setSelectedCompanyId(companyId), t),
    [t]
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
      toast.success(t("companies.toast.ready", { name: company.name }));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("companies.toast.createFailed")
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
      toast.success(t("companies.toast.updated"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("companies.toast.updateFailed")
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
      toast.success(t("companies.toast.invitationSent"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("companies.toast.invitationFailed")
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
        nextActive
          ? t("companies.toast.reactivated")
          : t("companies.toast.deactivated")
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("companies.toast.statusFailed")
      );
    } finally {
      setIsDetailSubmitting(false);
    }
  }

  return (
    <SettingsLayouts.Root width="full">
      <SettingsLayouts.Header
        title={routeCopy.title}
        icon={route.icon}
        description={t("companies.page.description")}
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
                  {t("companies.hero.badge")}
                </Text>
              </div>

              <div className="max-w-3xl">
                <Text
                  as="p"
                  className="text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[0.95] tracking-[-0.07em] text-[var(--landing-text)]"
                >
                  {t("companies.hero.title")}
                </Text>
                <Text
                  as="p"
                  className="max-w-2xl pt-5 text-[1rem] leading-8 text-[var(--landing-muted)]"
                >
                  {t("companies.hero.description")}
                </Text>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-16 border border-[color:var(--landing-border)] bg-[color:var(--landing-card)] p-4">
                  <div className="flex items-center gap-2">
                    <SvgGlobe className="h-4 w-4 stroke-[var(--landing-accent-strong)]" />
                    <Text
                      as="p"
                      mainUiAction
                      className="text-[var(--landing-text)]"
                    >
                      {t("companies.hero.domainAwareTitle")}
                    </Text>
                  </div>
                  <Text
                    as="p"
                    className="pt-3 text-sm leading-7 text-[var(--landing-muted)]"
                  >
                    {t("companies.hero.domainAwareDescription")}
                  </Text>
                </div>

                <div className="rounded-16 border border-[color:var(--landing-border)] bg-[color:var(--landing-card)] p-4">
                  <div className="flex items-center gap-2">
                    <SvgUser className="h-4 w-4 stroke-[var(--landing-accent-strong)]" />
                    <Text
                      as="p"
                      mainUiAction
                      className="text-[var(--landing-text)]"
                    >
                      {t("companies.hero.inviteFirstTitle")}
                    </Text>
                  </div>
                  <Text
                    as="p"
                    className="pt-3 text-sm leading-7 text-[var(--landing-muted)]"
                  >
                    {t("companies.hero.inviteFirstDescription")}
                  </Text>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label={t("companies.metrics.totalCompanies")}
                value={metricValue(companyMetrics.totalCompanies)}
                detail={t("companies.metrics.totalCompaniesDetail")}
              />
              <MetricCard
                label={t("companies.metrics.activeCompanies")}
                value={metricValue(companyMetrics.activeCompanies)}
                detail={t("companies.metrics.activeCompaniesDetail")}
              />
              <MetricCard
                label={t("companies.metrics.inactiveCompanies")}
                value={metricValue(companyMetrics.inactiveCompanies)}
                detail={t("companies.metrics.inactiveCompaniesDetail")}
              />
              <MetricCard
                label={t("companies.metrics.totalUsers")}
                value={metricValue(companyMetrics.totalUsers)}
                detail={t("companies.metrics.totalUsersDetail")}
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
                  {t("companies.roster.title")}
                </Text>
              </div>
              <Text as="p" secondaryBody text03>
                {t("companies.roster.description")}
              </Text>
              <InputTypeIn
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t("companies.roster.search")}
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
                  {t("companies.roster.error")}
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
                    title={t("companies.roster.emptyTitle")}
                    description={t("companies.roster.emptyDescription")}
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
