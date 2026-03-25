import useSWR from "swr";

import { errorHandlingFetcher } from "@/lib/fetcher";
import { ValidSources, ValidStatuses } from "@/lib/types";

import {
  Credential,
  OAuthAdditionalKwargDescription,
} from "@/lib/connectors/credentials";

export type ConnectorAccountStatus =
  | "not_connected"
  | "connecting"
  | "connected"
  | "syncing"
  | "needs_reconnect"
  | "error"
  | "disconnected";

export type ConnectorCredentialType =
  | "oauth"
  | "service_account"
  | "api_key"
  | "custom";

export type ConnectorAuthMode =
  | "platform_oauth"
  | "customer_oauth"
  | "service_account_json";

export interface ConnectorAccountSnapshot {
  id: number;
  source: ValidSources;
  name: string | null;
  status: ConnectorAccountStatus;
  credential_type: ConnectorCredentialType;
  external_account_id: string | null;
  external_account_email: string | null;
  account_metadata: Record<string, any>;
  settings: Record<string, any>;
  last_error: string | null;
  last_connected_at: string | null;
  last_sync_at: string | null;
  last_sync_status: ValidStatuses | null;
  linked_connector_count: number;
  can_disconnect: boolean;
  can_reconnect: boolean;
  can_sync: boolean;
  credential: Credential<any> | null;
}

export interface ConnectorProviderStatusResponse {
  source: ValidSources;
  oauth_enabled: boolean;
  available_auth_modes: ConnectorAuthMode[];
  additional_kwargs: OAuthAdditionalKwargDescription[];
  accounts: ConnectorAccountSnapshot[];
}

interface OAuthStartResponse {
  url: string;
}

interface CustomOAuthClientConfig {
  client_id: string;
  client_secret: string;
}

function getErrorMessage(errorData: any, fallback: string) {
  return errorData?.detail || errorData?.message || fallback;
}

async function parseJsonResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(getErrorMessage(errorData, fallbackMessage));
  }

  return response.json();
}

export function getConnectorProviderStatusUrl(sourceType: ValidSources) {
  return `/api/manage/connectors/${sourceType}/status`;
}

export function useConnectorProviderStatus(sourceType: ValidSources) {
  return useSWR<ConnectorProviderStatusResponse>(
    getConnectorProviderStatusUrl(sourceType),
    errorHandlingFetcher,
    {
      shouldRetryOnError: false,
    }
  );
}

export async function startConnectorOAuth(
  sourceType: ValidSources,
  additionalKwargs: Record<string, string>,
  desiredReturnUrl: string = window.location.href
): Promise<string> {
  const queryParams = new URLSearchParams({
    desired_return_url: desiredReturnUrl,
    ...additionalKwargs,
  });

  const response = await fetch(
    `/api/manage/connectors/${sourceType}/oauth/start?${queryParams.toString()}`
  );
  const data = await parseJsonResponse<OAuthStartResponse>(
    response,
    `Failed to start ${sourceType} OAuth flow.`
  );
  return data.url;
}

export async function startConnectorOAuthWithCustomClient(
  sourceType: ValidSources,
  oauthClient: CustomOAuthClientConfig,
  additionalKwargs: Record<string, string> = {},
  desiredReturnUrl: string = window.location.href
): Promise<string> {
  const response = await fetch(
    `/api/manage/connectors/${sourceType}/oauth/start`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        desired_return_url: desiredReturnUrl,
        additional_kwargs: additionalKwargs,
        auth_mode: "customer_oauth",
        oauth_client: oauthClient,
      }),
    }
  );
  const data = await parseJsonResponse<OAuthStartResponse>(
    response,
    `Failed to start ${sourceType} customer OAuth flow.`
  );
  return data.url;
}

export async function reconnectConnectorAccount(
  sourceType: ValidSources,
  accountId: number,
  additionalKwargs: Record<string, string>,
  desiredReturnUrl: string = window.location.href
): Promise<string> {
  const queryParams = new URLSearchParams({
    account_id: accountId.toString(),
    desired_return_url: desiredReturnUrl,
    ...additionalKwargs,
  });

  const response = await fetch(
    `/api/manage/connectors/${sourceType}/reconnect?${queryParams.toString()}`,
    {
      method: "POST",
    }
  );
  const data = await parseJsonResponse<OAuthStartResponse>(
    response,
    `Failed to reconnect ${sourceType}.`
  );
  return data.url;
}

export async function disconnectConnectorAccount(
  sourceType: ValidSources,
  accountId: number
) {
  const response = await fetch(
    `/api/manage/connectors/${sourceType}/disconnect?account_id=${accountId}`,
    {
      method: "POST",
    }
  );

  return parseJsonResponse<{ success: boolean; message: string; data: number }>(
    response,
    `Failed to disconnect ${sourceType}.`
  );
}

export async function syncConnectorAccount(
  sourceType: ValidSources,
  accountId: number
) {
  const response = await fetch(
    `/api/manage/connectors/${sourceType}/sync?account_id=${accountId}`,
    {
      method: "POST",
    }
  );

  return parseJsonResponse<{ success: boolean; message: string; data: number }>(
    response,
    `Failed to sync ${sourceType}.`
  );
}
