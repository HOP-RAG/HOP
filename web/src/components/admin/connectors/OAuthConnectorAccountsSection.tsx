"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { Form, Formik } from "formik";
import * as Yup from "yup";
import { Button } from "@opal/components";
import { Disabled } from "@opal/core";

import { TextFormField } from "@/components/Field";
import CardSection from "@/components/admin/CardSection";
import { Spinner } from "@/components/Spinner";
import { toast } from "@/hooks/useToast";
import {
  ConnectorAccountSnapshot,
  disconnectConnectorAccount,
  reconnectConnectorAccount,
  startConnectorOAuth,
  syncConnectorAccount,
  useConnectorProviderStatus,
} from "@/lib/connectors/connectorAccounts";
import {
  getLocalizedCredentialMethodLabel,
  getLocalizedStatusLabel,
  getManualSetupToggleLabel,
  getOAuthSectionDescription,
  getPrimaryConnectLabel,
} from "@/lib/connectors/authUi";
import {
  buildConnectorOAuthPopupReturnUrl,
  openConnectorOAuthPopup,
  shouldPreferOAuthPopup,
} from "@/lib/connectors/oauthPopup";
import { Credential } from "@/lib/connectors/credentials";
import { getSourceDisplayName } from "@/lib/sources";
import { ValidSources } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppLanguage } from "@/providers/AppLanguageProvider";
import Text from "@/refresh-components/texts/Text";

interface OAuthConnectorAccountsSectionProps {
  sourceType: ValidSources;
  selectedCredentialId: number | null;
  onSelectCredential: (credential: Credential<any> | null) => void;
  onRefreshCredentials?: () => void;
  advancedSetupOpen: boolean;
  onToggleAdvancedSetup: () => void;
}

type OAuthConnectFormValues = Record<string, string>;

function isSelectableAccount(account: ConnectorAccountSnapshot) {
  return (
    account.credential &&
    (account.status === "connected" || account.status === "syncing")
  );
}

function getStatusClasses(status: ConnectorAccountSnapshot["status"]) {
  switch (status) {
    case "connected":
      return "bg-status-success-01";
    case "syncing":
    case "connecting":
      return "bg-status-info-01";
    case "needs_reconnect":
      return "bg-status-warning-01";
    case "error":
      return "bg-status-error-01";
    case "disconnected":
    case "not_connected":
      return "bg-background-neutral-02";
  }
}

