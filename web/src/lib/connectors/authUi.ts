import type { TranslateFn } from "@/lib/i18n/app-language";
import type { ConnectorAccountSnapshot } from "@/lib/connectors/connectorAccounts";
import { ValidSources } from "@/lib/types";

export function isGoogleDriveSource(source: ValidSources) {
  return source === ValidSources.GoogleDrive;
}

export function getOAuthSectionDescription(
  source: ValidSources,
  t: TranslateFn
) {
  return isGoogleDriveSource(source)
    ? t("connectors.auth.sectionDescription.google")
    : t("connectors.auth.sectionDescription.default");
}

export function getAdvancedSetupDescription(
  source: ValidSources,
  t: TranslateFn
) {
  return isGoogleDriveSource(source)
    ? t("connectors.advanced.description.google")
    : t("connectors.advanced.description.default");
}

export function getPrimaryConnectLabel(
  source: ValidSources,
  sourceDisplayName: string,
  hasAccounts: boolean,
  t: TranslateFn
) {
  if (isGoogleDriveSource(source)) {
    return hasAccounts
      ? t("connectors.auth.buttons.connectAnotherGoogle")
      : t("connectors.auth.buttons.connectWithGoogle");
  }

  return hasAccounts
    ? `Connect another ${sourceDisplayName} account`
    : `Connect ${sourceDisplayName}`;
}

export function getManualSetupToggleLabel(
  source: ValidSources,
  open: boolean,
  t: TranslateFn
) {
  if (isGoogleDriveSource(source)) {
    return t("connectors.auth.buttons.advancedOptions");
  }

  if (open) {
    return t("connectors.auth.buttons.hideManualSetup");
  }

  return t("connectors.auth.buttons.useCustomCredentials");
}

export function getAdvancedCreateButtonLabel(
  source: ValidSources,
  t: TranslateFn
) {
  return isGoogleDriveSource(source)
    ? t("connectors.auth.buttons.useOwnCredentials")
    : t("connectors.advanced.buttons.createNew");
}

export function getManualCredentialModalTitle(
  source: ValidSources,
  sourceDisplayName: string,
  t: TranslateFn
) {
  if (isGoogleDriveSource(source)) {
    return t("connectors.advanced.modalTitle.manualCredential", {
      source: sourceDisplayName,
    });
  }

  return `Create a ${sourceDisplayName} credential`;
}

function isExpiredAccount(account: ConnectorAccountSnapshot) {
  const tokenExpiry = account.account_metadata?.token_expiry;
  if (!tokenExpiry || typeof tokenExpiry !== "string") {
    return false;
  }

  const expiryTime = Date.parse(tokenExpiry);
  if (Number.isNaN(expiryTime)) {
    return false;
  }

  return expiryTime <= Date.now();
}

export function getLocalizedStatusLabel(
  account: ConnectorAccountSnapshot,
  t: TranslateFn
) {
  if (account.status === "needs_reconnect" && isExpiredAccount(account)) {
    return t("connectors.auth.status.expired");
  }

  switch (account.status) {
    case "connected":
      return t("connectors.auth.status.connected");
    case "syncing":
      return t("connectors.auth.status.syncing");
    case "needs_reconnect":
      return t("connectors.auth.status.needsReconnect");
    case "connecting":
      return t("connectors.auth.status.connecting");
    case "disconnected":
      return t("connectors.auth.status.disconnected");
    case "error":
      return t("connectors.auth.status.error");
    case "not_connected":
      return t("connectors.auth.status.notConnected");
  }
}

export function getLocalizedCredentialMethodLabel(
  account: ConnectorAccountSnapshot,
  t: TranslateFn
) {
  const authMethod = account.account_metadata?.auth_method;

  if (authMethod === "platform_oauth" || authMethod === "oauth_interactive") {
    return t("connectors.auth.credentialType.platformOauth");
  }

  if (authMethod === "customer_oauth" || authMethod === "uploaded") {
    return t("connectors.auth.credentialType.customerOauth");
  }

  if (authMethod === "service_account_json") {
    return t("connectors.auth.credentialType.serviceAccountJson");
  }

  switch (account.credential_type) {
    case "oauth":
      return t("connectors.auth.credentialType.oauth");
    case "service_account":
      return t("connectors.auth.credentialType.serviceAccount");
    case "api_key":
      return t("connectors.auth.credentialType.apiKey");
    default:
      return t("connectors.auth.credentialType.custom");
  }
}
