"use client";

import { useState } from "react";
import {
  SvgCheck,
  SvgSlack,
  SvgUser,
  SvgUserManage,
  SvgUsers,
} from "@opal/icons";
import type { IconFunctionComponent } from "@opal/types";
import FilterButton from "@/refresh-components/buttons/FilterButton";
import Popover from "@/refresh-components/Popover";
import InputTypeIn from "@/refresh-components/inputs/InputTypeIn";
import LineItem from "@/refresh-components/buttons/LineItem";
import Text from "@/refresh-components/texts/Text";
import ShadowDiv from "@/refresh-components/ShadowDiv";
import { UserRole, UserStatus, USER_ROLE_LABELS } from "@/lib/types";
import { NEXT_PUBLIC_CLOUD_ENABLED } from "@/lib/constants";
import type { GroupOption, StatusFilter, StatusCountMap } from "./interfaces";
import { useAppLanguage } from "@/providers/AppLanguageProvider";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VISIBLE_FILTER_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.GLOBAL_CURATOR,
  UserRole.BASIC,
  UserRole.SLACK_USER,
];

const ROLE_ICONS: Partial<Record<UserRole, IconFunctionComponent>> = {
  [UserRole.ADMIN]: SvgUserManage,
  [UserRole.SLACK_USER]: SvgSlack,
};

