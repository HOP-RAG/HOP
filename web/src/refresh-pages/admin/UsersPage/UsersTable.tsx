"use client";

import { useMemo, useState } from "react";
import DataTable from "@/refresh-components/table/DataTable";
import { createTableColumns } from "@/refresh-components/table/columns";
import { Content } from "@opal/layouts";
import { Button } from "@opal/components";
import { SvgDownload } from "@opal/icons";
import SvgNoResult from "@opal/illustrations/no-result";
import { IllustrationContent } from "@opal/layouts";
import SimpleLoader from "@/refresh-components/loaders/SimpleLoader";
import Card from "@/refresh-components/cards/Card";
import { UserRole, UserStatus } from "@/lib/types";
import { timeAgo } from "@/lib/time";
import Text from "@/refresh-components/texts/Text";
import InputTypeIn from "@/refresh-components/inputs/InputTypeIn";
import { toast } from "@/hooks/useToast";
import useAdminUsers from "@/hooks/useAdminUsers";
import useGroups from "@/hooks/useGroups";
import { downloadUsersCsv } from "./svc";
import UserFilters from "./UserFilters";
import GroupsCell from "./GroupsCell";
import UserRowActions from "./UserRowActions";
import UserRoleCell from "./UserRoleCell";
import type {
  UserRow,
  GroupOption,
  StatusFilter,
  StatusCountMap,
} from "./interfaces";
import { getInitials } from "./utils";
import { useAppLanguage } from "@/providers/AppLanguageProvider";
import { TranslateFn } from "@/lib/i18n/app-language";

// ---------------------------------------------------------------------------
// Column renderers
// ---------------------------------------------------------------------------

function renderNameColumn(email: string, row: UserRow) {
  return (
    <Content
      sizePreset="main-ui"
      variant="section"
      title={row.personal_name ?? email}
      description={row.personal_name ? email : undefined}
    />
  );
}

function getLocalizedUserStatusLabel(value: UserStatus, t: TranslateFn) {
  switch (value) {
    case UserStatus.ACTIVE:
      return t("common.status.active");
    case UserStatus.INACTIVE:
      return t("common.status.inactive");
    case UserStatus.INVITED:
      return t("common.status.invited");
    case UserStatus.REQUESTED:
      return t("common.status.requested");
    default:
      return value;
  }
}

function renderStatusColumn(value: UserStatus, row: UserRow, t: TranslateFn) {
  return (
    <div className="flex flex-col">
      <Text as="span" mainUiBody text03>
        {getLocalizedUserStatusLabel(value, t)}
      </Text>
      {row.is_scim_synced && (
        <Text as="span" secondaryBody text03>
          {t("users.table.status.scimSynced")}
        </Text>
      )}
    </div>
  );
}

function renderLastUpdatedColumn(value: string | null) {
  return (
    <Text as="span" secondaryBody text03>
      {value ? timeAgo(value) ?? "\u2014" : "\u2014"}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const tc = createTableColumns<UserRow>();

function buildColumns(onMutate: () => void, t: TranslateFn) {
  return [
    tc.qualifier({
      content: "avatar-user",
      getInitials: (row) => getInitials(row.personal_name, row.email),
      selectable: false,
    }),
    tc.column("email", {
      header: t("users.table.columns.name"),
      weight: 22,
      minWidth: 140,
      cell: renderNameColumn,
    }),
    tc.column("groups", {
      header: t("users.table.columns.groups"),
      weight: 24,
      minWidth: 200,
      enableSorting: false,
      cell: (value, row) => (
        <GroupsCell groups={value} user={row} onMutate={onMutate} />
      ),
    }),
    tc.column("role", {
      header: t("users.table.columns.accountType"),
      weight: 16,
      minWidth: 180,
      cell: (_value, row) => <UserRoleCell user={row} onMutate={onMutate} />,
    }),
    tc.column("status", {
      header: t("users.table.columns.status"),
      weight: 14,
      minWidth: 100,
      cell: (value, row) => renderStatusColumn(value, row, t),
    }),
    tc.column("updated_at", {
      header: t("users.table.columns.lastUpdated"),
      weight: 14,
      minWidth: 100,
      cell: renderLastUpdatedColumn,
    }),
    tc.actions({
      cell: (row) => <UserRowActions user={row} onMutate={onMutate} />,
    }),
  ];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PAGE_SIZE = 8;

interface UsersTableProps {
  selectedStatuses: StatusFilter;
  onStatusesChange: (statuses: StatusFilter) => void;
  roleCounts: Record<string, number>;
  statusCounts: StatusCountMap;
}

export default function UsersTable({
  selectedStatuses,
  onStatusesChange,
  roleCounts,
  statusCounts,
}: UsersTableProps) {
  const { t } = useAppLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);

  const { data: allGroups } = useGroups();

  const groupOptions: GroupOption[] = useMemo(
    () =>
      (allGroups ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        memberCount: g.users.length,
      })),
    [allGroups]
  );

  const { users, isLoading, error, refresh } = useAdminUsers();

  const columns = useMemo(() => buildColumns(refresh, t), [refresh, t]);

  // Client-side filtering
  const filteredUsers = useMemo(() => {
    let result = users;

    if (selectedRoles.length > 0) {
      result = result.filter(
        (u) => u.role !== null && selectedRoles.includes(u.role)
      );
    }

    if (selectedStatuses.length > 0) {
      result = result.filter((u) => selectedStatuses.includes(u.status));
    }

    if (selectedGroups.length > 0) {
      result = result.filter((u) =>
        u.groups.some((g) => selectedGroups.includes(g.id))
      );
    }

    return result;
  }, [users, selectedRoles, selectedStatuses, selectedGroups]);

  if (isLoading) {
    return (
      <Card>
        <div className="flex justify-center py-12">
          <SimpleLoader className="h-6 w-6" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Text as="p" secondaryBody text03>
          {t("users.table.error")}
        </Text>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden" padding={0} gap={0}>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <Text as="p" headingH3>
            {t("users.table.title")}
          </Text>
          <Text as="p" secondaryBody text03>
            {t("users.table.description")}
          </Text>
        </div>

        <InputTypeIn
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t("users.table.search")}
          leftSearchIcon
        />
        <UserFilters
          selectedRoles={selectedRoles}
          onRolesChange={setSelectedRoles}
          selectedGroups={selectedGroups}
          onGroupsChange={setSelectedGroups}
          groups={groupOptions}
          selectedStatuses={selectedStatuses}
          onStatusesChange={onStatusesChange}
          roleCounts={roleCounts}
          statusCounts={statusCounts}
        />
      </div>

      <DataTable
        data={filteredUsers}
        columns={columns}
        getRowId={(row) => row.id ?? row.email}
        pageSize={PAGE_SIZE}
        searchTerm={searchTerm}
        emptyState={
          <IllustrationContent
            illustration={SvgNoResult}
            title={t("users.table.noUsersTitle")}
            description={t("users.table.noUsersDescription")}
          />
        }
        footer={{
          mode: "summary",
          leftExtra: (
            <Button
              icon={SvgDownload}
              prominence="tertiary"
              size="sm"
              tooltip={t("users.table.downloadCsv")}
              aria-label={t("users.table.downloadCsv")}
              onClick={() => {
                downloadUsersCsv().catch((err) => {
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : t("users.table.downloadCsvFailed")
                  );
                });
              }}
            />
          ),
        }}
      />
    </Card>
  );
}
