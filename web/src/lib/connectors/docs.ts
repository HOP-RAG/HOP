import {
  credentialTemplates,
  getDisplayNameForCredentialKey,
} from "@/lib/connectors/credentials";
import { connectorConfigs } from "@/lib/connectors/connectors";
import { HOST_URL } from "@/lib/constants";
import { SourceCategory } from "@/lib/search/interfaces";
import { getSourceMetadata, listSourceMetadata } from "@/lib/sources";
import {
  federatedSourceToRegularSource,
  ValidSources,
  type ConfigurableSources,
} from "@/lib/types";

export type ConnectorDocsLanguage = "en" | "es";

export interface LocalizedCopy {
  en: string;
  es: string;
}

export interface ConnectorDocsPoint {
  title: LocalizedCopy;
  body: LocalizedCopy;
}

export interface ConnectorDocsStep extends ConnectorDocsPoint {
  fields?: LocalizedCopy[];
}

export interface ConnectorDocsFaqItem {
  question: LocalizedCopy;
  answer: LocalizedCopy;
}

export interface ConnectorDocsFieldExample {
  field: string;
  example: string;
}

export interface ConnectorProviderLink {
  label: string;
  url: string;
}

export interface ConnectorDocsEntry {
  source: ConfigurableSources;
  slug: string;
  authSummary: LocalizedCopy;
  tagline: LocalizedCopy;
  overview: {
    description: LocalizedCopy;
    useCases: LocalizedCopy[];
  };
  beforeYouStart: ConnectorDocsPoint[];
  setup: ConnectorDocsStep[];
  permissions: ConnectorDocsPoint[];
  mcp: ConnectorDocsPoint[];
  verification: ConnectorDocsPoint[];
  troubleshooting: ConnectorDocsPoint[];
  faq: ConnectorDocsFaqItem[];
  fieldExamples: ConnectorDocsFieldExample[];
  providerLinks: ConnectorProviderLink[];
  setupUrl: string;
  secondarySetupUrl?: string;
}

const CONNECTOR_DOCS_INDEX_PATH = "/connectors/docs";

const CONNECTOR_DOC_SOURCE_EXCLUSIONS = new Set<ValidSources>([
  ValidSources.CraftFile,
  ValidSources.UserFile,
  ValidSources.IngestionApi,
  ValidSources.NotApplicable,
  ValidSources.FederatedSlack,
]);

const SPECIAL_AUTH_SUMMARIES: Partial<Record<ConfigurableSources, LocalizedCopy>> =
  {
    google_drive: copy(
      "OAuth client JSON or Google service account",
      "JSON de cliente OAuth o cuenta de servicio de Google"
    ),
    gmail: copy(
      "OAuth client JSON or Google service account",
      "JSON de cliente OAuth o cuenta de servicio de Google"
    ),
    slack: copy("Slack bot token or Slack OAuth", "Token de bot de Slack o OAuth de Slack"),
    confluence: copy(
      "Atlassian OAuth or access token",
      "OAuth de Atlassian o token de acceso"
    ),
    sharepoint: copy(
      "Microsoft Entra app with secret or certificate",
      "App de Microsoft Entra con secreto o certificado"
    ),
    teams: copy(
      "Microsoft Entra app with client secret",
      "App de Microsoft Entra con client secret"
    ),
    github: copy(
      "GitHub personal access token",
      "Personal access token de GitHub"
    ),
    notion: copy("Notion internal integration", "Integracion interna de Notion"),
    dropbox: copy("Dropbox app access token", "Access token de app de Dropbox"),
  };

const OFFICIAL_PROVIDER_LINKS: Partial<
  Record<ConfigurableSources, ConnectorProviderLink[]>
> = {
  google_drive: [
    {
      label: "Google Workspace: Create credentials",
      url: "https://developers.google.com/workspace/guides/create-credentials",
    },
    {
      label: "Google Drive API scopes",
      url: "https://developers.google.com/workspace/drive/api/guides/api-specific-auth",
    },
    {
      label: "Admin SDK Directory scopes",
      url: "https://developers.google.com/admin-sdk/directory/v1/guides/authorizing",
    },
    {
      label: "Google service accounts",
      url: "https://developers.google.com/identity/protocols/oauth2/service-account",
    },
  ],
  gmail: [
    {
      label: "Google Workspace: Create credentials",
      url: "https://developers.google.com/workspace/guides/create-credentials",
    },
    {
      label: "Gmail API scopes",
      url: "https://developers.google.com/workspace/gmail/api/auth/scopes",
    },
    {
      label: "Admin SDK Directory scopes",
      url: "https://developers.google.com/admin-sdk/directory/v1/guides/authorizing",
    },
    {
      label: "Google service accounts",
      url: "https://developers.google.com/identity/protocols/oauth2/service-account",
    },
  ],
  slack: [
    {
      label: "Slack OAuth V2",
      url: "https://api.slack.com/authentication/oauth-v2",
    },
    {
      label: "Slack scopes reference",
      url: "https://api.slack.com/scopes",
    },
  ],
  notion: [
    {
      label: "Notion authorization and internal integrations",
      url: "https://developers.notion.com/guides/get-started/authorization",
    },
  ],
  dropbox: [
    {
      label: "Dropbox OAuth guide",
      url: "https://developers.dropbox.com/oauth-guide",
    },
  ],
  github: [
    {
      label: "GitHub personal access tokens",
      url: "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens",
    },
    {
      label: "Fine-grained token permissions",
      url: "https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens",
    },
  ],
  sharepoint: [
    {
      label: "Register a Microsoft Entra application",
      url: "https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app",
    },
    {
      label: "Microsoft Graph permissions reference",
      url: "https://learn.microsoft.com/en-us/graph/permissions-reference",
    },
  ],
  teams: [
    {
      label: "Register a Microsoft Entra application",
      url: "https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app",
    },
    {
      label: "Microsoft Graph permissions reference",
      url: "https://learn.microsoft.com/en-us/graph/permissions-reference",
    },
  ],
  confluence: [
    {
      label: "Confluence Cloud OAuth 2.0 (3LO)",
      url: "https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/",
    },
    {
      label: "Confluence scopes reference",
      url: "https://developer.atlassian.com/cloud/confluence/scopes-for-oauth-2-3LO-and-forge-apps/",
    },
  ],
};

function copy(en: string, es: string): LocalizedCopy {
  return { en, es };
}

function joinWithAnd(values: string[], language: ConnectorDocsLanguage): string {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return values[0] || "";
  }

  if (values.length === 2) {
    return language === "es"
      ? `${values[0]} y ${values[1]}`
      : `${values[0]} and ${values[1]}`;
  }

  const last = values[values.length - 1];
  const rest = values.slice(0, -1).join(", ");
  return language === "es" ? `${rest} y ${last}` : `${rest}, and ${last}`;
}

