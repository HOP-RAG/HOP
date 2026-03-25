import { toast } from "@/hooks/useToast";
import React, { useState, useEffect } from "react";
import { useSWRConfig } from "swr";
import * as Yup from "yup";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { adminDeleteCredential } from "@/lib/credential";
import { setupGoogleDriveOAuth } from "@/lib/googleDrive";
import { TextFormField, SectionHeader } from "@/components/Field";
import { Form, Formik } from "formik";
import { User } from "@/lib/types";
import { Button } from "@opal/components";
import { Disabled } from "@opal/core";
import {
  Credential,
  GoogleDriveCredentialJson,
  GoogleDriveServiceAccountCredentialJson,
} from "@/lib/connectors/credentials";
import { refreshAllGoogleData } from "@/lib/googleConnector";
import { ValidSources } from "@/lib/types";
import { buildSimilarCredentialInfoURL } from "@/app/admin/connector/[ccPairId]/lib";
import { startConnectorOAuthWithCustomClient } from "@/lib/connectors/connectorAccounts";
import { getSourceDocLink } from "@/lib/sources";
import { FiFile, FiCheck, FiLink, FiAlertTriangle } from "react-icons/fi";
import { cn, truncateString } from "@/lib/utils";
import { useAppLanguage } from "@/providers/AppLanguageProvider";

type GoogleDriveCredentialJsonTypes = "authorized_user" | "service_account";