/** Map UserStatus enum values to the keys returned by the counts endpoint. */
const STATUS_COUNT_KEY: Record<UserStatus, keyof StatusCountMap> = {
  [UserStatus.ACTIVE]: "active",
  [UserStatus.INACTIVE]: "inactive",
  [UserStatus.INVITED]: "invited",
  [UserStatus.REQUESTED]: "requested",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function CountBadge({ count }: { count: number | undefined }) {
  return (
    <Text as="span" secondaryBody text03>
      {count ?? 0}
    </Text>
  );
}

function getLocalizedUserRoleLabel(
  role: UserRole
):
  | "companies.role.admin"
  | "companies.role.globalCurator"
  | "companies.role.basic"
  | null {
  switch (role) {
    case UserRole.ADMIN:
      return "companies.role.admin";
    case UserRole.GLOBAL_CURATOR:
      return "companies.role.globalCurator";
    case UserRole.BASIC:
      return "companies.role.basic";
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface UserFiltersProps {
  selectedRoles: UserRole[];
  onRolesChange: (roles: UserRole[]) => void;
  selectedGroups: number[];
  onGroupsChange: (groupIds: number[]) => void;
  groups: GroupOption[];
  selectedStatuses: StatusFilter;
  onStatusesChange: (statuses: StatusFilter) => void;
  roleCounts: Record<string, number>;
  statusCounts: StatusCountMap;
}

export default function UserFilters({
  selectedRoles,
  onRolesChange,
  selectedGroups,
  onGroupsChange,
  groups,
  selectedStatuses,
  onStatusesChange,
  roleCounts,
  statusCounts,
}: UserFiltersProps) {
  const { t } = useAppLanguage();
  const hasRoleFilter = selectedRoles.length > 0;
  const hasGroupFilter = selectedGroups.length > 0;
  const hasStatusFilter = selectedStatuses.length > 0;
  const [groupSearch, setGroupSearch] = useState("");
  const [groupPopoverOpen, setGroupPopoverOpen] = useState(false);

  const filterableRoles = VISIBLE_FILTER_ROLES.map((role) => [
    role,
    (() => {
      const localizedRoleKey = getLocalizedUserRoleLabel(role);
      return localizedRoleKey ? t(localizedRoleKey) : USER_ROLE_LABELS[role];
    })(),
  ]) as [UserRole, string][];

  const filterableStatuses = [
    [UserStatus.ACTIVE, t("common.status.active")] as [UserStatus, string],
    [UserStatus.INACTIVE, t("common.status.inactive")] as [UserStatus, string],
    [UserStatus.INVITED, t("common.status.invited")] as [UserStatus, string],
    [UserStatus.REQUESTED, t("common.status.requested")] as [
      UserStatus,
      string,
    ],
  ].filter(
    ([value]) => value !== UserStatus.REQUESTED || NEXT_PUBLIC_CLOUD_ENABLED
  );

  const toggleRole = (role: UserRole) => {
    if (selectedRoles.includes(role)) {
      onRolesChange(selectedRoles.filter((r) => r !== role));
    } else {
      onRolesChange([...selectedRoles, role]);
    }
  };

  const toggleGroup = (groupId: number) => {
    if (selectedGroups.includes(groupId)) {
      onGroupsChange(selectedGroups.filter((id) => id !== groupId));
    } else {
      onGroupsChange([...selectedGroups, groupId]);
    }
  };

  const toggleStatus = (status: UserStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusesChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onStatusesChange([...selectedStatuses, status]);
    }
  };

  const roleLabel = hasRoleFilter
    ? filterableRoles
        .filter(([role]) => selectedRoles.includes(role))
        .map(([, label]) => label)
        .slice(0, 2)
        .join(", ") +
      (selectedRoles.length > 2 ? `, +${selectedRoles.length - 2}` : "")
    : t("users.filters.allAccountTypes");

  const groupLabel = hasGroupFilter
    ? groups
        .filter((g) => selectedGroups.includes(g.id))
        .map((g) => g.name)
        .slice(0, 2)
        .join(", ") +
      (selectedGroups.length > 2 ? `, +${selectedGroups.length - 2}` : "")
    : t("users.filters.allGroups");

  const statusLabel = hasStatusFilter
    ? filterableStatuses
        .filter(([status]) => selectedStatuses.includes(status))
        .map(([, label]) => label)
        .slice(0, 2)
        .join(", ") +
      (selectedStatuses.length > 2 ? `, +${selectedStatuses.length - 2}` : "")
    : t("users.filters.allStatus");

  const filteredGroups = groupSearch
    ? groups.filter((g) =>
        g.name.toLowerCase().includes(groupSearch.toLowerCase())
      )
    : groups;

  return (
    <div className="flex gap-2">
      {/* Role filter */}
      <Popover>
        <Popover.Trigger asChild>
          <FilterButton
            aria-label={t("users.filters.byRole")}
            leftIcon={SvgUsers}
            active={hasRoleFilter}
            onClear={() => onRolesChange([])}
          >
            {roleLabel}
          </FilterButton>
        </Popover.Trigger>
        <Popover.Content align="start">
          <div className="flex flex-col gap-1 p-1 min-w-[200px]">
            <LineItem
              icon={!hasRoleFilter ? SvgCheck : SvgUsers}
              selected={!hasRoleFilter}
              emphasized={!hasRoleFilter}
              onClick={() => onRolesChange([])}
            >
              {t("users.filters.allAccountTypes")}
            </LineItem>
            {filterableRoles.map(([role, label]) => {
              const isSelected = selectedRoles.includes(role);
              const roleIcon = ROLE_ICONS[role] ?? SvgUser;
              return (
                <LineItem
                  key={role}
                  icon={isSelected ? SvgCheck : roleIcon}
                  selected={isSelected}
                  emphasized={isSelected}
                  onClick={() => toggleRole(role)}
                  rightChildren={<CountBadge count={roleCounts[role]} />}
                >
                  {label}
                </LineItem>
              );
            })}
          </div>
        </Popover.Content>
      </Popover>

      {/* Groups filter */}
      <Popover
        open={groupPopoverOpen}
        onOpenChange={(open) => {
          setGroupPopoverOpen(open);
          if (!open) setGroupSearch("");
        }}
      >
        <Popover.Trigger asChild>
          <FilterButton
            aria-label={t("users.filters.byGroup")}
            leftIcon={SvgUsers}
            active={hasGroupFilter}
            onClear={() => onGroupsChange([])}
          >
            {groupLabel}
          </FilterButton>
        </Popover.Trigger>
        <Popover.Content align="start">
          <div className="flex flex-col gap-1 p-1 min-w-[200px]">
            <InputTypeIn
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              placeholder={t("users.filters.searchGroups")}
              leftSearchIcon
              variant="internal"
            />
            <LineItem
              icon={!hasGroupFilter ? SvgCheck : SvgUsers}
              selected={!hasGroupFilter}
              emphasized={!hasGroupFilter}
              onClick={() => onGroupsChange([])}
            >
              {t("users.filters.allGroups")}
            </LineItem>
            <ShadowDiv className="flex flex-col gap-1 max-h-[240px]">
              {filteredGroups.map((group) => {
                const isSelected = selectedGroups.includes(group.id);
                return (
                  <LineItem
                    key={group.id}
                    icon={isSelected ? SvgCheck : SvgUsers}
                    selected={isSelected}
                    emphasized={isSelected}
                    onClick={() => toggleGroup(group.id)}
                    rightChildren={<CountBadge count={group.memberCount} />}
                  >
                    {group.name}
                  </LineItem>
                );
              })}
              {filteredGroups.length === 0 && (
                <Text as="span" secondaryBody text03 className="px-2 py-1.5">
                  {t("users.filters.noGroups")}
                </Text>
              )}
            </ShadowDiv>
          </div>
        </Popover.Content>
      </Popover>

      {/* Status filter */}
      <Popover>
        <Popover.Trigger asChild>
          <FilterButton
            aria-label={t("users.filters.byStatus")}
            leftIcon={SvgUsers}
            active={hasStatusFilter}
            onClear={() => onStatusesChange([])}
          >
            {statusLabel}
          </FilterButton>
        </Popover.Trigger>
        <Popover.Content align="start">
          <div className="flex flex-col gap-1 p-1 min-w-[200px]">
            <LineItem
              icon={!hasStatusFilter ? SvgCheck : SvgUser}
              selected={!hasStatusFilter}
              emphasized={!hasStatusFilter}
              onClick={() => onStatusesChange([])}
            >
              {t("users.filters.allStatus")}
            </LineItem>
            {filterableStatuses.map(([status, label]) => {
              const isSelected = selectedStatuses.includes(status);
              const countKey = STATUS_COUNT_KEY[status];
              return (
                <LineItem
                  key={status}
                  icon={isSelected ? SvgCheck : SvgUser}
                  selected={isSelected}
                  emphasized={isSelected}
                  onClick={() => toggleStatus(status)}
                  rightChildren={<CountBadge count={statusCounts[countKey]} />}
                >
                  {label}
                </LineItem>
              );
            })}
          </div>
        </Popover.Content>
      </Popover>
    </div>
  );
}