function maybeAsConfigurableSource(
  source: ValidSources
): ConfigurableSources | null {
  if (CONNECTOR_DOC_SOURCE_EXCLUSIONS.has(source)) {
    return null;
  }

  return source as ConfigurableSources;
}

function getDocSources(): ConfigurableSources[] {
  return listSourceMetadata()
    .map((metadata) => maybeAsConfigurableSource(metadata.internalName))
    .filter((source): source is ConfigurableSources => Boolean(source));
}

function resolveLabel(
  value: string | ((currentCredential: any) => string) | undefined
): string {
  if (!value) {
    return "";
  }

  return typeof value === "function" ? value(null) : value;
}

function getCredentialFieldLabels(source: ConfigurableSources): string[] {
  const template = credentialTemplates[source] as
    | Record<string, unknown>
    | null
    | undefined;

  if (!template) {
    return [];
  }

  const fields = new Set<string>();

  if (Array.isArray((template as { authMethods?: unknown[] }).authMethods)) {
    const authMethods = (template as {
      authMethods: Array<{ fields?: Record<string, unknown> }>;
    }).authMethods;
    authMethods.forEach((method) => {
      Object.keys(method.fields || {}).forEach((fieldKey) => {
        fields.add(getDisplayNameForCredentialKey(fieldKey));
      });
    });
    return Array.from(fields);
  }

  Object.keys(template)
    .filter((fieldKey) => fieldKey !== "authentication_method")
    .forEach((fieldKey) => {
      fields.add(getDisplayNameForCredentialKey(fieldKey));
    });

  return Array.from(fields);
}

function getConnectorFieldLabels(source: ConfigurableSources): string[] {
  const config = connectorConfigs[source];
  const options = [...config.values, ...config.advanced_values];
  const labels = options
    .map((option) => resolveLabel(option.label))
    .filter(Boolean);

  return Array.from(new Set(labels));
}

function getBestExampleForField(fieldName: string): string {
  const normalized = fieldName.toLowerCase();

  if (normalized.includes("base url")) return "https://example.company.com";
  if (normalized.includes("wiki base")) return "https://company.atlassian.net/wiki";
  if (normalized.includes("jira base")) return "https://company.atlassian.net";
  if (normalized.includes("site")) return "https://contoso.sharepoint.com/sites/operations";
  if (normalized.includes("folder")) return "https://drive.google.com/drive/folders/abc123";
  if (normalized.includes("page id")) return "131368";
  if (normalized.includes("space key")) return "KB";
  if (normalized.includes("repository owner")) return "activa-ai";
  if (normalized.includes("repository name")) return "platform-web";
  if (normalized.includes("email")) return "admin@example.com";
  if (normalized.includes("domain")) return "company";
  if (normalized.includes("subdomain")) return "company";
  if (normalized.includes("workspace")) return "support";
  if (normalized.includes("team")) return "Support";
  if (normalized.includes("realm")) return "engineering";
  if (normalized.includes("url")) return "https://example.company.com";
  if (normalized.includes("token")) return "<paste-provider-token>";
  if (normalized.includes("secret")) return "<paste-provider-secret>";
  if (normalized.includes("password")) return "<paste-password>";
  if (normalized.includes("client id")) return "<provider-client-id>";
  if (normalized.includes("directory id")) return "<tenant-directory-id>";
  if (normalized.includes("key")) return "<paste-provider-key>";
  if (normalized.includes("id")) return "<provider-id>";

  return "<provider-value>";
}

function getFieldExamples(source: ConfigurableSources): ConnectorDocsFieldExample[] {
  const fieldNames = [
    ...getCredentialFieldLabels(source),
    ...getConnectorFieldLabels(source),
  ];

  return Array.from(new Set(fieldNames)).map((fieldName) => ({
    field: fieldName,
    example: getBestExampleForField(fieldName),
  }));
}

function getAuthSummary(source: ConfigurableSources): LocalizedCopy {
  const special = SPECIAL_AUTH_SUMMARIES[source];
  if (special) {
    return special;
  }

  const credentialFields = getCredentialFieldLabels(source);
  if (credentialFields.length === 0) {
    return copy(
      "No separate API secret required",
      "No requiere un secreto API separado"
    );
  }

  return copy(
    joinWithAnd(credentialFields, "en"),
    joinWithAnd(credentialFields, "es")
  );
}