function getGoogleDriveManualCopy(language: "en" | "es") {
  if (language === "es") {
    return {
      invalidCredentialType:
        "Tipo de credencial desconocido. Esperabamos 'OAuth Web application' o 'Service Account'.",
      invalidFile: "Archivo invalido",
      uploadAppSuccess: "Credenciales OAuth subidas correctamente",
      uploadAppFailed: "No se pudieron subir las credenciales OAuth",
      uploadServiceSuccess: "JSON de cuenta de servicio subido correctamente",
      uploadServiceFailed: "No se pudo subir el JSON de cuenta de servicio",
      uploadJsonOnly: "Por favor sube un archivo JSON",
      uploadingFile: (name: string) => `Subiendo ${name}...`,
      dropJsonHere: "Suelta el archivo JSON aqui",
      selectJsonFile:
        "Selecciona o arrastra el archivo JSON de credenciales...",
      nonAdminWarning:
        "Los curators no pueden configurar las credenciales de Google Drive. Para agregar este conector, contacta a un administrador.",
      manualIntro:
        "Este fallback legacy acepta un JSON de cliente OAuth Web application o un JSON de cuenta de servicio. Usalo solo si necesitas una configuracion manual o por compatibilidad.",
      viewInstructions: "Ver instrucciones detalladas",
      deleteCredentials: "Eliminar credenciales subidas",
      authenticationComplete: "Autenticacion completada",
      authenticationCompleteBody:
        "Las credenciales legacy de Google Drive se cargaron y autenticaron correctamente.",
      revokeAccess: "Revocar acceso",
      completeStepOne:
        "Completa primero la carga manual subiendo credenciales OAuth o un JSON de cuenta de servicio.",
      primaryAdminLabel: "Correo del admin principal:",
      primaryAdminSubtext:
        "Ingresa el correo de un admin o owner de la organizacion de Google que posee los Google Drives que quieres indexar.",
      creating: "Creando...",
      createCredential: "Crear credencial",
      oauthExplanation:
        "Ahora autentica Google Drive via OAuth. Esto nos da acceso de lectura a los documentos que tu cuenta puede ver en Drive.",
      authenticating: "Autenticando...",
      authenticate: "Autenticar con Google Drive",
      deleteServiceAccountSuccess:
        "Se elimino correctamente el JSON de cuenta de servicio",
      deleteAppSuccess: "Se eliminaron correctamente las credenciales OAuth",
      deleteFailed: "No se pudieron eliminar las credenciales",
      revokeBlocked:
        "No puedes revocar la credencial de Google Drive mientras siga asociada a algun conector. Elimina primero los conectores asociados y luego vuelve a intentarlo.",
      revokeSuccess: "La credencial de Google Drive se revoco correctamente",
      validEmail: "Debe ser un correo valido",
      required: "Obligatorio",
      createServiceAccountSuccess:
        "La credencial de cuenta de servicio se creo correctamente",
      createServiceAccountFailed:
        "No se pudo crear la credencial de cuenta de servicio",
      authenticateFailed: "No se pudo autenticar con Google Drive",
      genericFileName: "archivo",
      customerOauthTitle: "Cliente OAuth propio",
      customerOauthDescription:
        "Usa tu propio cliente OAuth de Google solo si tu organizacion quiere gestionar su propia app en Google Cloud. ACTIVA seguira almacenando los tokens del conector de forma segura.",
      customerOauthConnectedBody:
        "Esta conexion usa un cliente OAuth gestionado por el cliente y ya tiene permisos para Google Drive.",
      connectWithOwnClient: "Conectar con tu app de Google",
      connectingWithOwnClient: "Conectando con tu app...",
      clientIdLabel: "Google OAuth Client ID:",
      clientIdSubtext:
        "Client ID de tu app Web en Google Cloud para el acceso a Google Drive.",
      clientSecretLabel: "Google OAuth Client Secret:",
      clientSecretSubtext:
        "Client secret del mismo cliente OAuth Web. Se usara solo para iniciar y refrescar esta conexion cifrada.",
      legacyTitle: "JSON manual legacy",
      legacyDescription:
        "Solo usa este fallback si dependes del flujo antiguo por JSON o si necesitas una cuenta de servicio.",
      showLegacySetup: "Mostrar fallback legacy",
      hideLegacySetup: "Ocultar fallback legacy",
    };
  }

  return {
    invalidCredentialType:
      "Unknown credential type. Expected 'OAuth Web application' or 'Service Account'.",
    invalidFile: "Invalid file",
    uploadAppSuccess: "OAuth app credentials uploaded successfully",
    uploadAppFailed: "Failed to upload OAuth app credentials",
    uploadServiceSuccess: "Service account JSON uploaded successfully",
    uploadServiceFailed: "Failed to upload service account JSON",
    uploadJsonOnly: "Please upload a JSON file",
    uploadingFile: (name: string) => `Uploading ${name}...`,
    dropJsonHere: "Drop JSON file here",
    selectJsonFile: "Select or drag JSON credentials file...",
    nonAdminWarning:
      "Curators cannot configure Google Drive credentials. To add this connector, contact an administrator.",
    manualIntro:
      "This legacy fallback accepts either a Web application OAuth client JSON or a service account JSON. Use it only when you need manual or compatibility setup.",
    viewInstructions: "View detailed setup instructions",
    deleteCredentials: "Delete uploaded credentials",
    authenticationComplete: "Authentication complete",
    authenticationCompleteBody:
      "Your legacy Google Drive credentials were uploaded and authenticated successfully.",
    revokeAccess: "Revoke access",
    completeStepOne:
      "Please complete the manual upload first by providing either OAuth credentials or a service account JSON.",
    primaryAdminLabel: "Primary Admin Email:",
    primaryAdminSubtext:
      "Enter the email of an admin or owner of the Google organization that owns the Google Drives you want to index.",
    creating: "Creating...",
    createCredential: "Create credential",
    oauthExplanation:
      "Next, authenticate with Google Drive via OAuth. This gives us read access to the documents your Google account can access in Drive.",
    authenticating: "Authenticating...",
    authenticate: "Authenticate with Google Drive",
    deleteServiceAccountSuccess: "Service account JSON deleted successfully",
    deleteAppSuccess: "OAuth app credentials deleted successfully",
    deleteFailed: "Failed to delete credentials",
    revokeBlocked:
      "Cannot revoke the Google Drive credential while any connector is still associated with it. Delete the linked connectors first, then try again.",
    revokeSuccess: "Google Drive credential revoked successfully",
    validEmail: "Must be a valid email",
    required: "Required",
    createServiceAccountSuccess:
      "Service account credential created successfully",
    createServiceAccountFailed: "Failed to create service account credential",
    authenticateFailed: "Failed to authenticate with Google Drive",
    genericFileName: "file",
    customerOauthTitle: "Customer-managed OAuth client",
    customerOauthDescription:
      "Use your own Google OAuth client only if your organization wants to manage its own Google Cloud app. ACTIVA will still store the connector tokens securely.",
    customerOauthConnectedBody:
      "This connection uses a customer-managed OAuth client and already has Google Drive access.",
    connectWithOwnClient: "Connect with your Google app",
    connectingWithOwnClient: "Connecting with your app...",
    clientIdLabel: "Google OAuth Client ID:",
    clientIdSubtext:
      "Client ID from your Google Cloud Web application for Google Drive access.",
    clientSecretLabel: "Google OAuth Client Secret:",
    clientSecretSubtext:
      "Client secret from the same Web OAuth client. It is only used to start and refresh this encrypted connector credential.",
    legacyTitle: "Legacy manual JSON",
    legacyDescription:
      "Use this fallback only if you depend on the older JSON-based flow or need a service account.",
    showLegacySetup: "Show legacy fallback",
    hideLegacySetup: "Hide legacy fallback",
  };
}

