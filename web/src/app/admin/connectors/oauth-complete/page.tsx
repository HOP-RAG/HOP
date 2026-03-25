"use client";

import { useEffect } from "react";
import { useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";

import CardSection from "@/components/admin/CardSection";
import { Spinner } from "@/components/Spinner";
import {
  CONNECTOR_OAUTH_POPUP_MESSAGE_TYPE,
  ConnectorOAuthPopupResult,
} from "@/lib/connectors/oauthPopup";
import { ValidSources } from "@/lib/types";
import Text from "@/refresh-components/texts/Text";

function buildRedirectUrl(searchParams: ReadonlyURLSearchParams) {
  const source = searchParams.get("source") || ValidSources.GoogleDrive;
  const returnTo =
    searchParams.get("return_to") || `/admin/connectors/${source}`;
  const redirectUrl = new URL(returnTo, window.location.origin);

  const credentialId = searchParams.get("credentialId");
  const connectorAccountId = searchParams.get("connectorAccountId");
  const message = searchParams.get("message");

  if (credentialId) {
    redirectUrl.searchParams.set("credentialId", credentialId);
  }
  if (connectorAccountId) {
    redirectUrl.searchParams.set("connectorAccountId", connectorAccountId);
  }
  if (message) {
    redirectUrl.searchParams.set("message", message);
  }

  return redirectUrl.toString();
}

export default function ConnectorOAuthCompletePage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const redirectUrl = buildRedirectUrl(searchParams);
    const source = searchParams.get("source") as ValidSources | null;
    const credentialId = searchParams.get("credentialId");
    const connectorAccountId = searchParams.get("connectorAccountId");
    const message = searchParams.get("message");

    const payload: ConnectorOAuthPopupResult = {
      source: source || undefined,
      credentialId: credentialId ? Number.parseInt(credentialId, 10) : null,
      connectorAccountId: connectorAccountId
        ? Number.parseInt(connectorAccountId, 10)
        : null,
      message,
      redirectUrl,
    };

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          type: CONNECTOR_OAUTH_POPUP_MESSAGE_TYPE,
          payload,
        },
        window.location.origin
      );

      window.close();

      window.setTimeout(() => {
        window.location.replace(redirectUrl);
      }, 250);
      return;
    }

    window.location.replace(redirectUrl);
  }, [searchParams]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center p-6">
      <CardSection className="w-full max-w-xl">
        <div className="flex flex-col items-center gap-4 py-8">
          <Spinner />
          <Text as="p" mainUiAction>
            Completing Google Drive connection...
          </Text>
          <Text as="p" mainUiBody text03 className="text-center">
            You can close this window if it does not close automatically.
          </Text>
        </div>
      </CardSection>
    </div>
  );
}