function buildGenericDocsEntry(source: ConfigurableSources): ConnectorDocsEntry {
  const metadata = getSourceMetadata(source);
  const displayName = metadata.displayName;
  const credentialFields = getCredentialFieldLabels(source);
  const connectorFields = getConnectorFieldLabels(source);
  const setupUrl = metadata.adminUrl;

  const credentialTextEn =
    credentialFields.length > 0
      ? joinWithAnd(credentialFields, "en")
      : "no extra secret";
  const credentialTextEs =
    credentialFields.length > 0
      ? joinWithAnd(credentialFields, "es")
      : "sin secretos adicionales";

  const scopeTextEn =
    connectorFields.length > 0
      ? joinWithAnd(connectorFields, "en")
      : "the default sync scope";
  const scopeTextEs =
    connectorFields.length > 0
      ? joinWithAnd(connectorFields, "es")
      : "el alcance de sincronizacion por defecto";

  return {
    source,
    slug: sourceToConnectorDocsSlug(source),
    authSummary: getAuthSummary(source),
    tagline: copy(
      `Connect ${displayName} to ACTIVA with the exact fields the product expects.`,
      `Conecta ${displayName} a ACTIVA con los campos exactos que espera el producto.`
    ),
    overview: {
      description: copy(
        `${displayName} can be connected to ACTIVA so your team can index, refresh, and search content from this source inside the product.`,
        `${displayName} se puede conectar a ACTIVA para que tu equipo indexe, refresque y busque contenido de esta fuente dentro del producto.`
      ),
      useCases: [
        copy(
          `Centralize ${displayName} content for AI search and answers.`,
          `Centraliza contenido de ${displayName} para busqueda y respuestas con IA.`
        ),
        copy(
          "Scope ingestion to the exact areas you want ACTIVA to read.",
          "Limita la ingesta a las areas exactas que quieres que ACTIVA lea."
        ),
        copy(
          "Keep the source refreshed through the normal connector sync flow.",
          "Mantiene la fuente actualizada mediante el flujo normal de sincronizacion del conector."
        ),
      ],
    },
    beforeYouStart: [
      {
        title: copy("Confirm provider access", "Confirma el acceso al proveedor"),
        body: copy(
          `Use an account, token, or app that already has read access to the ${displayName} data you plan to index.`,
          `Usa una cuenta, token o app que ya tenga acceso de lectura a los datos de ${displayName} que quieres indexar.`
        ),
      },
      {
        title: copy("Prepare credentials", "Prepara las credenciales"),
        body: copy(
          `ACTIVA will ask you for ${credentialTextEn}. Gather those values before you start the form.`,
          `ACTIVA te va a pedir ${credentialTextEs}. Reune esos valores antes de empezar el formulario.`
        ),
      },
      {
        title: copy("Decide your scope", "Define el alcance"),
        body: copy(
          `Decide whether you want to sync everything or only ${scopeTextEn}.`,
          `Decide si quieres sincronizar todo o solo ${scopeTextEs}.`
        ),
      },
    ],
    setup: [
      {
        title: copy("Open the connector in ACTIVA", "Abre el conector en ACTIVA"),
        body: copy(
          `Go to ${setupUrl} and start the ${displayName} connection flow.`,
          `Ve a ${setupUrl} y empieza el flujo de conexion de ${displayName}.`
        ),
      },
      {
        title: copy("Collect your provider values", "Reune los valores del proveedor"),
        body: copy(
          `Create or copy the credentials required by ${displayName}. If your provider offers both broad and limited tokens, prefer the read-only and least-privilege option.`,
          `Crea o copia las credenciales que exige ${displayName}. Si el proveedor ofrece tokens amplios y limitados, prefiere la opcion de solo lectura y menor privilegio.`
        ),
      },
      {
        title: copy("Fill the ACTIVA credential form", "Completa la credencial en ACTIVA"),
        body: copy(
          credentialFields.length > 0
            ? `Paste ${credentialTextEn} into the credential form and save it.`
            : "This connector does not need a separate credential object, so you can move directly to the connector settings.",
          credentialFields.length > 0
            ? `Pega ${credentialTextEs} en el formulario de credencial y guardalo.`
            : "Este conector no necesita un objeto de credencial separado, asi que puedes pasar directo a la configuracion del conector."
        ),
      },
      {
        title: copy("Set the sync scope", "Define el alcance de sincronizacion"),
        body: copy(
          connectorFields.length > 0
            ? `Complete the connector settings such as ${scopeTextEn}.`
            : "Review the default connector settings and keep the defaults unless you intentionally need a narrower sync.",
          connectorFields.length > 0
            ? `Completa la configuracion del conector, por ejemplo ${scopeTextEs}.`
            : "Revisa la configuracion por defecto y mantenla salvo que necesites una sincronizacion mas limitada."
        ),
      },
      {
        title: copy("Save and run the first sync", "Guarda y ejecuta la primera sincronizacion"),
        body: copy(
          "Create the connector, then watch the indexing status page until the first sync finishes successfully.",
          "Crea el conector y luego revisa la pagina de estado de indexacion hasta que la primera sincronizacion termine con exito."
        ),
      },
    ],
    permissions: [
      {
        title: copy("Use read-only access", "Usa acceso de solo lectura"),
        body: copy(
          `${displayName} should be connected with the narrowest read permissions that still let ACTIVA list and fetch the content you selected.`,
          `${displayName} se debe conectar con los permisos de lectura mas estrechos posibles que aun permitan a ACTIVA listar y obtener el contenido que seleccionaste.`
        ),
      },
      {
        title: copy("Broader scope means broader visibility", "Mayor alcance significa mayor visibilidad"),
        body: copy(
          "If you choose organization-wide, all-sites, or all-projects sync, your provider credential must also have organization-wide read access.",
          "Si eliges sincronizacion a nivel organizacion, todos los sitios o todos los proyectos, tu credencial del proveedor tambien debe tener acceso de lectura a ese mismo alcance."
        ),
      },
    ],
    mcp: [
      {
        title: copy("Use the product fields exactly", "Usa exactamente los campos del producto"),
        body: copy(
          "The ACTIVA form maps directly to the connector implementation, so field names and formats should match the provider values exactly.",
          "El formulario de ACTIVA mapea directamente a la implementacion del conector, asi que los nombres y formatos deben coincidir exactamente con los valores del proveedor."
        ),
      },
      {
        title: copy("No hidden callback for token-based connectors", "Sin callback oculto para conectores por token"),
        body: copy(
          credentialFields.length > 0
            ? "For connectors that rely on pasted tokens, keys, or secrets, the MCP connection is finished as soon as ACTIVA validates and stores the credential."
            : "This connector is configured completely inside ACTIVA, so there is no separate provider callback or redirect URI to maintain.",
          credentialFields.length > 0
            ? "Para conectores basados en tokens, llaves o secretos pegados manualmente, la conexion MCP queda lista tan pronto ACTIVA valida y guarda la credencial."
            : "Este conector se configura completamente dentro de ACTIVA, asi que no hay un callback ni redirect URI adicional que mantener."
        ),
      },
    ],
    verification: [
      {
        title: copy("Status turns active", "El estado pasa a activo"),
        body: copy(
          "After saving, the connector should appear on the indexing status page with an active, scheduled, or initial indexing state instead of an error.",
          "Despues de guardar, el conector debe aparecer en la pagina de estado de indexacion con estado activo, programado o de indexacion inicial, no en error."
        ),
      },
      {
        title: copy("Documents start appearing", "Empiezan a aparecer documentos"),
        body: copy(
          "Document counts should increase and search results should start returning content from this source.",
          "El conteo de documentos debe subir y la busqueda debe empezar a devolver contenido de esta fuente."
        ),
      },
    ],
    troubleshooting: [
      {
        title: copy("401, 403, or invalid credential", "401, 403 o credencial invalida"),
        body: copy(
          "This usually means the token is expired, the app secret was rotated, or the account lacks read permissions for the selected scope.",
          "Normalmente esto significa que el token expiro, el secreto de la app fue rotado o la cuenta no tiene permisos de lectura para el alcance seleccionado."
        ),
      },
      {
        title: copy("Saved connector but no data", "Conector guardado pero sin datos"),
        body: copy(
          "Review the scope fields carefully. A wrong site, team, folder, repository, or base URL often creates a valid connector that indexes nothing.",
          "Revisa con cuidado los campos de alcance. Un sitio, equipo, carpeta, repositorio o base URL incorrectos suelen crear un conector valido que no indexa nada."
        ),
      },
      {
        title: copy("Unexpectedly broad sync", "Sincronizacion demasiado amplia"),
        body: copy(
          "If ACTIVA is indexing more than expected, tighten the connector scope and avoid organization-wide or all-content options.",
          "Si ACTIVA esta indexando mas de lo esperado, reduce el alcance del conector y evita opciones de toda la organizacion o todo el contenido."
        ),
      },
    ],
    faq: [
      {
        question: copy(
          "Can I limit this connector to a subset of content?",
          "Puedo limitar este conector a un subconjunto del contenido?"
        ),
        answer: copy(
          connectorFields.length > 0
            ? `Yes. Use fields such as ${scopeTextEn} to narrow the sync.`
            : "Yes, but only if the provider credential itself is scoped down before you add it to ACTIVA.",
          connectorFields.length > 0
            ? `Si. Usa campos como ${scopeTextEs} para limitar la sincronizacion.`
            : "Si, pero solo si la credencial del proveedor ya viene limitada antes de agregarla a ACTIVA."
        ),
      },
      {
        question: copy(
          "What happens when I rotate the provider credential?",
          "Que pasa cuando roto la credencial del proveedor?"
        ),
        answer: copy(
          "Update the stored credential in ACTIVA and then re-run the connector. Existing indexed content stays in place until the next sync or reindex updates it.",
          "Actualiza la credencial guardada en ACTIVA y luego vuelve a ejecutar el conector. El contenido ya indexado sigue ahi hasta que la siguiente sincronizacion o reindexacion lo actualice."
        ),
      },
    ],
    fieldExamples: getFieldExamples(source),
    providerLinks: OFFICIAL_PROVIDER_LINKS[source] || [],
    setupUrl,
  };
}