export const DriveJsonUpload = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { mutate } = useSWRConfig();
  const { language } = useAppLanguage();
  const copy = getGoogleDriveManualCopy(language);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | undefined>();
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      if (!loadEvent?.target?.result) {
        setIsUploading(false);
        return;
      }

      const credentialJsonStr = loadEvent.target.result as string;

      // Check credential type
      let credentialFileType: GoogleDriveCredentialJsonTypes;
      try {
        const appCredentialJson = JSON.parse(credentialJsonStr);
        if (appCredentialJson.web) {
          credentialFileType = "authorized_user";
        } else if (appCredentialJson.type === "service_account") {
          credentialFileType = "service_account";
        } else {
          throw new Error(copy.invalidCredentialType);
        }
      } catch (e) {
        toast.error(`${copy.invalidFile} - ${e}`);
        setIsUploading(false);
        return;
      }

      if (credentialFileType === "authorized_user") {
        const response = await fetch(
          "/api/manage/admin/connector/google-drive/app-credential",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: credentialJsonStr,
          }
        );
        if (response.ok) {
          toast.success(copy.uploadAppSuccess);
          mutate("/api/manage/admin/connector/google-drive/app-credential");
          if (onSuccess) {
            onSuccess();
          }
        } else {
          const errorMsg = await response.text();
          toast.error(`${copy.uploadAppFailed} - ${errorMsg}`);
        }
      }

      if (credentialFileType === "service_account") {
        const response = await fetch(
          "/api/manage/admin/connector/google-drive/service-account-key",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: credentialJsonStr,
          }
        );
        if (response.ok) {
          toast.success(copy.uploadServiceSuccess);
          mutate(
            "/api/manage/admin/connector/google-drive/service-account-key"
          );
          if (onSuccess) {
            onSuccess();
          }
        } else {
          const errorMsg = await response.text();
          toast.error(`${copy.uploadServiceFailed} - ${errorMsg}`);
        }
      }
      setIsUploading(false);
    };

    reader.readAsText(file);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isUploading) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (
        file !== undefined &&
        (file.type === "application/json" || file.name.endsWith(".json"))
      ) {
        handleFileUpload(file);
      } else {
        toast.error(copy.uploadJsonOnly);
      }
    }
  };

  return (
    <div className="flex flex-col mt-4">
      <div className="flex items-center">
        <div className="relative flex flex-1 items-center">
          <label
            className={cn(
              "flex h-10 items-center justify-center w-full px-4 py-2 border border-dashed rounded-md transition-colors",
              isUploading
                ? "opacity-70 cursor-not-allowed border-background-400 bg-background-50/30"
                : isDragging
                  ? "bg-background-50/50 border-primary dark:border-primary"
                  : "cursor-pointer hover:bg-background-50/30 hover:border-primary dark:hover:border-primary border-background-300 dark:border-background-600"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="flex items-center space-x-2">
              {isUploading ? (
                <div className="h-4 w-4 border-t-2 border-b-2 border-primary rounded-full animate-spin"></div>
              ) : (
                <FiFile className="h-4 w-4 text-text-500" />
              )}
              <span className="text-sm text-text-500">
                {isUploading
                  ? copy.uploadingFile(
                      truncateString(fileName || copy.genericFileName, 50)
                    )
                  : isDragging
                    ? copy.dropJsonHere
                    : truncateString(fileName || copy.selectJsonFile, 50)}
              </span>
            </div>
            <input
              className="sr-only"
              type="file"
              accept=".json"
              disabled={isUploading}
              onChange={(event) => {
                if (!event.target.files?.length) {
                  return;
                }
                const file = event.target.files[0];
                if (file === undefined) {
                  return;
                }
                handleFileUpload(file);
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

interface DriveJsonUploadSectionProps {
  appCredentialData?: { client_id: string };
  serviceAccountCredentialData?: { service_account_email: string };
  isAdmin: boolean;
  onSuccess?: () => void;
  existingAuthCredential?: boolean;
}

export const DriveJsonUploadSection = ({
  appCredentialData,
  serviceAccountCredentialData,
  isAdmin,
  onSuccess,
  existingAuthCredential,
}: DriveJsonUploadSectionProps) => {
  const { mutate } = useSWRConfig();
  const { language } = useAppLanguage();
  const copy = getGoogleDriveManualCopy(language);
  const [localServiceAccountData, setLocalServiceAccountData] = useState(
    serviceAccountCredentialData
  );
  const [localAppCredentialData, setLocalAppCredentialData] =
    useState(appCredentialData);

  // Update local state when props change
  useEffect(() => {
    setLocalServiceAccountData(serviceAccountCredentialData);
    setLocalAppCredentialData(appCredentialData);
  }, [serviceAccountCredentialData, appCredentialData]);

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      refreshAllGoogleData(ValidSources.GoogleDrive);
    }
  };

  if (!isAdmin) {
    return (
      <div>
        <div className="flex items-start py-3 px-4 bg-yellow-50/30 dark:bg-yellow-900/5 rounded">
          <FiAlertTriangle className="text-yellow-500 h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{copy.nonAdminWarning}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm mb-3">{copy.manualIntro}</p>
      <div className="mb-4">
        <a
          className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm"
          target="_blank"
          href={getSourceDocLink(ValidSources.GoogleDrive) || "#"}
          rel="noreferrer"
        >
          <FiLink className="h-3 w-3" />
          {copy.viewInstructions}
        </a>
      </div>

      {(localServiceAccountData?.service_account_email ||
        localAppCredentialData?.client_id) && (
        <div className="mb-4">
          <div className="relative flex flex-1 items-center">
            <label
              className={cn(
                "flex h-10 items-center justify-center w-full px-4 py-2 border border-dashed rounded-md transition-colors",
                false
                  ? "opacity-70 cursor-not-allowed border-background-400 bg-background-50/30"
                  : "cursor-pointer hover:bg-background-50/30 hover:border-primary dark:hover:border-primary border-background-300 dark:border-background-600"
              )}
            >
              <div className="flex items-center space-x-2">
                {false ? (
                  <div className="h-4 w-4 border-t-2 border-b-2 border-primary rounded-full animate-spin"></div>
                ) : (
                  <FiFile className="h-4 w-4 text-text-500" />
                )}
                <span className="text-sm text-text-500">
                  {truncateString(
                    localServiceAccountData?.service_account_email ||
                      localAppCredentialData?.client_id ||
                      "",
                    50
                  )}
                </span>
              </div>
            </label>
          </div>
          {isAdmin && !existingAuthCredential && (
            <div className="mt-2">
              <Button
                variant="danger"
                onClick={async () => {
                  const endpoint =
                    localServiceAccountData?.service_account_email
                      ? "/api/manage/admin/connector/google-drive/service-account-key"
                      : "/api/manage/admin/connector/google-drive/app-credential";

                  const response = await fetch(endpoint, {
                    method: "DELETE",
                  });

                  if (response.ok) {
                    mutate(endpoint);
                    // Also mutate the credential endpoints to ensure Step 2 is reset
                    mutate(
                      buildSimilarCredentialInfoURL(ValidSources.GoogleDrive)
                    );

                    // Add additional mutations to refresh all credential-related endpoints
                    mutate(
                      "/api/manage/admin/connector/google-drive/credentials"
                    );
                    mutate(
                      "/api/manage/admin/connector/google-drive/public-credential"
                    );
                    mutate(
                      "/api/manage/admin/connector/google-drive/service-account-credential"
                    );

                    toast.success(
                      localServiceAccountData
                        ? copy.deleteServiceAccountSuccess
                        : copy.deleteAppSuccess
                    );
                    // Immediately update local state
                    if (localServiceAccountData) {
                      setLocalServiceAccountData(undefined);
                    } else {
                      setLocalAppCredentialData(undefined);
                    }
                    handleSuccess();
                  } else {
                    const errorMsg = await response.text();
                    toast.error(`${copy.deleteFailed} - ${errorMsg}`);
                  }
                }}
              >
                {copy.deleteCredentials}
              </Button>
            </div>
          )}
        </div>
      )}

      {!(
        localServiceAccountData?.service_account_email ||
        localAppCredentialData?.client_id
      ) && <DriveJsonUpload onSuccess={handleSuccess} />}
    </div>
  );
};

interface DriveCredentialSectionProps {
  googleDrivePublicUploadedCredential?: Credential<GoogleDriveCredentialJson>;
  googleDriveServiceAccountCredential?: Credential<GoogleDriveServiceAccountCredentialJson>;
  serviceAccountKeyData?: { service_account_email: string };
  appCredentialData?: { client_id: string };
  refreshCredentials: () => void;
  connectorAssociated: boolean;
  user: User | null;
}

async function handleRevokeAccess(
  connectorAssociated: boolean,
  existingCredential:
    | Credential<GoogleDriveCredentialJson>
    | Credential<GoogleDriveServiceAccountCredentialJson>,
  refreshCredentials: () => void,
  copy: ReturnType<typeof getGoogleDriveManualCopy>
) {
  if (connectorAssociated) {
    toast.error(copy.revokeBlocked);
    return;
  }

  await adminDeleteCredential(existingCredential.id);
  toast.success(copy.revokeSuccess);

  refreshCredentials();
}

interface DriveCustomerManagedOAuthSectionProps {
  existingCredential?: Credential<GoogleDriveCredentialJson>;
  connectorAssociated: boolean;
  refreshCredentials: () => void;
  isAdmin: boolean;
}

export function DriveCustomerManagedOAuthSection({
  existingCredential,
  connectorAssociated,
  refreshCredentials,
  isAdmin,
}: DriveCustomerManagedOAuthSectionProps) {
  const { language } = useAppLanguage();
  const copy = getGoogleDriveManualCopy(language);

  if (!isAdmin) {
    return (
      <div className="flex items-start py-3 px-4 bg-yellow-50/30 dark:bg-yellow-900/5 rounded mt-4">
        <FiAlertTriangle className="text-yellow-500 h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
        <p className="text-sm">{copy.nonAdminWarning}</p>
      </div>
    );
  }

  if (existingCredential) {
    return (
      <div className="mt-4">
        <div className="py-3 px-4 bg-blue-50/30 dark:bg-blue-900/5 rounded mb-4 flex items-start">
          <FiCheck className="text-blue-500 h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-medium block">
              {copy.authenticationComplete}
            </span>
            <p className="text-sm mt-1 text-text-500 dark:text-text-400 break-words">
              {copy.customerOauthConnectedBody}
            </p>
          </div>
        </div>
        <Button
          variant="danger"
          onClick={async () => {
            await handleRevokeAccess(
              connectorAssociated,
              existingCredential,
              refreshCredentials,
              copy
            );
          }}
        >
          {copy.revokeAccess}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="text-sm mb-4">{copy.customerOauthDescription}</p>
      <Formik
        initialValues={{
          client_id: "",
          client_secret: "",
        }}
        validationSchema={Yup.object().shape({
          client_id: Yup.string().required(copy.required),
          client_secret: Yup.string().required(copy.required),
        })}
        onSubmit={async (values, formikHelpers) => {
          formikHelpers.setSubmitting(true);
          try {
            const redirectUrl = await startConnectorOAuthWithCustomClient(
              ValidSources.GoogleDrive,
              {
                client_id: values.client_id,
                client_secret: values.client_secret,
              }
            );
            window.location.href = redirectUrl;
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : copy.authenticateFailed
            );
            formikHelpers.setSubmitting(false);
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <TextFormField
              name="client_id"
              label={copy.clientIdLabel}
              subtext={copy.clientIdSubtext}
            />
            <TextFormField
              name="client_secret"
              label={copy.clientSecretLabel}
              subtext={copy.clientSecretSubtext}
              type="password"
            />
            <div className="flex">
              <Disabled disabled={isSubmitting}>
                <Button type="submit">
                  {isSubmitting
                    ? copy.connectingWithOwnClient
                    : copy.connectWithOwnClient}
                </Button>
              </Disabled>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}

export const DriveAuthSection = ({
  googleDrivePublicUploadedCredential,
  googleDriveServiceAccountCredential,
  serviceAccountKeyData,
  appCredentialData,
  refreshCredentials,
  connectorAssociated,
  user,
}: DriveCredentialSectionProps) => {
  const router = useRouter();
  const { language } = useAppLanguage();
  const copy = getGoogleDriveManualCopy(language);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [localServiceAccountData, setLocalServiceAccountData] = useState(
    serviceAccountKeyData
  );
  const [localAppCredentialData, setLocalAppCredentialData] =
    useState(appCredentialData);
  const [
    localGoogleDrivePublicCredential,
    setLocalGoogleDrivePublicCredential,
  ] = useState(googleDrivePublicUploadedCredential);
  const [
    localGoogleDriveServiceAccountCredential,
    setLocalGoogleDriveServiceAccountCredential,
  ] = useState(googleDriveServiceAccountCredential);

  // Update local state when props change
  useEffect(() => {
    setLocalServiceAccountData(serviceAccountKeyData);
    setLocalAppCredentialData(appCredentialData);
    setLocalGoogleDrivePublicCredential(googleDrivePublicUploadedCredential);
    setLocalGoogleDriveServiceAccountCredential(
      googleDriveServiceAccountCredential
    );
  }, [
    serviceAccountKeyData,
    appCredentialData,
    googleDrivePublicUploadedCredential,
    googleDriveServiceAccountCredential,
  ]);

  const existingCredential =
    localGoogleDrivePublicCredential ||
    localGoogleDriveServiceAccountCredential;
  if (existingCredential) {
    return (
      <div>
        <div className="mt-4">
          <div className="py-3 px-4 bg-blue-50/30 dark:bg-blue-900/5 rounded mb-4 flex items-start">
            <FiCheck className="text-blue-500 h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-medium block">
                {copy.authenticationComplete}
              </span>
              <p className="text-sm mt-1 text-text-500 dark:text-text-400 break-words">
                {copy.authenticationCompleteBody}
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            onClick={async () => {
              handleRevokeAccess(
                connectorAssociated,
                existingCredential,
                refreshCredentials,
                copy
              );
            }}
          >
            {copy.revokeAccess}
          </Button>
        </div>
      </div>
    );
  }

  // If no credentials are uploaded, show message to complete step 1 first
  if (
    !localServiceAccountData?.service_account_email &&
    !localAppCredentialData?.client_id
  ) {
    return (
      <div>
        <SectionHeader>{copy.authenticate}</SectionHeader>
        <div className="mt-4">
          <div className="flex items-start py-3 px-4 bg-yellow-50/30 dark:bg-yellow-900/5 rounded">
            <FiAlertTriangle className="text-yellow-500 h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{copy.completeStepOne}</p>
          </div>
        </div>
      </div>
    );
  }

  if (localServiceAccountData?.service_account_email) {
    return (
      <div>
        <div className="mt-4">
          <Formik
            initialValues={{
              google_primary_admin: user?.email || "",
            }}
            validationSchema={Yup.object().shape({
              google_primary_admin: Yup.string()
                .email(copy.validEmail)
                .required(copy.required),
            })}
            onSubmit={async (values, formikHelpers) => {
              formikHelpers.setSubmitting(true);
              try {
                const response = await fetch(
                  "/api/manage/admin/connector/google-drive/service-account-credential",
                  {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      google_primary_admin: values.google_primary_admin,
                    }),
                  }
                );

                if (response.ok) {
                  toast.success(copy.createServiceAccountSuccess);
                  refreshCredentials();
                } else {
                  const errorMsg = await response.text();
                  toast.error(
                    `${copy.createServiceAccountFailed} - ${errorMsg}`
                  );
                }
              } catch (error) {
                toast.error(`${copy.createServiceAccountFailed} - ${error}`);
              } finally {
                formikHelpers.setSubmitting(false);
              }
            }}
          >
            {({ isSubmitting }) => (
              <Form>
                <TextFormField
                  name="google_primary_admin"
                  label={copy.primaryAdminLabel}
                  subtext={copy.primaryAdminSubtext}
                />
                <div className="flex">
                  <Disabled disabled={isSubmitting}>
                    <Button type="submit">
                      {isSubmitting ? copy.creating : copy.createCredential}
                    </Button>
                  </Disabled>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    );
  }

  if (localAppCredentialData?.client_id) {
    return (
      <div>
        <div className="bg-background-50/30 dark:bg-background-900/20 rounded mb-4">
          <p className="text-sm">{copy.oauthExplanation}</p>
        </div>
        <Disabled disabled={isAuthenticating}>
          <Button
            onClick={async () => {
              setIsAuthenticating(true);
              try {
                const [authUrl, errorMsg] = await setupGoogleDriveOAuth({
                  isAdmin: true,
                  name: "OAuth (uploaded)",
                });

                if (authUrl) {
                  router.push(authUrl as Route);
                } else {
                  toast.error(errorMsg || copy.authenticateFailed);
                  setIsAuthenticating(false);
                }
              } catch (error) {
                toast.error(`${copy.authenticateFailed} - ${error}`);
                setIsAuthenticating(false);
              }
            }}
          >
            {isAuthenticating ? copy.authenticating : copy.authenticate}
          </Button>
        </Disabled>
      </div>
    );
  }

  // This code path should not be reached with the new conditions above
  return null;
};
