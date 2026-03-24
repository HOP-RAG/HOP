"use client";

import { useState } from "react";
import { SvgUser, SvgUserPlus } from "@opal/icons";
import { Button } from "@opal/components";
import * as SettingsLayouts from "@/layouts/settings-layouts";
import { useScimToken } from "@/hooks/useScimToken";
import { usePaidEnterpriseFeaturesEnabled } from "@/components/settings/usePaidEnterpriseFeaturesEnabled";
import useUserCounts from "@/hooks/useUserCounts";
import { ADMIN_ROUTES, getAdminRouteCopy } from "@/lib/admin-routes";
import { UserStatus } from "@/lib/types";
import type { StatusFilter } from "./UsersPage/interfaces";

import UsersSummary from "./UsersPage/UsersSummary";
import UsersTable from "./UsersPage/UsersTable";
import InviteUsersModal from "./UsersPage/InviteUsersModal";
import { useAppLanguage } from "@/providers/AppLanguageProvider";

// ---------------------------------------------------------------------------
// Users page content
// ---------------------------------------------------------------------------

function UsersContent() {
  const isEe = usePaidEnterpriseFeaturesEnabled();

  const { data: scimToken } = useScimToken();
  const showScim = isEe && !!scimToken;

  const { activeCount, invitedCount, pendingCount, roleCounts, statusCounts } =
    useUserCounts();

  const [selectedStatuses, setSelectedStatuses] = useState<StatusFilter>([]);

  const toggleStatus = (target: UserStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(target)
        ? prev.filter((s) => s !== target)
        : [...prev, target]
    );
  };

  return (
    <>
      <UsersSummary
        activeUsers={activeCount}
        pendingInvites={invitedCount}
        requests={pendingCount}
        showScim={showScim}
        onFilterActive={() => toggleStatus(UserStatus.ACTIVE)}
        onFilterInvites={() => toggleStatus(UserStatus.INVITED)}
        onFilterRequests={() => toggleStatus(UserStatus.REQUESTED)}
      />

      <UsersTable
        selectedStatuses={selectedStatuses}
        onStatusesChange={setSelectedStatuses}
        roleCounts={roleCounts}
        statusCounts={statusCounts}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UsersPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const { t } = useAppLanguage();
  const routeCopy = getAdminRouteCopy(ADMIN_ROUTES.USERS, t);

  return (
    <SettingsLayouts.Root width="lg">
      <SettingsLayouts.Header
        title={routeCopy.title}
        icon={SvgUser}
        description={t("users.page.description")}
        rightChildren={
          <Button icon={SvgUserPlus} onClick={() => setInviteOpen(true)}>
            {t("users.page.invite")}
          </Button>
        }
      />
      <SettingsLayouts.Body>
        <UsersContent />
      </SettingsLayouts.Body>

      <InviteUsersModal open={inviteOpen} onOpenChange={setInviteOpen} />
    </SettingsLayouts.Root>
  );
}
