"use client";

import { ValidSources } from "@/lib/types";

export const CONNECTOR_OAUTH_POPUP_MESSAGE_TYPE = "connector-oauth-complete";

export interface ConnectorOAuthPopupResult {
  source?: ValidSources;
  credentialId?: number | null;
  connectorAccountId?: number | null;
  message?: string | null;
  redirectUrl?: string | null;
}

export function shouldPreferOAuthPopup(source: ValidSources) {
  return source === ValidSources.GoogleDrive;
}

export function buildConnectorOAuthPopupReturnUrl(
  source: ValidSources,
  returnTo: string = window.location.href
) {
  const completionUrl = new URL(
    "/admin/connectors/oauth-complete",
    window.location.origin
  );
  completionUrl.searchParams.set("source", source);
  completionUrl.searchParams.set("return_to", returnTo);
  return completionUrl.toString();
}

export function openConnectorOAuthPopup(
  authorizationUrl: string
): Promise<ConnectorOAuthPopupResult | null> {
  const popup = window.open(
    authorizationUrl,
    "connector-oauth",
    "popup=yes,width=640,height=820,resizable=yes,scrollbars=yes"
  );

  if (!popup) {
    window.location.href = authorizationUrl;
    return Promise.resolve(null);
  }

  popup.focus();

  return new Promise((resolve, reject) => {
    let finished = false;

    const cleanup = () => {
      window.removeEventListener("message", handleMessage);
      window.clearInterval(closeWatcher);
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type !== CONNECTOR_OAUTH_POPUP_MESSAGE_TYPE) {
        return;
      }

      finished = true;
      cleanup();
      resolve((event.data?.payload as ConnectorOAuthPopupResult) || null);
    };

    const closeWatcher = window.setInterval(() => {
      if (popup.closed && !finished) {
        cleanup();
        reject(new Error("OAuth window was closed before the flow finished."));
      }
    }, 500);

    window.addEventListener("message", handleMessage);
  });
}
