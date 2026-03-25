"use client";

import { useEffect, useState } from "react";

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
import { Credential } from "@/lib/connectors/credentials";
import { getSourceDisplayName } from "@/lib/sources";
import { ValidSources } from "@/lib/types";
import { cn } from "@/lib/utils";
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

function getStatusLabel(status: ConnectorAccountSnapshot["status"]) {
  switch (status) {
    case "connected":
      return "Connected";
    case "syncing":
      return "Syncing";
    case "needs_reconnect":
      return "Needs reconnect";
    case "connecting":
      return "Connecting";
    case "disconnected":
      return "Disconnected";
    case "error":
      return "Error";
    case "not_connected":
      return "Not connected";
  }
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

function getCredentialTypeLabel(credentialType: string) {
  switch (credentialType) {
    case "oauth":
      return "OAuth";
    case "service_account":
      return "Service account";
    case "api_key":
      return "API key";
    default:
      return "Custom";
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
  const displayName = getSourceDisplayName(sourceType);
  const {
    data: providerStatus,
    error,
    isLoading,
    mutate,
  } = useConnectorProviderStatus(sourceType);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const accounts = providerStatus?.accounts ?? [];
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

  const handleConnect = async (values: OAuthConnectFormValues) => {
    setActiveAction("connect");
    try {
      const redirectUrl = await startConnectorOAuth(sourceType, values);
      window.location.href = redirectUrl;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to connect ${displayName}.`
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
      const redirectUrl = await reconnectConnectorAccount(
        sourceType,
        accountId,
        additionalKwargs
      );
      window.location.href = redirectUrl;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to reconnect ${displayName}.`
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
          : `Failed to disconnect ${displayName}.`
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
        error instanceof Error ? error.message : `Failed to sync ${displayName}.`
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
        Yup.string().required("Required"),
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
          Existing connections
        </Text>

        {accounts.map((account) => {
          const isSelected = selectedCredentialId === account.credential?.id;
          const hasSyncHistory = account.last_sync_at && account.last_sync_status;

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
                        {getStatusLabel(account.status)}
                      </Text>
                    </div>
                    <div className="rounded-full bg-background-neutral-02 px-2 py-1">
                      <Text as="span" secondaryBody text03>
                        {getCredentialTypeLabel(account.credential_type)}
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
                      ? `${account.linked_connector_count} connector(s) already use this connection.`
                      : "Connect first, then continue to choose folders, spaces, or other source-specific options."}
                  </Text>

                  {hasSyncHistory && (
                    <Text as="p" text03 secondaryBody>
                      Last sync: {account.last_sync_at} ({account.last_sync_status}
                      )
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
                      {isSelected ? "Selected" : "Use connection"}
                    </Button>
                  )}

                  {account.can_sync && (
                    <Disabled disabled={activeAction === `sync-${account.id}`}>
                      <Button
                        prominence="secondary"
                        type="button"
                        onClick={() => handleSync(account.id)}
                      >
                        Sync now
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
                        Reconnect
                      </Button>
                    </Disabled>
                  )}

                  {account.can_disconnect && account.status !== "disconnected" && (
                    <Disabled
                      disabled={activeAction === `disconnect-${account.id}`}
                    >
                      <Button
                        prominence="secondary"
                        type="button"
                        onClick={() => handleDisconnect(account)}
                      >
                        Disconnect
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
          Connect {displayName}
        </Text>
        <Text as="p" text03 mainUiBody>
          OAuth is the default path here. Connect your account, approve access,
          and then continue with connector-specific setup like folder or source
          selection.
        </Text>
      </div>

      {isLoading && !providerStatus ? (
        <Spinner />
      ) : error && !providerStatus ? (
        <div className="rounded-16 border border-border-02 bg-background-neutral-01 p-4">
          <Text as="p" text03 mainUiBody>
            We could not load the shared connection status right now. You can
            still continue with advanced setup below.
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
                          {accounts.length > 0
                            ? `Connect another ${displayName} account`
                            : `Connect ${displayName}`}
                        </Button>
                      </Disabled>
                      <Button
                        prominence="secondary"
                        type="button"
                        onClick={onToggleAdvancedSetup}
                      >
                        {advancedSetupOpen
                          ? "Hide advanced setup"
                          : "Use custom credentials"}
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
                OAuth is not available for this connector yet. You can use the
                advanced setup path below.
              </Text>
            </div>
          )}

          {!providerStatus?.oauth_enabled && renderAccounts({})}

          {!providerStatus?.oauth_enabled && accounts.length > 0 && (
            <div className="flex justify-start">
              <Button
                prominence="secondary"
                type="button"
                onClick={onToggleAdvancedSetup}
              >
                {advancedSetupOpen
                  ? "Hide advanced setup"
                  : "Use custom credentials"}
              </Button>
            </div>
          )}
        </>
      )}
    </CardSection>
  );
}