function mergeDocsEntry(
  baseEntry: ConnectorDocsEntry,
  override: Omit<Partial<ConnectorDocsEntry>, "overview"> & {
    overview?: Partial<ConnectorDocsEntry["overview"]>;
  }
): ConnectorDocsEntry {
  return {
    ...baseEntry,
    ...override,
    overview: {
      ...baseEntry.overview,
      ...(override.overview || {}),
    },
  };
}

function buildSpecialDocsEntry(source: ConfigurableSources): ConnectorDocsEntry | null {
  const baseEntry = buildGenericDocsEntry(source);
  const metadata = getSourceMetadata(source);
  const callbackBase = HOST_URL.replace(/\/$/, "");

  if (source === ValidSources.GoogleDrive) {
    return mergeDocsEntry(baseEntry, {
      overview: {
        description: copy(
          "The Google Drive connector indexes shared drives, My Drive content, and folder scopes into ACTIVA. It can also sync Google Workspace user and group context so permission-aware search works correctly.",
          "El conector de Google Drive indexa shared drives, contenido de My Drive y alcances por carpeta dentro de ACTIVA. Tambien puede sincronizar contexto de usuarios y grupos de Google Workspace para que la busqueda con permisos funcione correctamente."
        ),
      },
      beforeYouStart: [
        {
          title: copy("Google Workspace admin access", "Acceso de admin de Google Workspace"),
          body: copy(
            "You need a Google Workspace environment, plus enough admin control to enable APIs and, if you use a service account, approve domain-wide delegation.",
            "Necesitas un entorno de Google Workspace y suficiente control de admin para habilitar APIs y, si usas cuenta de servicio, aprobar domain-wide delegation."
          ),
        },
        {
          title: copy("Enable the right Google APIs", "Habilita las APIs correctas de Google"),
          body: copy(
            "In Google Cloud, enable Google Drive API and Admin SDK. Without both, ACTIVA cannot read files plus directory users and groups.",
            "En Google Cloud habilita Google Drive API y Admin SDK. Sin ambas, ACTIVA no puede leer archivos ni directorio de usuarios y grupos."
          ),
        },
        {
          title: copy("Choose your auth mode", "Elige el modo de autenticacion"),
          body: copy(
            "You can upload an OAuth web-app JSON and complete interactive auth inside ACTIVA, or upload a Google service-account key and provide the primary admin email.",
            "Puedes subir un JSON de app web OAuth y completar la autenticacion interactiva dentro de ACTIVA, o subir una llave de cuenta de servicio de Google y proporcionar el correo del admin principal."
          ),
        },
      ],
      setup: [
        {
          title: copy("Create Google credentials", "Crea las credenciales de Google"),
          body: copy(
            "In Google Cloud, create either a Web application OAuth client or a service account key JSON. Download the JSON file because ACTIVA expects that exact upload.",
            "En Google Cloud crea un cliente OAuth de tipo Web application o una llave JSON de cuenta de servicio. Descarga el JSON porque ACTIVA espera exactamente ese archivo."
          ),
        },
        {
          title: copy("Set the redirect URI if you use OAuth", "Configura el redirect URI si usas OAuth"),
          body: copy(
            `For the web-app OAuth flow, add this redirect URI in Google Cloud before you upload the JSON: ${callbackBase}/admin/connectors/google-drive/oauth/callback`,
            `Para el flujo OAuth con app web, agrega este redirect URI en Google Cloud antes de subir el JSON: ${callbackBase}/admin/connectors/google-drive/oauth/callback`
          ),
        },
        {
          title: copy(
            "Approve domain-wide delegation if you use a service account",
            "Aprueba domain-wide delegation si usas cuenta de servicio"
          ),
          body: copy(
            "Authorize the service account for the ACTIVA scopes in the Google Admin console. ACTIVA also asks for the Primary Admin Email when you finish the service-account credential.",
            "Autoriza la cuenta de servicio para los scopes de ACTIVA en la consola de Google Admin. ACTIVA tambien te pide el correo del Primary Admin Email cuando terminas la credencial de cuenta de servicio."
          ),
        },
        {
          title: copy("Upload the JSON into ACTIVA", "Sube el JSON a ACTIVA"),
          body: copy(
            "Open the Google Drive connector, upload the JSON, and wait for ACTIVA to recognize whether it is an OAuth app or a service-account key.",
            "Abre el conector de Google Drive, sube el JSON y espera a que ACTIVA reconozca si es una app OAuth o una llave de cuenta de servicio."
          ),
        },
        {
          title: copy("Finish authentication", "Completa la autenticacion"),
          body: copy(
            "If you uploaded an OAuth app, click Authenticate with Google Drive and complete consent. If you uploaded a service account, enter the primary admin email and save the credential.",
            "Si subiste una app OAuth, haz clic en Authenticate with Google Drive y completa el consentimiento. Si subiste una cuenta de servicio, escribe el correo del admin principal y guarda la credencial."
          ),
        },
      ],
      permissions: [
        {
          title: copy("Drive file read access", "Acceso de lectura a Drive"),
          body: copy(
            "ACTIVA expects drive.readonly and drive.metadata.readonly so it can list files, read metadata, and fetch the content it indexes.",
            "ACTIVA espera drive.readonly y drive.metadata.readonly para poder listar archivos, leer metadatos y obtener el contenido que indexa."
          ),
        },
        {
          title: copy("Directory read access", "Acceso de lectura al directorio"),
          body: copy(
            "ACTIVA also uses admin.directory.user.readonly and admin.directory.group.readonly to map Google Workspace users and groups for permission-aware results.",
            "ACTIVA tambien usa admin.directory.user.readonly y admin.directory.group.readonly para mapear usuarios y grupos de Google Workspace y respetar permisos en los resultados."
          ),
        },
      ],
      mcp: [
        {
          title: copy("Mandatory callback", "Callback obligatorio"),
          body: copy(
            `If you choose the OAuth client path, the redirect URI must match ${callbackBase}/admin/connectors/google-drive/oauth/callback exactly.`,
            `Si eliges la ruta con cliente OAuth, el redirect URI debe coincidir exactamente con ${callbackBase}/admin/connectors/google-drive/oauth/callback.`
          ),
        },
      ],
      troubleshooting: [
        {
          title: copy("Invalid redirect URI", "Redirect URI invalido"),
          body: copy(
            "Google will block consent if the callback URI in Google Cloud does not match ACTIVA exactly, including protocol and domain.",
            "Google bloqueara el consentimiento si el callback URI en Google Cloud no coincide exactamente con ACTIVA, incluyendo protocolo y dominio."
          ),
        },
        {
          title: copy("Service account indexes nothing", "La cuenta de servicio no indexa nada"),
          body: copy(
            "This usually means domain-wide delegation was not approved, the primary admin email is wrong, or the selected folders and drives are outside the approved scope.",
            "Normalmente esto significa que domain-wide delegation no fue aprobada, el correo del admin principal es incorrecto o las carpetas y unidades elegidas quedaron fuera del alcance aprobado."
          ),
        },
      ],
    });
  }

  if (source === ValidSources.Gmail) {
    return mergeDocsEntry(baseEntry, {
      overview: {
        description: copy(
          "The Gmail connector indexes mailboxes into ACTIVA using either uploaded OAuth client JSON or a Google service account flow. It is designed for read-only mailbox ingestion.",
          "El conector de Gmail indexa buzones en ACTIVA usando JSON de cliente OAuth subido o un flujo de cuenta de servicio de Google. Esta pensado para ingesta de buzones en modo solo lectura."
        ),
      },
      beforeYouStart: [
        {
          title: copy("Workspace and API access", "Acceso a Workspace y APIs"),
          body: copy(
            "Enable Gmail API plus Admin SDK in Google Cloud. ACTIVA needs mailbox read access plus directory lookups for users and groups.",
            "Habilita Gmail API y Admin SDK en Google Cloud. ACTIVA necesita acceso de lectura al buzón y consultas de directorio para usuarios y grupos."
          ),
        },
        {
          title: copy("Choose OAuth or service account", "Elige OAuth o cuenta de servicio"),
          body: copy(
            "You can upload an OAuth web-app JSON and complete Gmail consent inside ACTIVA, or use a service account with domain-wide delegation.",
            "Puedes subir un JSON de app web OAuth y completar el consentimiento de Gmail dentro de ACTIVA, o usar una cuenta de servicio con domain-wide delegation."
          ),
        },
      ],
      setup: [
        {
          title: copy("Create the JSON credential", "Crea la credencial JSON"),
          body: copy(
            "Create the Google credential in Google Cloud and download the JSON file. ACTIVA accepts either a Web application OAuth client or a service-account key.",
            "Crea la credencial de Google en Google Cloud y descarga el archivo JSON. ACTIVA acepta tanto un cliente OAuth de tipo Web application como una llave de cuenta de servicio."
          ),
        },
        {
          title: copy("Add the Gmail redirect URI if using OAuth", "Agrega el redirect URI de Gmail si usas OAuth"),
          body: copy(
            `For the interactive OAuth path, register this callback in Google Cloud: ${callbackBase}/admin/connectors/gmail/oauth/callback`,
            `Para la ruta OAuth interactiva, registra este callback en Google Cloud: ${callbackBase}/admin/connectors/gmail/oauth/callback`
          ),
        },
        {
          title: copy("Upload the JSON into ACTIVA", "Sube el JSON a ACTIVA"),
          body: copy(
            "ACTIVA will detect whether the file is an OAuth app or a service-account key and show the correct next step.",
            "ACTIVA detectara si el archivo es una app OAuth o una llave de cuenta de servicio y mostrara el siguiente paso correcto."
          ),
        },
        {
          title: copy("Finish Gmail authentication", "Completa la autenticacion de Gmail"),
          body: copy(
            "Use Authenticate with Gmail for uploaded OAuth credentials, or enter the primary admin email to finalize the service-account credential.",
            "Usa Authenticate with Gmail para credenciales OAuth subidas, o escribe el correo del admin principal para terminar la credencial de cuenta de servicio."
          ),
        },
      ],
      permissions: [
        {
          title: copy("Mailbox read scope", "Scope de lectura del buzon"),
          body: copy(
            "ACTIVA uses gmail.readonly so it can list and read message content without sending or modifying mail.",
            "ACTIVA usa gmail.readonly para listar y leer contenido de mensajes sin enviar ni modificar correos."
          ),
        },
        {
          title: copy("Directory scopes", "Scopes de directorio"),
          body: copy(
            "ACTIVA also uses admin.directory.user.readonly and admin.directory.group.readonly for permission-aware indexing.",
            "ACTIVA tambien usa admin.directory.user.readonly y admin.directory.group.readonly para indexacion con permisos."
          ),
        },
      ],
      troubleshooting: [
        {
          title: copy("Mailboxes are missing", "Faltan buzones"),
          body: copy(
            "With service accounts, missing mailboxes usually mean domain-wide delegation or impersonation was not approved correctly by the tenant admin.",
            "Con cuentas de servicio, los buzones faltantes suelen indicar que domain-wide delegation o la impersonacion no fueron aprobadas correctamente por el admin del tenant."
          ),
        },
      ],
    });
  }

  if (source === ValidSources.Slack) {
    return mergeDocsEntry(baseEntry, {
      secondarySetupUrl: `${metadata.adminUrl}?mode=federated`,
      overview: {
        description: copy(
          "The Slack connector indexes workspace conversations into ACTIVA. Depending on your deployment, you can use a stored bot token for indexed content and optionally a federated Slack flow for user-specific access patterns.",
          "El conector de Slack indexa conversaciones del workspace en ACTIVA. Segun tu despliegue, puedes usar un bot token guardado para contenido indexado y opcionalmente un flujo federado de Slack para accesos especificos por usuario."
        ),
      },
      beforeYouStart: [
        {
          title: copy("Create a Slack app", "Crea una app de Slack"),
          body: copy(
            "You need a Slack app installed in the target workspace. ACTIVA can validate a stored bot token, and some deployments also surface a Slack OAuth authorize flow.",
            "Necesitas una app de Slack instalada en el workspace objetivo. ACTIVA puede validar un bot token guardado y algunos despliegues tambien muestran un flujo de autorizacion OAuth de Slack."
          ),
        },
        {
          title: copy("Prepare the required scopes", "Prepara los scopes requeridos"),
          body: copy(
            "ACTIVA expects channel and identity read scopes such as channels:history, channels:read, groups:history, groups:read, im:history, users:read, users:read.email, and usergroups:read.",
            "ACTIVA espera scopes de lectura de canales e identidad como channels:history, channels:read, groups:history, groups:read, im:history, users:read, users:read.email y usergroups:read."
          ),
        },
      ],
      setup: [
        {
          title: copy("Configure OAuth scopes in Slack", "Configura los scopes OAuth en Slack"),
          body: copy(
            "In Slack App Management, add the ACTIVA bot token scopes and reinstall the app to the workspace so the updated token includes them.",
            "En Slack App Management agrega los bot token scopes de ACTIVA y vuelve a instalar la app en el workspace para que el token actualizado los incluya."
          ),
        },
        {
          title: copy("Copy the bot token or use ACTIVA authorize", "Copia el bot token o usa authorize en ACTIVA"),
          body: copy(
            "If your ACTIVA deployment exposes a Slack authorize button, you can use that flow. Otherwise paste the Slack bot token into the credential form and save it.",
            "Si tu despliegue de ACTIVA muestra un boton de authorize para Slack, puedes usar ese flujo. Si no, pega el bot token de Slack en el formulario de credencial de ACTIVA y guardalo."
          ),
        },
        {
          title: copy("Define channel scope", "Define el alcance por canal"),
          body: copy(
            "Use the optional Channels list to limit ingestion to named channels. Enable Channel Regex only if you intentionally want pattern-based matching.",
            "Usa la lista opcional Channels para limitar la ingesta a canales con nombre. Activa Channel Regex solo si realmente quieres un matching por patrones."
          ),
        },
      ],
      mcp: [
        {
          title: copy("Slack OAuth callback", "Callback OAuth de Slack"),
          body: copy(
            `If you use the ACTIVA Slack OAuth flow, register ${callbackBase}/admin/connectors/slack/oauth/callback as the redirect URL in Slack.`,
            `Si usas el flujo OAuth de Slack en ACTIVA, registra ${callbackBase}/admin/connectors/slack/oauth/callback como redirect URL en Slack.`
          ),
        },
      ],
      troubleshooting: [
        {
          title: copy("missing_scope from Slack", "missing_scope desde Slack"),
          body: copy(
            "This almost always means the Slack app was not granted the scopes ACTIVA needs, or the app was not reinstalled after the scope list changed.",
            "Casi siempre significa que a la app de Slack no se le concedieron los scopes que ACTIVA necesita, o que la app no se reinstalo despues de cambiar la lista de scopes."
          ),
        },
      ],
    });
  }

  if (source === ValidSources.Notion) {
    return mergeDocsEntry(baseEntry, {
      overview: {
        description: copy(
          "The Notion connector uses an internal integration token to read pages and databases that have been explicitly shared with the integration.",
          "El conector de Notion usa un token de integracion interna para leer paginas y bases de datos que fueron compartidas explicitamente con la integracion."
        ),
      },
      setup: [
        {
          title: copy("Create an internal integration", "Crea una integracion interna"),
          body: copy(
            "Create a Notion internal integration, copy the integration token, and keep the workspace owner ready to share pages with that integration.",
            "Crea una integracion interna de Notion, copia el integration token y ten listo al owner del workspace para compartir paginas con esa integracion."
          ),
        },
        {
          title: copy("Share the right pages", "Comparte las paginas correctas"),
          body: copy(
            "In Notion, explicitly share the pages or databases you want ACTIVA to see with the integration. Unshared pages stay invisible even if the token is valid.",
            "En Notion comparte explicitamente con la integracion las paginas o bases de datos que quieres que ACTIVA vea. Las paginas no compartidas siguen invisibles aunque el token sea valido."
          ),
        },
      ],
      troubleshooting: [
        {
          title: copy("Token is valid but pages are missing", "El token es valido pero faltan paginas"),
          body: copy(
            "This almost always means the page or database was never shared with the integration, or the Root Page ID points at the wrong subtree.",
            "Casi siempre significa que la pagina o base de datos nunca se compartio con la integracion, o que Root Page ID apunta al arbol equivocado."
          ),
        },
      ],
    });
  }

  if (source === ValidSources.Dropbox) {
    return mergeDocsEntry(baseEntry, {
      overview: {
        description: copy(
          "The Dropbox connector reads Dropbox file content and metadata using a Dropbox app access token stored in ACTIVA.",
          "El conector de Dropbox lee contenido y metadatos de archivos de Dropbox usando un access token de una app de Dropbox guardado en ACTIVA."
        ),
      },
      setup: [
        {
          title: copy("Create a Dropbox app", "Crea una app de Dropbox"),
          body: copy(
            "Create a Dropbox app for the right workspace context, enable the scopes your ACTIVA use case needs, and generate an access token.",
            "Crea una app de Dropbox para el contexto correcto del workspace, habilita los scopes que necesita tu caso de uso en ACTIVA y genera un access token."
          ),
        },
        {
          title: copy("Prefer read-only scopes", "Prefiere scopes de solo lectura"),
          body: copy(
            "ACTIVA only needs read access. Avoid write scopes unless your security review explicitly requires them for another reason.",
            "ACTIVA solo necesita acceso de lectura. Evita scopes de escritura salvo que tu revision de seguridad los exija expresamente por otra razon."
          ),
        },
      ],
    });
  }

  if (source === ValidSources.GitHub) {
    return mergeDocsEntry(baseEntry, {
      overview: {
        description: copy(
          "The GitHub connector indexes repositories into ACTIVA using a GitHub personal access token. You can scope by owner, specific repositories, and whether to include pull requests and issues.",
          "El conector de GitHub indexa repositorios en ACTIVA usando un personal access token de GitHub. Puedes limitarlo por owner, repositorios especificos y si incluyes pull requests e issues."
        ),
      },
      beforeYouStart: [
        {
          title: copy("Pick the right token type", "Elige el tipo de token correcto"),
          body: copy(
            "Use a GitHub personal access token that can read the repositories ACTIVA should index. If your org uses SAML SSO, make sure the token is authorized for that organization too.",
            "Usa un personal access token de GitHub que pueda leer los repositorios que ACTIVA debe indexar. Si tu organizacion usa SAML SSO, asegurate tambien de que el token quede autorizado para esa organizacion."
          ),
        },
      ],
      setup: [
        {
          title: copy("Create the GitHub token", "Crea el token de GitHub"),
          body: copy(
            "Generate a GitHub PAT with read access for repository contents and metadata. Add issue and pull-request read access if you plan to index those objects too.",
            "Genera un GitHub PAT con acceso de lectura para contenido y metadatos de repositorio. Agrega lectura de issues y pull requests si tambien piensas indexar esos objetos."
          ),
        },
        {
          title: copy("Choose owner and repository mode", "Elige owner y modo de repositorio"),
          body: copy(
            "Set Repository Owner, then decide whether you want a specific repository list or everything the token can access under that owner.",
            "Define Repository Owner y luego decide si quieres una lista especifica de repositorios o todo lo que el token pueda ver bajo ese owner."
          ),
        },
      ],
      troubleshooting: [
        {
          title: copy("Repository owner looks valid but nothing appears", "El owner parece valido pero no aparece nada"),
          body: copy(
            "Check the token scopes and SSO authorization first. GitHub can accept the token but still hide organization repositories until the token is explicitly authorized for that org.",
            "Revisa primero los scopes del token y la autorizacion SSO. GitHub puede aceptar el token y aun asi ocultar repositorios de la organizacion hasta que el token quede autorizado explicitamente para esa org."
          ),
        },
      ],
    });
  }

  if (source === ValidSources.Sharepoint) {
    return mergeDocsEntry(baseEntry, {
      overview: {
        description: copy(
          "The SharePoint connector reads Microsoft 365 site pages, document libraries, and folder-scoped content through a Microsoft Entra application. It supports client-secret and certificate authentication.",
          "El conector de SharePoint lee site pages, document libraries y contenido limitado por carpeta dentro de Microsoft 365 mediante una aplicacion de Microsoft Entra. Soporta autenticacion por client secret y por certificado."
        ),
      },
      beforeYouStart: [
        {
          title: copy("Register a Microsoft Entra app", "Registra una app en Microsoft Entra"),
          body: copy(
            "You need an app registration in the correct tenant, plus either a client secret or a PFX certificate depending on the ACTIVA auth mode you want.",
            "Necesitas un app registration en el tenant correcto y, segun el modo de ACTIVA que quieras, un client secret o un certificado PFX."
          ),
        },
        {
          title: copy("Know your tenant values", "Ten a mano los valores del tenant"),
          body: copy(
            "ACTIVA asks for SharePoint Client ID, Directory ID, and then either Client Secret or certificate fields. You should also know the exact SharePoint site URLs you want to index.",
            "ACTIVA pide SharePoint Client ID, Directory ID y luego Client Secret o campos del certificado. Tambien deberias conocer las URLs exactas de los sitios de SharePoint que quieres indexar."
          ),
        },
      ],
      setup: [
        {
          title: copy("Create the Entra app and grant admin consent", "Crea la app de Entra y concede admin consent"),
          body: copy(
            "Register the app, add the Microsoft Graph or SharePoint application permissions your tenant requires, and complete admin consent before testing the connector.",
            "Registra la app, agrega los permisos de Microsoft Graph o SharePoint que requiera tu tenant y completa admin consent antes de probar el conector."
          ),
        },
        {
          title: copy("Choose ACTIVA auth mode", "Elige el modo de autenticacion en ACTIVA"),
          body: copy(
            "Use Client Secret if your organization allows secrets. Use Certificate Authentication if your security policy prefers a PFX certificate and password instead.",
            "Usa Client Secret si tu organizacion permite secretos. Usa Certificate Authentication si tu politica de seguridad prefiere un certificado PFX y su password."
          ),
        },
        {
          title: copy("Enter SharePoint site scope", "Ingresa el alcance por sitio de SharePoint"),
          body: copy(
            "Use the Sites field to index all sites, one full site URL, or a deeper folder-scoped URL. Then decide whether to include documents, site pages, or both.",
            "Usa el campo Sites para indexar todos los sitios, una URL completa de sitio o una URL mas profunda limitada a carpeta. Luego decide si incluyes documentos, paginas del sitio o ambos."
          ),
        },
        {
          title: copy("Adjust sovereign cloud values if needed", "Ajusta valores soberanos si hace falta"),
          body: copy(
            "Only change Authority Host, Graph API Host, or SharePoint Domain Suffix when your tenant is in GCC High, DoD, or another non-default Microsoft cloud.",
            "Solo cambia Authority Host, Graph API Host o SharePoint Domain Suffix cuando tu tenant este en GCC High, DoD u otra nube de Microsoft no estandar."
          ),
        },
      ],
      permissions: [
        {
          title: copy("Application permissions, not delegated login", "Permisos de aplicacion, no login delegado"),
          body: copy(
            "ACTIVA uses the app's client credentials and the Graph .default scope. In practice that means the app registration must already have the SharePoint and Graph read permissions your tenant requires.",
            "ACTIVA usa client credentials de la app y el scope .default de Graph. En la practica eso significa que el app registration ya debe tener los permisos de lectura de SharePoint y Graph que requiera tu tenant."
          ),
        },
        {
          title: copy("Expect site and file read permissions", "Espera permisos de lectura de sitio y archivos"),
          body: copy(
            "Because ACTIVA reads sites, libraries, files, and pages, your app will typically need broad read access such as Sites.Read.All and related file read permissions approved by your admin team.",
            "Como ACTIVA lee sitios, bibliotecas, archivos y paginas, tu app normalmente necesitara acceso amplio de lectura como Sites.Read.All y permisos relacionados de lectura de archivos aprobados por tu equipo admin."
          ),
        },
      ],
      mcp: [
        {
          title: copy("No redirect URI in the ACTIVA flow", "Sin redirect URI dentro del flujo de ACTIVA"),
          body: copy(
            "SharePoint setup in ACTIVA is client-credentials based, so there is no user-facing callback. The mandatory values are the Entra app identifiers and whichever secret or certificate path you choose.",
            "La configuracion de SharePoint en ACTIVA se basa en client credentials, asi que no hay callback visible para el usuario. Los valores obligatorios son los identificadores de la app de Entra y el secreto o certificado que elijas."
          ),
        },
        {
          title: copy("OneDrive personal is not a separate connector", "OneDrive personal no es un conector separado"),
          body: copy(
            "This build treats Microsoft 365 team content through SharePoint and Teams. OneDrive personal sites are not exposed as a standalone ACTIVA connector here.",
            "Este build trata el contenido de equipo de Microsoft 365 mediante SharePoint y Teams. Los sitios personales de OneDrive no se exponen aqui como un conector independiente de ACTIVA."
          ),
        },
      ],
      troubleshooting: [
        {
          title: copy("App validates but some sites fail", "La app valida pero fallan algunos sitios"),
          body: copy(
            "Review whether the app has tenant-wide consent, whether the site URLs are correct, and whether you're mixing site and folder URLs in an unexpected way.",
            "Revisa si la app tiene consentimiento a nivel tenant, si las URLs de los sitios son correctas y si estas mezclando URLs de sitio y carpeta de una forma inesperada."
          ),
        },
      ],
    });
  }

  if (source === ValidSources.Teams) {
    return mergeDocsEntry(baseEntry, {
      overview: {
        description: copy(
          "The Teams connector reads Microsoft Teams channels and messages through a Microsoft Entra application and Microsoft Graph application permissions.",
          "El conector de Teams lee canales y mensajes de Microsoft Teams mediante una aplicacion de Microsoft Entra y permisos de aplicacion de Microsoft Graph."
        ),
      },
      setup: [
        {
          title: copy("Register the Entra app", "Registra la app en Entra"),
          body: copy(
            "Create the app registration in the right Microsoft tenant, add the Graph application permissions your ACTIVA use case needs, and grant admin consent.",
            "Crea el app registration en el tenant correcto de Microsoft, agrega los permisos de aplicacion de Graph que necesite tu caso de uso en ACTIVA y concede admin consent."
          ),
        },
        {
          title: copy("Save client credentials in ACTIVA", "Guarda los client credentials en ACTIVA"),
          body: copy(
            "Paste Teams Client ID, Teams Client Secret, and Teams Directory ID into the ACTIVA credential form.",
            "Pega Teams Client ID, Teams Client Secret y Teams Directory ID en el formulario de credencial de ACTIVA."
          ),
        },
      ],
      permissions: [
        {
          title: copy("Graph application permissions", "Permisos de aplicacion de Graph"),
          body: copy(
            "ACTIVA authenticates with the Graph .default scope, so the app registration must already have the Teams and identity read permissions approved by your administrator.",
            "ACTIVA se autentica con el scope .default de Graph, asi que el app registration ya debe tener aprobados por el administrador los permisos de lectura de Teams e identidad."
          ),
        },
      ],
      troubleshooting: [
        {
          title: copy("403 from Microsoft Graph", "403 desde Microsoft Graph"),
          body: copy(
            "This usually means the app registration exists but admin consent was never granted for the required Graph permissions.",
            "Normalmente esto significa que el app registration existe pero nunca se otorgo admin consent para los permisos de Graph requeridos."
          ),
        },
      ],
    });
  }

  if (source === ValidSources.Confluence) {
    return mergeDocsEntry(baseEntry, {
      overview: {
        description: copy(
          "The Confluence connector supports Confluence Cloud and Server/Data Center patterns. In Cloud, ACTIVA can complete an Atlassian OAuth flow and then finalize the specific accessible resource you want to attach.",
          "El conector de Confluence soporta patrones de Confluence Cloud y Server/Data Center. En Cloud, ACTIVA puede completar un flujo OAuth de Atlassian y luego finalizar el accessible resource especifico que quieres asociar."
        ),
      },
      setup: [
        {
          title: copy("Decide Cloud vs Server", "Decide Cloud o Server"),
          body: copy(
            "Set Is Cloud correctly before anything else. ACTIVA disables that switch once a Cloud OAuth credential is already attached.",
            "Define bien Is Cloud antes de todo. ACTIVA desactiva ese switch cuando ya existe una credencial OAuth de Cloud asociada."
          ),
        },
        {
          title: copy("Register the Atlassian OAuth app", "Registra la app OAuth de Atlassian"),
          body: copy(
            `For Confluence Cloud OAuth, register ${callbackBase}/admin/connectors/confluence/oauth/callback as the redirect URI and enable the Confluence read scopes ACTIVA needs.`,
            `Para OAuth de Confluence Cloud, registra ${callbackBase}/admin/connectors/confluence/oauth/callback como redirect URI y habilita los scopes de lectura de Confluence que ACTIVA necesita.`
          ),
        },
        {
          title: copy("Finalize the accessible resource", "Finaliza el accessible resource"),
          body: copy(
            "After OAuth succeeds, ACTIVA asks you to choose the accessible resource or site it should bind to the stored credential. Do not skip this finalization step.",
            "Despues de que OAuth termina bien, ACTIVA te pide elegir el accessible resource o sitio que debe asociar a la credencial guardada. No omitas ese paso final."
          ),
        },
      ],
      permissions: [
        {
          title: copy("Confluence Cloud read scopes", "Scopes de lectura de Confluence Cloud"),
          body: copy(
            "ACTIVA requests Confluence read scopes for spaces, content, permissions, users, groups, and attachments. If any of those are missing, the connector may validate partially but fail during indexing or permission sync.",
            "ACTIVA solicita scopes de lectura de Confluence para spaces, contenido, permisos, usuarios, grupos y adjuntos. Si falta alguno, el conector puede validar parcialmente pero fallar durante indexacion o sincronizacion de permisos."
          ),
        },
      ],
      troubleshooting: [
        {
          title: copy("OAuth succeeds but connector still has no site", "OAuth termina bien pero el conector sigue sin sitio"),
          body: copy(
            "That usually means the finalize step was skipped or the wrong accessible resource was selected after the callback.",
            "Eso normalmente significa que se omitio el paso de finalize o que se eligio el accessible resource incorrecto despues del callback."
          ),
        },
      ],
    });
  }

  return null;
}