export default function OAuthConnectorAccountsSection({
  sourceType,
  selectedCredentialId,
  onSelectCredential,
  onRefreshCredentials,
  advancedSetupOpen,
  onToggleAdvancedSetup,
}: OAuthConnectorAccountsSectionProps) {
  const displayName = getSourceDisplayName(sourceType) || sourceType;
  const { t } = useAppLanguage();
  const router = useRouter();
  const {
    data: providerStatus,
    error,
    isLoading,
    mutate,
  } = useConnectorProviderStatus(sourceType);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const accounts = providerStatus?.accounts ?? [];
  const hasAdvancedAuthModes =
    (providerStatus?.available_auth_modes.length ?? 0) > 0;
  const selectableAccounts = accounts.filter(isSelectableAccount);

  useEffect(() => {
    if (selectedCredentialId !== null) {
      return;
    }

    const preferredAccount = selectableAccounts[0];
    if (preferredAccount?.credential) {
      onSelectCredential(preferredAccount.credential);
    }
  }, [onSelectCredential, selectableAccounts, selectedCredentialId]);

  const refreshData = async () => {
    await mutate();
    onRefreshCredentials?.();
  };

  const finishPopupFlow = async (redirectUrl?: string | null) => {
    if (redirectUrl) {
      const parsedRedirectUrl = new URL(redirectUrl, window.location.origin);
      router.replace(
        `${parsedRedirectUrl.pathname}${parsedRedirectUrl.search}${parsedRedirectUrl.hash}` as Route
      );
    }
    await refreshData();
  };

  const handleConnect = async (values: OAuthConnectFormValues) => {
    setActiveAction("connect");
    try {
      const desiredReturnUrl = shouldPreferOAuthPopup(sourceType)
        ? buildConnectorOAuthPopupReturnUrl(sourceType)
        : window.location.href;
      const redirectUrl = await startConnectorOAuth(
        sourceType,
        values,
        desiredReturnUrl
      );

      if (shouldPreferOAuthPopup(sourceType)) {
        const popupResult = await openConnectorOAuthPopup(redirectUrl);
        if (popupResult) {
          await finishPopupFlow(popupResult.redirectUrl);
        }
      } else {
        window.location.href = redirectUrl;
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("connectors.auth.errors.connect", { source: displayName })
      );
    } finally {
      setActiveAction(null);
    }
  };

  const handleReconnect = async (
    accountId: number,
    additionalKwargs: Record<string, string>
  ) => {
    setActiveAction(`reconnect-${accountId}`);
    try {
      const desiredReturnUrl = shouldPreferOAuthPopup(sourceType)
        ? buildConnectorOAuthPopupReturnUrl(sourceType)
        : window.location.href;
      const redirectUrl = await reconnectConnectorAccount(
        sourceType,
        accountId,
        additionalKwargs,
        desiredReturnUrl
      );

      if (shouldPreferOAuthPopup(sourceType)) {
        const popupResult = await openConnectorOAuthPopup(redirectUrl);
        if (popupResult) {
          await finishPopupFlow(popupResult.redirectUrl);
        }
      } else {
        window.location.href = redirectUrl;
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("connectors.auth.errors.reconnect", { source: displayName })
      );
    } finally {
      setActiveAction(null);
    }
  };

  const handleDisconnect = async (account: ConnectorAccountSnapshot) => {
    setActiveAction(`disconnect-${account.id}`);
    try {
      const response = await disconnectConnectorAccount(sourceType, account.id);
      if (selectedCredentialId === account.credential?.id) {
        onSelectCredential(null);
      }
      toast.success(response.message);
      await refreshData();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("connectors.auth.errors.disconnect", { source: displayName })
      );
    } finally {
      setActiveAction(null);
    }
  };

  const handleSync = async (accountId: number) => {
    setActiveAction(`sync-${accountId}`);
    try {
      const response = await syncConnectorAccount(sourceType, accountId);
      toast.success(response.message);
      await refreshData();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("connectors.auth.errors.sync", { source: displayName })
      );
    } finally {
      setActiveAction(null);
    }
  };

  const initialValues = Object.fromEntries(
    (providerStatus?.additional_kwargs ?? []).map((field) => [field.name, ""])
  ) as OAuthConnectFormValues;

  const validationSchema = Yup.object().shape(
    Object.fromEntries(
      (providerStatus?.additional_kwargs ?? []).map((field) => [
        field.name,
        Yup.string().required(t("connectors.auth.errors.required")),
      ])
    )
  );

  const renderAccounts = (additionalKwargs: Record<string, string>) => {
    if (accounts.length === 0) {
      return null;
    }

    return (
      <div className="flex flex-col gap-3">
        <Text as="p" mainUiAction>
          {t("connectors.auth.existingConnections")}
        </Text>

        {accounts.map((account) => {
          const isSelected = selectedCredentialId === account.credential?.id;
          const hasSyncHistory =
            account.last_sync_at && account.last_sync_status;

          return (
            <div
              key={account.id}
              className={cn(
                "flex flex-col gap-4 rounded-16 border border-border-02 p-4",
                isSelected && "bg-background-tint-02 border-border-03"
              )}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Text mainUiAction>
                      {account.name ||
                        account.external_account_email ||
                        account.credential?.name ||
                        `${displayName} account`}
                    </Text>
                    <div
                      className={cn(
                        "rounded-full px-2 py-1",
                        getStatusClasses(account.status)
                      )}
                    >
                      <Text as="span" secondaryAction text01>
                        {getLocalizedStatusLabel(account, t)}
                      </Text>
                    </div>
                    <div className="rounded-full bg-background-neutral-02 px-2 py-1">
                      <Text as="span" secondaryBody text03>
                        {getLocalizedCredentialMethodLabel(account, t)}
                      </Text>
                    </div>
                  </div>

                  {account.external_account_email &&
                    account.external_account_email !== account.name && (
                      <Text as="p" text03 secondaryBody>
                        {account.external_account_email}
                      </Text>
                    )}

                  <Text as="p" text03 secondaryBody>
                    {account.linked_connector_count > 0
                      ? t("connectors.auth.linkedConnectors", {
                          count: account.linked_connector_count,
                        })
                      : t("connectors.auth.noLinkedConnectors")}
                  </Text>

                  {hasSyncHistory && (
                    <Text as="p" text03 secondaryBody>
                      {t("connectors.auth.lastSync", {
                        time: account.last_sync_at || "",
                        status: account.last_sync_status || "",
                      })}
                    </Text>
                  )}

                  {account.last_error && (
                    <div className="rounded-12 bg-status-error-01 p-3">
                      <Text as="p" secondaryBody text01>
                        {account.last_error}
                      </Text>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {isSelectableAccount(account) && account.credential && (
                    <Button
                      type="button"
                      variant={isSelected ? undefined : "action"}
                      prominence={isSelected ? "secondary" : undefined}
                      onClick={() => onSelectCredential(account.credential)}
                    >
                      {isSelected
                        ? t("connectors.auth.buttons.selected")
                        : t("connectors.auth.buttons.useConnection")}
                    </Button>
                  )}

                  {account.can_sync && (
                    <Disabled disabled={activeAction === `sync-${account.id}`}>
                      <Button
                        prominence="secondary"
                        type="button"
                        onClick={() => handleSync(account.id)}
                      >
                        {t("connectors.auth.buttons.syncNow")}
                      </Button>
                    </Disabled>
                  )}

                  {account.can_reconnect && (
                    <Disabled
                      disabled={activeAction === `reconnect-${account.id}`}
                    >
                      <Button
                        type="button"
                        onClick={() =>
                          handleReconnect(account.id, additionalKwargs)
                        }
                      >
                        {t("connectors.auth.buttons.reconnect")}
                      </Button>
                    </Disabled>
                  )}

                  {account.can_disconnect &&
                    account.status !== "disconnected" && (
                      <Disabled
                        disabled={activeAction === `disconnect-${account.id}`}
                      >
                        <Button
                          prominence="secondary"
                          type="button"
                          onClick={() => handleDisconnect(account)}
                        >
                          {t("connectors.auth.buttons.disconnect")}
                        </Button>
                      </Disabled>
                    )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <CardSection className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Text as="p" headingH3>
          {t("connectors.auth.title", { source: displayName })}
        </Text>
        <Text as="p" text03 mainUiBody>
          {getOAuthSectionDescription(sourceType, t)}
        </Text>
      </div>

      {isLoading && !providerStatus ? (
        <Spinner />
      ) : error && !providerStatus ? (
        <div className="rounded-16 border border-border-02 bg-background-neutral-01 p-4">
          <Text as="p" text03 mainUiBody>
            {t("connectors.auth.loadError")}
          </Text>
        </div>
      ) : (
        <>
          {providerStatus?.oauth_enabled && (
            <Formik
              enableReinitialize
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleConnect}
            >
              {({ isSubmitting, values }) => (
                <div className="flex flex-col gap-4">
                  <Form className="flex flex-col gap-4 rounded-16 border border-border-02 bg-background-neutral-01 p-4">
                    {providerStatus.additional_kwargs.length > 0 && (
                      <div className="grid gap-4 md:grid-cols-2">
                        {providerStatus.additional_kwargs.map((field) => (
                          <TextFormField
                            key={field.name}
                            name={field.name}
                            label={field.display_name}
                            subtext={field.description}
                            type="text"
                          />
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      <Disabled
                        disabled={isSubmitting || activeAction === "connect"}
                      >
                        <Button type="submit" variant="action">
                          {getPrimaryConnectLabel(
                            sourceType,
                            displayName,
                            accounts.length > 0,
                            t
                          )}
                        </Button>
                      </Disabled>
                      <Button
                        prominence="secondary"
                        type="button"
                        onClick={onToggleAdvancedSetup}
                      >
                        {getManualSetupToggleLabel(
                          sourceType,
                          advancedSetupOpen,
                          t
                        )}
                      </Button>
                    </div>
                  </Form>

                  {renderAccounts(values)}
                </div>
              )}
            </Formik>
          )}

          {!providerStatus?.oauth_enabled && accounts.length === 0 && (
            <div className="rounded-16 border border-border-02 bg-background-neutral-01 p-4">
              <Text as="p" text03 mainUiBody>
                {t("connectors.auth.oauthUnavailable")}
              </Text>
            </div>
          )}

          {!providerStatus?.oauth_enabled && renderAccounts({})}

          {!providerStatus?.oauth_enabled &&
            (accounts.length > 0 || hasAdvancedAuthModes) && (
              <div className="flex justify-start">
                <Button
                  prominence="secondary"
                  type="button"
                  onClick={onToggleAdvancedSetup}
                >
                  {getManualSetupToggleLabel(sourceType, advancedSetupOpen, t)}
                </Button>
              </div>
            )}
        </>
      )}
    </CardSection>
  );
}
