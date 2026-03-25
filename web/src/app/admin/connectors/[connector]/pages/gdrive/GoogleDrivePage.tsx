"use client";

import React, { useState } from "react";
import { ErrorCallout } from "@/components/ErrorCallout";
import { LoadingAnimation } from "@/components/Loading";
import { ValidSources } from "@/lib/types";
import { usePublicCredentials } from "@/lib/hooks";
import Title from "@/components/ui/title";
import { Button } from "@opal/components";
import {
  DriveAuthSection,
  DriveCustomerManagedOAuthSection,
  DriveJsonUploadSection,
} from "./Credential";
import {
  Credential,
  GoogleDriveCredentialJson,
  GoogleDriveServiceAccountCredentialJson,
} from "@/lib/connectors/credentials";
import { useUser } from "@/providers/UserProvider";
import {
  useGoogleAppCredential,
  useGoogleServiceAccountKey,
  useGoogleCredentials,
  useConnectorsByCredentialId,
  checkCredentialsFetched,
  filterUploadedCredentials,
  checkConnectorsExist,
  refreshAllGoogleData,
} from "@/lib/googleConnector";
import { useAppLanguage } from "@/providers/AppLanguageProvider";

const GDriveMain = () => {
  const { isAdmin, user } = useUser();
  const { language } = useAppLanguage();
  const copy =
    language === "es"
      ? {
          manualTitle: "Usa tus propias credenciales",
          manualDescription:
            "Esta ruta avanzada es para organizaciones que quieren gestionar su propio cliente OAuth de Google. El flujo recomendado para casi todos sigue siendo Conectar con Google con el cliente administrado por la plataforma.",
          customerOauthTitle: "OAuth gestionado por el cliente",
          legacyTitle: "Fallback legacy por JSON",
          finishTitle: "Completa el fallback legacy",
          showLegacySetup: "Mostrar fallback legacy",
          hideLegacySetup: "Ocultar fallback legacy",
          loadCredentialsError: "No se pudieron cargar las credenciales.",
          loadGoogleDriveCredentialsError:
            "No se pudieron cargar las credenciales de Google Drive.",
          loadAppCredentialsError:
            "Error al cargar las credenciales de la app de Google Drive. Contacta a un administrador.",
          loadAssociatedConnectorsError:
            "No se pudieron cargar los conectores asociados de Google Drive.",
        }
      : {
          manualTitle: "Use your own credentials",
          manualDescription:
            "This advanced path is for organizations that want to manage their own Google OAuth client. The recommended flow for almost everyone remains Connect with Google with the platform-managed client.",
          customerOauthTitle: "Customer-managed OAuth",
          legacyTitle: "Legacy JSON fallback",
          finishTitle: "Complete the legacy fallback",
          showLegacySetup: "Show legacy fallback",
          hideLegacySetup: "Hide legacy fallback",
          loadCredentialsError: "Failed to load credentials.",
          loadGoogleDriveCredentialsError:
            "Failed to load Google Drive credentials.",
          loadAppCredentialsError:
            "Error loading Google Drive app credentials. Contact an administrator.",
          loadAssociatedConnectorsError:
            "Failed to load Google Drive associated connectors.",
        };

  // Get app credential and service account key
  const {
    data: appCredentialData,
    isLoading: isAppCredentialLoading,
    error: isAppCredentialError,
  } = useGoogleAppCredential("google_drive");

  const {
    data: serviceAccountKeyData,
    isLoading: isServiceAccountKeyLoading,
    error: isServiceAccountKeyError,
  } = useGoogleServiceAccountKey("google_drive");

  // Get all public credentials
  const {
    data: credentialsData,
    isLoading: isCredentialsLoading,
    error: credentialsError,
    refreshCredentials,
  } = usePublicCredentials();

  // Get Google Drive-specific credentials
  const {
    data: googleDriveCredentials,
    isLoading: isGoogleDriveCredentialsLoading,
    error: googleDriveCredentialsError,
  } = useGoogleCredentials(ValidSources.GoogleDrive);

  // Filter uploaded credentials and get credential ID
  const { credential_id } = filterUploadedCredentials(googleDriveCredentials);
  const [legacySetupOpen, setLegacySetupOpen] = useState(false);

  // Get connectors for the credential ID
  const {
    data: googleDriveConnectors,
    isLoading: isGoogleDriveConnectorsLoading,
    error: googleDriveConnectorsError,
    refreshConnectorsByCredentialId,
  } = useConnectorsByCredentialId(credential_id);

  // Check if credentials were successfully fetched
  const {
    appCredentialSuccessfullyFetched,
    serviceAccountKeySuccessfullyFetched,
  } = checkCredentialsFetched(
    appCredentialData,
    isAppCredentialError,
    serviceAccountKeyData,
    isServiceAccountKeyError
  );

  // Handle refresh of all data
  const handleRefresh = () => {
    refreshCredentials();
    refreshConnectorsByCredentialId();
    refreshAllGoogleData(ValidSources.GoogleDrive);
  };

  // Loading state
  if (
    (!appCredentialSuccessfullyFetched && isAppCredentialLoading) ||
    (!serviceAccountKeySuccessfullyFetched && isServiceAccountKeyLoading) ||
    (!credentialsData && isCredentialsLoading) ||
    (!googleDriveCredentials && isGoogleDriveCredentialsLoading) ||
    (!googleDriveConnectors && isGoogleDriveConnectorsLoading)
  ) {
    return (
      <div className="mx-auto">
        <LoadingAnimation text="" />
      </div>
    );
  }

  // Error states
  if (credentialsError || !credentialsData) {
    return <ErrorCallout errorTitle={copy.loadCredentialsError} />;
  }

  if (googleDriveCredentialsError || !googleDriveCredentials) {
    return <ErrorCallout errorTitle={copy.loadGoogleDriveCredentialsError} />;
  }

  if (
    !appCredentialSuccessfullyFetched ||
    !serviceAccountKeySuccessfullyFetched
  ) {
    return <ErrorCallout errorTitle={copy.loadAppCredentialsError} />;
  }

  if (googleDriveConnectorsError) {
    return <ErrorCallout errorTitle={copy.loadAssociatedConnectorsError} />;
  }

  // Check if connectors exist
  const connectorAssociated = checkConnectorsExist(googleDriveConnectors);

  // Get the uploaded OAuth credential
  const googleDriveCustomerManagedCredential:
    | Credential<GoogleDriveCredentialJson>
    | undefined = credentialsData.find(
    (credential) =>
      credential.credential_json?.google_tokens &&
      credential.admin_public &&
      credential.source === "google_drive" &&
      credential.credential_json.authentication_method === "customer_oauth"
  );

  const googleDriveLegacyUploadedCredential:
    | Credential<GoogleDriveCredentialJson>
    | undefined = credentialsData.find(
    (credential) =>
      credential.credential_json?.google_tokens &&
      credential.admin_public &&
      credential.source === "google_drive" &&
      credential.credential_json.authentication_method === "uploaded"
  );

  // Get the service account credential
  const googleDriveServiceAccountCredential:
    | Credential<GoogleDriveServiceAccountCredentialJson>
    | undefined = credentialsData.find(
    (credential) =>
      credential.credential_json?.google_service_account_key &&
      credential.source === "google_drive"
  );

  return (
    <>
      <Title className="mb-2 mt-6">{copy.manualTitle}</Title>
      <p className="mb-3 text-sm text-text-03">{copy.manualDescription}</p>
      <Title className="mb-2 mt-6">{copy.customerOauthTitle}</Title>
      <DriveCustomerManagedOAuthSection
        existingCredential={googleDriveCustomerManagedCredential}
        connectorAssociated={connectorAssociated}
        refreshCredentials={handleRefresh}
        isAdmin={isAdmin}
      />

      <div className="mt-8">
        <Button
          prominence="secondary"
          type="button"
          onClick={() => setLegacySetupOpen((currentValue) => !currentValue)}
        >
          {legacySetupOpen ? copy.hideLegacySetup : copy.showLegacySetup}
        </Button>
      </div>

      {legacySetupOpen && (
        <>
          <Title className="mb-2 mt-6">{copy.legacyTitle}</Title>
          <DriveJsonUploadSection
            appCredentialData={appCredentialData}
            serviceAccountCredentialData={serviceAccountKeyData}
            isAdmin={isAdmin}
            onSuccess={handleRefresh}
            existingAuthCredential={Boolean(
              googleDriveLegacyUploadedCredential ||
                googleDriveServiceAccountCredential
            )}
          />

          {isAdmin &&
            (appCredentialData?.client_id ||
              serviceAccountKeyData?.service_account_email) && (
              <>
                <Title className="mb-2 mt-6">{copy.finishTitle}</Title>
                <DriveAuthSection
                  refreshCredentials={handleRefresh}
                  googleDrivePublicUploadedCredential={
                    googleDriveLegacyUploadedCredential
                  }
                  googleDriveServiceAccountCredential={
                    googleDriveServiceAccountCredential
                  }
                  appCredentialData={appCredentialData}
                  serviceAccountKeyData={serviceAccountKeyData}
                  connectorAssociated={connectorAssociated}
                  user={user}
                />
              </>
            )}
        </>
      )}
    </>
  );
};

export default GDriveMain;