function buildDocsEntry(source: ConfigurableSources): ConnectorDocsEntry {
  return buildSpecialDocsEntry(source) || buildGenericDocsEntry(source);
}

export function sourceToConnectorDocsSlug(source: ValidSources): string {
  return federatedSourceToRegularSource(source).replaceAll("_", "-");
}

export function connectorDocsSlugToSource(
  slug: string
): ConfigurableSources | null {
  return maybeAsConfigurableSource(slug.replaceAll("-", "_") as ValidSources);
}

export function getConnectorDocsPath(source: ValidSources): string | null {
  const regularSource = federatedSourceToRegularSource(source);
  const maybeSource = maybeAsConfigurableSource(regularSource);

  if (!maybeSource) {
    return null;
  }

  return `${CONNECTOR_DOCS_INDEX_PATH}/${sourceToConnectorDocsSlug(maybeSource)}`;
}

export function getConnectorDocsIndexPath(): string {
  return CONNECTOR_DOCS_INDEX_PATH;
}

const CONNECTOR_DOCS_ENTRIES = getDocSources().map(buildDocsEntry);

export function getConnectorDocsEntries(): ConnectorDocsEntry[] {
  return CONNECTOR_DOCS_ENTRIES;
}

export function getConnectorDocsEntry(
  source: ConfigurableSources
): ConnectorDocsEntry | undefined {
  return CONNECTOR_DOCS_ENTRIES.find((entry) => entry.source === source);
}

export function getConnectorDocsEntryBySlug(
  slug: string
): ConnectorDocsEntry | undefined {
  const source = connectorDocsSlugToSource(slug);
  if (!source) {
    return undefined;
  }
  return getConnectorDocsEntry(source);
}

export function getSourceCategoryCopy(
  category: SourceCategory
): LocalizedCopy {
  switch (category) {
    case SourceCategory.Wiki:
      return copy("Knowledge Base & Wikis", "Bases de conocimiento y wikis");
    case SourceCategory.Storage:
      return copy("Cloud Storage", "Almacenamiento en la nube");
    case SourceCategory.TicketingAndTaskManagement:
      return copy(
        "Ticketing & Task Management",
        "Tickets y gestion de tareas"
      );
    case SourceCategory.Messaging:
      return copy("Messaging", "Mensajeria");
    case SourceCategory.Sales:
      return copy("Sales", "Ventas");
    case SourceCategory.CodeRepository:
      return copy("Code Repository", "Repositorios de codigo");
    case SourceCategory.Other:
      return copy("Others", "Otros");
  }
}
