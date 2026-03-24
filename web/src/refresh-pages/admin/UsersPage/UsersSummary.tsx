import { SvgArrowUpRight, SvgFilterPlus, SvgUserSync } from "@opal/icons";
import { ContentAction } from "@opal/layouts";
import { Button } from "@opal/components";
import { Section } from "@/layouts/general-layouts";
import Card from "@/refresh-components/cards/Card";
import IconButton from "@/refresh-components/buttons/IconButton";
import Text from "@/refresh-components/texts/Text";
import Link from "next/link";
import { ADMIN_ROUTES } from "@/lib/admin-routes";
import { useAppLanguage } from "@/providers/AppLanguageProvider";

// ---------------------------------------------------------------------------
// Stats cell — number + label + hover filter icon
// ---------------------------------------------------------------------------

type StatCellProps = {
  value: number | null;
  label: string;
  onFilter?: () => void;
};

function StatCell({ value, label, onFilter }: StatCellProps) {
  const display = value === null ? "\u2014" : value.toLocaleString();

  return (
    <div
      className={`group/stat relative flex flex-col items-start gap-0.5 w-full p-2 rounded-08 transition-colors ${
        onFilter ? "cursor-pointer hover:bg-background-tint-02" : ""
      }`}
      onClick={onFilter}
    >
      <Text as="span" mainUiAction text04>
        {display}
      </Text>
      <Text as="span" secondaryBody text03>
        {label}
      </Text>
      {onFilter && (
        <IconButton
          tertiary
          icon={SvgFilterPlus}
          tooltip="Add Filter"
          toolTipPosition="left"
          tooltipSize="sm"
          className="absolute right-1 top-1 opacity-0 group-hover/stat:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onFilter();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SCIM card
// ---------------------------------------------------------------------------

function ScimCard() {
  const { t } = useAppLanguage();

  return (
    <Card gap={0.5} padding={0.75}>
      <ContentAction
        icon={SvgUserSync}
        title={t("users.summary.scimTitle")}
        description={t("users.summary.scimDescription")}
        sizePreset="main-ui"
        variant="section"
        paddingVariant="fit"
        rightChildren={
          <Link href={ADMIN_ROUTES.SCIM.path}>
            <Button prominence="tertiary" rightIcon={SvgArrowUpRight} size="sm">
              {t("users.summary.manage")}
            </Button>
          </Link>
        }
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Stats bar — layout varies by SCIM status
// ---------------------------------------------------------------------------

type UsersSummaryProps = {
  activeUsers: number | null;
  pendingInvites: number | null;
  requests: number | null;
  showScim: boolean;
  onFilterActive?: () => void;
  onFilterInvites?: () => void;
  onFilterRequests?: () => void;
};

export default function UsersSummary({
  activeUsers,
  pendingInvites,
  requests,
  showScim,
  onFilterActive,
  onFilterInvites,
  onFilterRequests,
}: UsersSummaryProps) {
  const { t } = useAppLanguage();
  const showRequests = requests !== null && requests > 0;

  const statsCard = (
    <Card padding={0.5}>
      <Section flexDirection="row" gap={0}>
        <StatCell
          value={activeUsers}
          label={t("users.summary.activeUsers")}
          onFilter={onFilterActive}
        />
        <StatCell
          value={pendingInvites}
          label={t("users.summary.pendingInvites")}
          onFilter={onFilterInvites}
        />
        {showRequests && (
          <StatCell
            value={requests}
            label={t("users.summary.requestsToJoin")}
            onFilter={onFilterRequests}
          />
        )}
      </Section>
    </Card>
  );

  if (showScim) {
    return (
      <Section
        flexDirection="row"
        justifyContent="start"
        alignItems="stretch"
        gap={0.5}
      >
        {statsCard}
        <ScimCard />
      </Section>
    );
  }

  // No SCIM — each stat gets its own card
  return (
    <Section flexDirection="row" gap={0.5}>
      <Card padding={0.5}>
        <StatCell
          value={activeUsers}
          label={t("users.summary.activeUsers")}
          onFilter={onFilterActive}
        />
      </Card>
      <Card padding={0.5}>
        <StatCell
          value={pendingInvites}
          label={t("users.summary.pendingInvites")}
          onFilter={onFilterInvites}
        />
      </Card>
      {showRequests && (
        <Card padding={0.5}>
          <StatCell
            value={requests}
            label={t("users.summary.requestsToJoin")}
            onFilter={onFilterRequests}
          />
        </Card>
      )}
    </Section>
  );
}
