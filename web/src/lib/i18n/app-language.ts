export const APP_LANGUAGE_STORAGE_KEY = "activa.app-language";

export type AppLanguage = "en" | "es";

export type TranslationValues = Record<string, string | number>;

const translations = {
  en: {
    "common.language": "Language",
    "common.language.english": "English",
    "common.language.spanish": "Spanish",
    "common.status.active": "Active",
    "common.status.inactive": "Inactive",
    "common.status.pending": "Pending",
    "common.status.invited": "Invited",
    "common.status.requested": "Requested",
    "common.status.disabled": "Disabled",
    "common.status.removed": "Removed",
    "common.justNow": "Just now",
    "admin.sections.agentsAndActions": "Agents & Actions",
    "admin.sections.documentsAndKnowledge": "Documents & Knowledge",
    "admin.sections.integrations": "Integrations",
    "admin.sections.permissions": "Permissions",
    "admin.sections.organization": "Organization",
    "admin.sections.usage": "Usage",
    "admin.sidebar.exit": "Exit Admin Panel",
    "admin.sidebar.search": "Search admin pages...",
    "admin.sidebar.upgradePlan": "Upgrade Plan",
    "admin.language.helper":
      "Apply English or Spanish across the internal app.",
    "admin.routes.indexingStatus.title": "Existing Connectors",
    "admin.routes.indexingStatus.sidebar": "Existing Connectors",
    "admin.routes.addConnector.title": "Add Connector",
    "admin.routes.addConnector.sidebar": "Add Connector",
    "admin.routes.documentSets.title": "Document Sets",
    "admin.routes.documentSets.sidebar": "Document Sets",
    "admin.routes.documentExplorer.title": "Document Explorer",
    "admin.routes.documentExplorer.sidebar": "Explorer",
    "admin.routes.documentFeedback.title": "Document Feedback",
    "admin.routes.documentFeedback.sidebar": "Feedback",
    "admin.routes.agents.title": "Agents",
    "admin.routes.agents.sidebar": "Agents",
    "admin.routes.slackBots.title": "Slack Integration",
    "admin.routes.slackBots.sidebar": "Slack Integration",
    "admin.routes.discordBots.title": "Discord Integration",
    "admin.routes.discordBots.sidebar": "Discord Integration",
    "admin.routes.mcpActions.title": "MCP Actions",
    "admin.routes.mcpActions.sidebar": "MCP Actions",
    "admin.routes.openApiActions.title": "OpenAPI Actions",
    "admin.routes.openApiActions.sidebar": "OpenAPI Actions",
    "admin.routes.standardAnswers.title": "Standard Answers",
    "admin.routes.standardAnswers.sidebar": "Standard Answers",
    "admin.routes.groups.title": "Manage User Groups",
    "admin.routes.groups.sidebar": "Groups",
    "admin.routes.chatPreferences.title": "Chat Preferences",
    "admin.routes.chatPreferences.sidebar": "Chat Preferences",
    "admin.routes.llmModels.title": "Language Models",
    "admin.routes.llmModels.sidebar": "Language Models",
    "admin.routes.webSearch.title": "Web Search",
    "admin.routes.webSearch.sidebar": "Web Search",
    "admin.routes.imageGeneration.title": "Image Generation",
    "admin.routes.imageGeneration.sidebar": "Image Generation",
    "admin.routes.voice.title": "Voice",
    "admin.routes.voice.sidebar": "Voice",
    "admin.routes.codeInterpreter.title": "Code Interpreter",
    "admin.routes.codeInterpreter.sidebar": "Code Interpreter",
    "admin.routes.indexSettings.title": "Index Settings",
    "admin.routes.indexSettings.sidebar": "Index Settings",
    "admin.routes.documentProcessing.title": "Document Processing",
    "admin.routes.documentProcessing.sidebar": "Document Processing",
    "admin.routes.knowledgeGraph.title": "Knowledge Graph",
    "admin.routes.knowledgeGraph.sidebar": "Knowledge Graph",
    "admin.routes.users.title": "Users & Requests",
    "admin.routes.users.sidebar": "Users",
    "admin.routes.companies.title": "Companies",
    "admin.routes.companies.sidebar": "Companies",
    "admin.routes.apiKeys.title": "Service Accounts",
    "admin.routes.apiKeys.sidebar": "Service Accounts",
    "admin.routes.tokenRateLimits.title": "Spending Limits",
    "admin.routes.tokenRateLimits.sidebar": "Spending Limits",
    "admin.routes.usage.title": "Usage Statistics",
    "admin.routes.usage.sidebar": "Usage Statistics",
    "admin.routes.queryHistory.title": "Query History",
    "admin.routes.queryHistory.sidebar": "Query History",
    "admin.routes.customAnalytics.title": "Custom Analytics",
    "admin.routes.customAnalytics.sidebar": "Custom Analytics",
    "admin.routes.theme.title": "Appearance & Theming",
    "admin.routes.theme.sidebar": "Appearance & Theming",
    "admin.routes.billing.title": "Plans & Billing",
    "admin.routes.billing.sidebar": "Plans & Billing",
    "admin.routes.indexMigration.title": "Document Index Migration",
    "admin.routes.indexMigration.sidebar": "Document Index Migration",
    "admin.routes.scim.title": "SCIM",
    "admin.routes.scim.sidebar": "SCIM",
    "admin.routes.debug.title": "Debug Logs",
    "admin.routes.debug.sidebar": "Debug Logs",
    "connectors.auth.sectionDescription.default":
      "OAuth is the default path here. Connect your account, approve access, and then continue with connector-specific setup like folder or source selection.",
    "connectors.auth.sectionDescription.google":
      "Use the platform-managed Google Drive OAuth flow first. Sign in, approve Drive access, and ACTIVA will save the connection for this connector.",
    "connectors.auth.title": "Connect {{source}}",
    "connectors.auth.existingConnections": "Existing connections",
    "connectors.auth.loadError":
      "We could not load the shared connection status right now. You can still continue with advanced setup below.",
    "connectors.auth.oauthUnavailable":
      "OAuth is not available for this connector yet. You can use the advanced setup path below.",
    "connectors.auth.noLinkedConnectors":
      "Connect first, then continue to choose folders, spaces, or other source-specific options.",
    "connectors.auth.linkedConnectors":
      "{{count}} connector(s) already use this connection.",
    "connectors.auth.lastSync": "Last sync: {{time}} ({{status}})",
    "connectors.auth.buttons.connectWithGoogle": "Connect with Google Drive",
    "connectors.auth.buttons.connectAnotherGoogle":
      "Connect another Google Drive account",
    "connectors.auth.buttons.useCustomCredentials": "Use custom credentials",
    "connectors.auth.buttons.advancedOptions": "Advanced options",
    "connectors.auth.buttons.useOwnCredentials": "Use your own credentials",
    "connectors.auth.buttons.uploadJsonManually": "Upload JSON manually",
    "connectors.auth.buttons.hideManualSetup": "Hide manual setup",
    "connectors.auth.buttons.useConnection": "Use connection",
    "connectors.auth.buttons.selected": "Selected",
    "connectors.auth.buttons.syncNow": "Sync now",
    "connectors.auth.buttons.reconnect": "Reconnect",
    "connectors.auth.buttons.disconnect": "Disconnect",
    "connectors.auth.errors.required": "Required",
    "connectors.auth.errors.connect": "Failed to connect {{source}}.",
    "connectors.auth.errors.reconnect": "Failed to reconnect {{source}}.",
    "connectors.auth.errors.disconnect": "Failed to disconnect {{source}}.",
    "connectors.auth.errors.sync": "Failed to sync {{source}}.",
    "connectors.auth.status.connected": "Connected",
    "connectors.auth.status.syncing": "Syncing",
    "connectors.auth.status.expired": "Expired",
    "connectors.auth.status.needsReconnect": "Reconnect required",
    "connectors.auth.status.connecting": "Connecting",
    "connectors.auth.status.disconnected": "Disconnected",
    "connectors.auth.status.error": "Error",
    "connectors.auth.status.notConnected": "Not connected",
    "connectors.auth.credentialType.platformOauth": "Platform OAuth",
    "connectors.auth.credentialType.customerOauth": "Customer-managed OAuth",
    "connectors.auth.credentialType.oauth": "OAuth",
    "connectors.auth.credentialType.serviceAccount": "Service account",
    "connectors.auth.credentialType.serviceAccountJson": "Service account JSON",
    "connectors.auth.credentialType.manualOauthJson": "Manual OAuth JSON",
    "connectors.auth.credentialType.apiKey": "API key",
    "connectors.auth.credentialType.custom": "Custom",
    "connectors.advanced.title": "Advanced setup",
    "connectors.advanced.selectCredential": "Select a credential",
    "connectors.advanced.description.default":
      "Use this path for service account JSON, custom OAuth app credentials, enterprise configuration, or other manual authentication methods.",
    "connectors.advanced.description.google":
      "Use this advanced path if you want to manage your own Google OAuth client, or fall back to service-account and legacy JSON setup.",
    "connectors.advanced.modalTitle.manualCredential":
      "Use your own {{source}} credentials",
    "connectors.advanced.buttons.createNew": "Create New",
    "users.page.description":
      "Manage people, access requests, and team membership with a cleaner operating view.",
    "users.page.invite": "Invite Users",
    "users.summary.activeUsers": "active users",
    "users.summary.pendingInvites": "pending invites",
    "users.summary.requestsToJoin": "requests to join",
    "users.summary.scimTitle": "SCIM Sync",
    "users.summary.scimDescription":
      "Users are synced from your identity provider.",
    "users.summary.manage": "Manage",
    "users.table.title": "Team directory",
    "users.table.description":
      "Search, filter, and update access without losing context.",
    "users.table.search": "Search users...",
    "users.table.downloadCsv": "Download CSV",
    "users.table.downloadCsvFailed": "Failed to download CSV",
    "users.table.noUsersTitle": "No users found",
    "users.table.noUsersDescription": "No users match the current filters.",
    "users.table.error":
      "Failed to load users. Please try refreshing the page.",
    "users.table.columns.name": "Name",
    "users.table.columns.groups": "Groups",
    "users.table.columns.accountType": "Account Type",
    "users.table.columns.status": "Status",
    "users.table.columns.lastUpdated": "Last Updated",
    "users.table.status.scimSynced": "SCIM synced",
    "users.filters.allAccountTypes": "All Account Types",
    "users.filters.allGroups": "All Groups",
    "users.filters.allStatus": "All Status",
    "users.filters.byRole": "Filter by role",
    "users.filters.byGroup": "Filter by group",
    "users.filters.byStatus": "Filter by status",
    "users.filters.searchGroups": "Search groups...",
    "users.filters.noGroups": "No groups found",
    "companies.page.description":
      "Create, inspect, and control tenant companies from a clearer platform workspace.",
    "companies.hero.badge": "Platform admin workspace",
    "companies.hero.title":
      "Run tenant creation, activation, and admin invitations from one intentional control surface.",
    "companies.hero.description":
      "The workflow is built around your multi-tenant operations, with a calmer hierarchy, clearer actions, and the landing-inspired palette carried into the internal product.",
    "companies.hero.domainAwareTitle": "Domain-aware by design",
    "companies.hero.domainAwareDescription":
      "Keep domains optional today, while staying ready for auto-join flows later.",
    "companies.hero.inviteFirstTitle": "Invite-first onboarding",
    "companies.hero.inviteFirstDescription":
      "Each company starts from a secure invitation flow that matches the backend registration model.",
    "companies.metrics.totalCompanies": "Companies",
    "companies.metrics.totalCompaniesDetail":
      "Total tenant companies under platform management.",
    "companies.metrics.activeCompanies": "Active",
    "companies.metrics.activeCompaniesDetail":
      "Companies currently allowed to onboard and log in.",
    "companies.metrics.inactiveCompanies": "Inactive",
    "companies.metrics.inactiveCompaniesDetail":
      "Soft-disabled companies kept intact for recovery.",
    "companies.metrics.totalUsers": "Users mapped",
    "companies.metrics.totalUsersDetail":
      "Active user mappings across every company.",
    "companies.create.badge": "New company",
    "companies.create.title":
      "Provision a tenant and seed its first admin in one step.",
    "companies.create.description":
      "Schema creation, migrations, tenant setup, and the first invitation happen in the same workflow.",
    "companies.fields.companyName": "Company name",
    "companies.fields.displayName": "Display name",
    "companies.fields.domain": "Domain",
    "companies.fields.domainHint":
      "Optional now, ready for future domain-based auto-join.",
    "companies.fields.domainEditHint":
      "Optional. Keep it blank if you are not using domain-based matching yet.",
    "companies.fields.initialAdminEmail": "Initial admin email",
    "companies.fields.adminEmail": "Admin email",
    "companies.fields.adminEmailHint":
      "If the user already exists in this tenant, they will be promoted to Admin automatically.",
    "companies.placeholders.companyName": "Acme Holdings",
    "companies.placeholders.domain": "acme.com",
    "companies.placeholders.displayName": "Company display name",
    "companies.placeholders.adminEmail": "bob@acme.com",
    "companies.placeholders.inviteEmail": "alice@company.com",
    "companies.buttons.create": "Create company",
    "companies.buttons.creating": "Creating...",
    "companies.buttons.view": "View",
    "companies.buttons.save": "Save changes",
    "companies.buttons.saving": "Saving...",
    "companies.buttons.inviteAdmin": "Invite admin",
    "companies.buttons.sending": "Sending...",
    "companies.roster.title": "Company roster",
    "companies.roster.description":
      "Select a company to inspect users, adjust metadata, or change activation state.",
    "companies.roster.search": "Search companies...",
    "companies.roster.error":
      "Failed to load companies. Refresh the page and try again.",
    "companies.roster.emptyTitle": "No companies yet",
    "companies.roster.emptyDescription":
      "Create the first company to provision a tenant and start the invitation flow.",
    "companies.detail.errorTitle": "Failed to load company details.",
    "companies.detail.errorDescription":
      "Try selecting the company again or refresh the page.",
    "companies.detail.noneTitle": "No company selected",
    "companies.detail.noneDescription":
      "Choose a company from the table to inspect users, update metadata, or invite another customer admin.",
    "companies.detail.tenantSchema": "Tenant schema: {{tenantId}}",
    "companies.detail.createdBy": "Created {{date}} by {{createdBy}}",
    "companies.detail.companyAccess": "Company access",
    "companies.detail.managedUsers": "Managed users",
    "companies.detail.lastUpdated": "Last updated",
    "companies.detail.joinDomain": "Join domain",
    "companies.detail.notSet": "Not set",
    "companies.detail.metadata": "Company metadata",
    "companies.detail.inviteCustomerAdmin": "Invite customer admin",
    "companies.detail.usersInCompany": "Users in company",
    "companies.detail.inactiveInviteWarning":
      "Reactivate this company before sending new admin invitations.",
    "companies.users.empty":
      "No invited users yet. Invite a customer admin to start the company onboarding flow.",
    "companies.users.registered": "Registered in tenant",
    "companies.users.pendingRegistration": "Invitation pending registration",
    "companies.columns.company": "Company",
    "companies.columns.users": "Users",
    "companies.columns.status": "Status",
    "companies.columns.created": "Created",
    "companies.columns.createdBy": "by {{createdBy}}",
    "companies.toast.ready": "{{name}} is ready for onboarding",
    "companies.toast.createFailed": "Failed to create company",
    "companies.toast.updated": "Company details updated",
    "companies.toast.updateFailed": "Failed to update company",
    "companies.toast.invitationSent": "Admin invitation sent",
    "companies.toast.invitationFailed": "Failed to invite admin",
    "companies.toast.reactivated": "Company reactivated",
    "companies.toast.deactivated": "Company deactivated",
    "companies.toast.statusFailed": "Failed to update company status",
    "companies.confirm.activate":
      "Activate {{name}}? Users mapped to this company will be able to log in again.",
    "companies.confirm.deactivate":
      "Deactivate {{name}}? Existing mappings stay in place, but login and registration will be blocked.",
    "companies.role.pending": "Pending",
    "companies.role.admin": "Admin",
    "companies.role.curator": "Curator",
    "companies.role.globalCurator": "Global Curator",
    "companies.role.basic": "Basic",
    "companies.role.limited": "Limited",
    "app.sidebar.newSession": "New Session",
    "app.sidebar.searchChats": "Search Chats",
    "app.sidebar.moreAgents": "More Agents",
    "app.sidebar.exploreAgents": "Explore Agents",
    "app.sidebar.newProject": "New Project",
    "app.sidebar.projects": "Projects",
    "app.sidebar.recents": "Recents",
    "app.sidebar.agents": "Agents",
    "app.sidebar.adminPanel": "Admin Panel",
    "app.sidebar.curatorPanel": "Curator Panel",
    "app.sidebar.emptyRecents":
      "Try sending a message! Your chat history will appear here.",
    "app.userSettings.title": "User Settings",
    "app.userSettings.notifications": "Notifications",
    "app.userSettings.help": "Help & FAQ",
    "app.userSettings.login": "Log in",
    "app.userSettings.logout": "Log out",
    "app.userSettings.notificationsWithCount": "Notifications ({{count}})",
  },
  es: {
    "common.language": "Idioma",
    "common.language.english": "Ingles",
    "common.language.spanish": "Español",
    "common.status.active": "Activo",
    "common.status.inactive": "Inactivo",
    "common.status.pending": "Pendiente",
    "common.status.invited": "Invitado",
    "common.status.requested": "Solicitado",
    "common.status.disabled": "Deshabilitado",
    "common.status.removed": "Eliminado",
    "common.justNow": "Ahora mismo",
    "admin.sections.agentsAndActions": "Agentes y acciones",
    "admin.sections.documentsAndKnowledge": "Documentos y conocimiento",
    "admin.sections.integrations": "Integraciones",
    "admin.sections.permissions": "Permisos",
    "admin.sections.organization": "Organizacion",
    "admin.sections.usage": "Uso",
    "admin.sidebar.exit": "Salir del panel admin",
    "admin.sidebar.search": "Buscar paginas del admin...",
    "admin.sidebar.upgradePlan": "Mejorar plan",
    "admin.language.helper": "Aplica Ingles o Español en toda la app interna.",
    "admin.routes.indexingStatus.title": "Conectores existentes",
    "admin.routes.indexingStatus.sidebar": "Conectores existentes",
    "admin.routes.addConnector.title": "Agregar conector",
    "admin.routes.addConnector.sidebar": "Agregar conector",
    "admin.routes.documentSets.title": "Conjuntos de documentos",
    "admin.routes.documentSets.sidebar": "Conjuntos de documentos",
    "admin.routes.documentExplorer.title": "Explorador de documentos",
    "admin.routes.documentExplorer.sidebar": "Explorador",
    "admin.routes.documentFeedback.title": "Feedback de documentos",
    "admin.routes.documentFeedback.sidebar": "Feedback",
    "admin.routes.agents.title": "Agentes",
    "admin.routes.agents.sidebar": "Agentes",
    "admin.routes.slackBots.title": "Integracion con Slack",
    "admin.routes.slackBots.sidebar": "Integracion con Slack",
    "admin.routes.discordBots.title": "Integracion con Discord",
    "admin.routes.discordBots.sidebar": "Integracion con Discord",
    "admin.routes.mcpActions.title": "Acciones MCP",
    "admin.routes.mcpActions.sidebar": "Acciones MCP",
    "admin.routes.openApiActions.title": "Acciones OpenAPI",
    "admin.routes.openApiActions.sidebar": "Acciones OpenAPI",
    "admin.routes.standardAnswers.title": "Respuestas estandar",
    "admin.routes.standardAnswers.sidebar": "Respuestas estandar",
    "admin.routes.groups.title": "Gestionar grupos de usuarios",
    "admin.routes.groups.sidebar": "Grupos",
    "admin.routes.chatPreferences.title": "Preferencias de chat",
    "admin.routes.chatPreferences.sidebar": "Preferencias de chat",
    "admin.routes.llmModels.title": "Modelos de lenguaje",
    "admin.routes.llmModels.sidebar": "Modelos de lenguaje",
    "admin.routes.webSearch.title": "Busqueda web",
    "admin.routes.webSearch.sidebar": "Busqueda web",
    "admin.routes.imageGeneration.title": "Generacion de imagenes",
    "admin.routes.imageGeneration.sidebar": "Generacion de imagenes",
    "admin.routes.voice.title": "Voz",
    "admin.routes.voice.sidebar": "Voz",
    "admin.routes.codeInterpreter.title": "Code Interpreter",
    "admin.routes.codeInterpreter.sidebar": "Code Interpreter",
    "admin.routes.indexSettings.title": "Configuracion del indice",
    "admin.routes.indexSettings.sidebar": "Configuracion del indice",
    "admin.routes.documentProcessing.title": "Procesamiento de documentos",
    "admin.routes.documentProcessing.sidebar": "Procesamiento de documentos",
    "admin.routes.knowledgeGraph.title": "Grafo de conocimiento",
    "admin.routes.knowledgeGraph.sidebar": "Grafo de conocimiento",
    "admin.routes.users.title": "Usuarios y solicitudes",
    "admin.routes.users.sidebar": "Usuarios",
    "admin.routes.companies.title": "Empresas",
    "admin.routes.companies.sidebar": "Empresas",
    "admin.routes.apiKeys.title": "Cuentas de servicio",
    "admin.routes.apiKeys.sidebar": "Cuentas de servicio",
    "admin.routes.tokenRateLimits.title": "Limites de gasto",
    "admin.routes.tokenRateLimits.sidebar": "Limites de gasto",
    "admin.routes.usage.title": "Estadisticas de uso",
    "admin.routes.usage.sidebar": "Estadisticas de uso",
    "admin.routes.queryHistory.title": "Historial de consultas",
    "admin.routes.queryHistory.sidebar": "Historial de consultas",
    "admin.routes.customAnalytics.title": "Analitica personalizada",
    "admin.routes.customAnalytics.sidebar": "Analitica personalizada",
    "admin.routes.theme.title": "Apariencia y tema",
    "admin.routes.theme.sidebar": "Apariencia y tema",
    "admin.routes.billing.title": "Planes y facturacion",
    "admin.routes.billing.sidebar": "Planes y facturacion",
    "admin.routes.indexMigration.title": "Migracion del indice documental",
    "admin.routes.indexMigration.sidebar": "Migracion del indice documental",
    "admin.routes.scim.title": "SCIM",
    "admin.routes.scim.sidebar": "SCIM",
    "admin.routes.debug.title": "Logs de depuracion",
    "admin.routes.debug.sidebar": "Logs de depuracion",
    "connectors.auth.sectionDescription.default":
      "OAuth es la ruta predeterminada aqui. Conecta tu cuenta, aprueba el acceso y luego continua con la configuracion especifica del conector, como carpetas o fuentes.",
    "connectors.auth.sectionDescription.google":
      "Usa primero el flujo OAuth de Google Drive administrado por la plataforma. Inicia sesion, aprueba el acceso a Drive y ACTIVA guardara la conexion para este conector.",
    "connectors.auth.title": "Conecta {{source}}",
    "connectors.auth.existingConnections": "Conexiones existentes",
    "connectors.auth.loadError":
      "No pudimos cargar el estado compartido de la conexion ahora mismo. Aun puedes continuar con la configuracion avanzada abajo.",
    "connectors.auth.oauthUnavailable":
      "OAuth todavia no esta disponible para este conector. Puedes usar la ruta de configuracion avanzada de abajo.",
    "connectors.auth.noLinkedConnectors":
      "Conecta primero y despues continua para elegir carpetas, espacios u otras opciones especificas de la fuente.",
    "connectors.auth.linkedConnectors":
      "{{count}} conector(es) ya usan esta conexion.",
    "connectors.auth.lastSync": "Ultima sincronizacion: {{time}} ({{status}})",
    "connectors.auth.buttons.connectWithGoogle": "Conectar con Google Drive",
    "connectors.auth.buttons.connectAnotherGoogle":
      "Conectar otra cuenta de Google Drive",
    "connectors.auth.buttons.useCustomCredentials": "Usar credenciales custom",
    "connectors.auth.buttons.advancedOptions": "Opciones avanzadas",
    "connectors.auth.buttons.useOwnCredentials":
      "Usar tus propias credenciales",
    "connectors.auth.buttons.uploadJsonManually": "Subir JSON manualmente",
    "connectors.auth.buttons.hideManualSetup": "Ocultar configuracion manual",
    "connectors.auth.buttons.useConnection": "Usar conexion",
    "connectors.auth.buttons.selected": "Seleccionada",
    "connectors.auth.buttons.syncNow": "Sincronizar ahora",
    "connectors.auth.buttons.reconnect": "Reconectar",
    "connectors.auth.buttons.disconnect": "Desconectar",
    "connectors.auth.errors.required": "Obligatorio",
    "connectors.auth.errors.connect": "No se pudo conectar {{source}}.",
    "connectors.auth.errors.reconnect": "No se pudo reconectar {{source}}.",
    "connectors.auth.errors.disconnect": "No se pudo desconectar {{source}}.",
    "connectors.auth.errors.sync": "No se pudo sincronizar {{source}}.",
    "connectors.auth.status.connected": "Conectado",
    "connectors.auth.status.syncing": "Sincronizando",
    "connectors.auth.status.expired": "Expirado",
    "connectors.auth.status.needsReconnect": "Requiere reconexion",
    "connectors.auth.status.connecting": "Conectando",
    "connectors.auth.status.disconnected": "Desconectado",
    "connectors.auth.status.error": "Error",
    "connectors.auth.status.notConnected": "No conectado",
    "connectors.auth.credentialType.platformOauth": "OAuth de plataforma",
    "connectors.auth.credentialType.customerOauth":
      "OAuth gestionado por el cliente",
    "connectors.auth.credentialType.oauth": "OAuth",
    "connectors.auth.credentialType.serviceAccount": "Cuenta de servicio",
    "connectors.auth.credentialType.serviceAccountJson":
      "JSON de cuenta de servicio",
    "connectors.auth.credentialType.manualOauthJson": "JSON OAuth manual",
    "connectors.auth.credentialType.apiKey": "API key",
    "connectors.auth.credentialType.custom": "Custom",
    "connectors.advanced.title": "Configuracion avanzada",
    "connectors.advanced.selectCredential": "Selecciona una credencial",
    "connectors.advanced.description.default":
      "Usa esta ruta para JSON de cuenta de servicio, credenciales de app OAuth custom, configuracion enterprise u otros metodos manuales de autenticacion.",
    "connectors.advanced.description.google":
      "Usa esta ruta avanzada si quieres gestionar tu propio cliente OAuth de Google, o si necesitas el fallback por cuenta de servicio o JSON legacy.",
    "connectors.advanced.modalTitle.manualCredential":
      "Usa tus propias credenciales de {{source}}",
    "connectors.advanced.buttons.createNew": "Crear nueva",
    "users.page.description":
      "Gestiona personas, solicitudes de acceso y membresias del equipo con una vista operativa mas clara.",
    "users.page.invite": "Invitar usuarios",
    "users.summary.activeUsers": "usuarios activos",
    "users.summary.pendingInvites": "invitaciones pendientes",
    "users.summary.requestsToJoin": "solicitudes para unirse",
    "users.summary.scimTitle": "Sincronizacion SCIM",
    "users.summary.scimDescription":
      "Los usuarios se sincronizan desde tu proveedor de identidad.",
    "users.summary.manage": "Gestionar",
    "users.table.title": "Directorio del equipo",
    "users.table.description":
      "Busca, filtra y actualiza accesos sin perder contexto.",
    "users.table.search": "Buscar usuarios...",
    "users.table.downloadCsv": "Descargar CSV",
    "users.table.downloadCsvFailed": "No se pudo descargar el CSV",
    "users.table.noUsersTitle": "No se encontraron usuarios",
    "users.table.noUsersDescription":
      "Ningun usuario coincide con los filtros actuales.",
    "users.table.error":
      "No se pudieron cargar los usuarios. Intenta refrescar la pagina.",
    "users.table.columns.name": "Nombre",
    "users.table.columns.groups": "Grupos",
    "users.table.columns.accountType": "Tipo de cuenta",
    "users.table.columns.status": "Estado",
    "users.table.columns.lastUpdated": "Ultima actualizacion",
    "users.table.status.scimSynced": "Sincronizado por SCIM",
    "users.filters.allAccountTypes": "Todos los tipos de cuenta",
    "users.filters.allGroups": "Todos los grupos",
    "users.filters.allStatus": "Todos los estados",
    "users.filters.byRole": "Filtrar por rol",
    "users.filters.byGroup": "Filtrar por grupo",
    "users.filters.byStatus": "Filtrar por estado",
    "users.filters.searchGroups": "Buscar grupos...",
    "users.filters.noGroups": "No se encontraron grupos",
    "companies.page.description":
      "Crea, inspecciona y controla empresas tenant desde un workspace de plataforma mas claro.",
    "companies.hero.badge": "Workspace de plataforma admin",
    "companies.hero.title":
      "Gestiona creacion de tenants, activacion e invitaciones admin desde una sola superficie intencional.",
    "companies.hero.description":
      "El flujo esta pensado para tu operacion multi-tenant, con jerarquia mas clara, acciones mejor priorizadas y una paleta inspirada en la landing llevada a la app interna.",
    "companies.hero.domainAwareTitle": "Listo para dominios",
    "companies.hero.domainAwareDescription":
      "Mantiene los dominios opcionales hoy, pero preparado para auto-join mas adelante.",
    "companies.hero.inviteFirstTitle": "Onboarding por invitacion",
    "companies.hero.inviteFirstDescription":
      "Cada empresa empieza desde un flujo seguro de invitacion alineado con el modelo de registro del backend.",
    "companies.metrics.totalCompanies": "Empresas",
    "companies.metrics.totalCompaniesDetail":
      "Total de empresas tenant bajo gestion de la plataforma.",
    "companies.metrics.activeCompanies": "Activas",
    "companies.metrics.activeCompaniesDetail":
      "Empresas habilitadas para onboarding e inicio de sesion.",
    "companies.metrics.inactiveCompanies": "Inactivas",
    "companies.metrics.inactiveCompaniesDetail":
      "Empresas deshabilitadas de forma reversible para recuperacion.",
    "companies.metrics.totalUsers": "Usuarios asignados",
    "companies.metrics.totalUsersDetail":
      "Mapeos activos de usuarios a traves de todas las empresas.",
    "companies.create.badge": "Nueva empresa",
    "companies.create.title":
      "Provisiona un tenant y siembra su primer admin en un solo paso.",
    "companies.create.description":
      "La creacion del schema, migraciones, setup del tenant y primera invitacion ocurren dentro del mismo flujo.",
    "companies.fields.companyName": "Nombre de la empresa",
    "companies.fields.displayName": "Nombre visible",
    "companies.fields.domain": "Dominio",
    "companies.fields.domainHint":
      "Opcional por ahora, listo para auto-join basado en dominio.",
    "companies.fields.domainEditHint":
      "Opcional. Dejalo vacio si todavia no usas matching por dominio.",
    "companies.fields.initialAdminEmail": "Email del admin inicial",
    "companies.fields.adminEmail": "Email del admin",
    "companies.fields.adminEmailHint":
      "Si el usuario ya existe en este tenant, se promocionara a Admin automaticamente.",
    "companies.placeholders.companyName": "Acme Holdings",
    "companies.placeholders.domain": "acme.com",
    "companies.placeholders.displayName": "Nombre visible de la empresa",
    "companies.placeholders.adminEmail": "bob@acme.com",
    "companies.placeholders.inviteEmail": "alice@company.com",
    "companies.buttons.create": "Crear empresa",
    "companies.buttons.creating": "Creando...",
    "companies.buttons.view": "Ver",
    "companies.buttons.save": "Guardar cambios",
    "companies.buttons.saving": "Guardando...",
    "companies.buttons.inviteAdmin": "Invitar admin",
    "companies.buttons.sending": "Enviando...",
    "companies.roster.title": "Listado de empresas",
    "companies.roster.description":
      "Selecciona una empresa para inspeccionar usuarios, ajustar metadata o cambiar su activacion.",
    "companies.roster.search": "Buscar empresas...",
    "companies.roster.error":
      "No se pudieron cargar las empresas. Refresca la pagina e intentalo otra vez.",
    "companies.roster.emptyTitle": "Todavia no hay empresas",
    "companies.roster.emptyDescription":
      "Crea la primera empresa para provisionar un tenant y arrancar el flujo de invitacion.",
    "companies.detail.errorTitle":
      "No se pudieron cargar los detalles de la empresa.",
    "companies.detail.errorDescription":
      "Intenta seleccionar la empresa otra vez o refresca la pagina.",
    "companies.detail.noneTitle": "No hay empresa seleccionada",
    "companies.detail.noneDescription":
      "Elige una empresa de la tabla para inspeccionar usuarios, actualizar metadata o invitar otro admin cliente.",
    "companies.detail.tenantSchema": "Schema tenant: {{tenantId}}",
    "companies.detail.createdBy": "Creada {{date}} por {{createdBy}}",
    "companies.detail.companyAccess": "Acceso de la empresa",
    "companies.detail.managedUsers": "Usuarios gestionados",
    "companies.detail.lastUpdated": "Ultima actualizacion",
    "companies.detail.joinDomain": "Dominio de ingreso",
    "companies.detail.notSet": "Sin definir",
    "companies.detail.metadata": "Metadata de la empresa",
    "companies.detail.inviteCustomerAdmin": "Invitar admin cliente",
    "companies.detail.usersInCompany": "Usuarios en la empresa",
    "companies.detail.inactiveInviteWarning":
      "Reactiva esta empresa antes de enviar nuevas invitaciones admin.",
    "companies.users.empty":
      "Todavia no hay usuarios invitados. Invita un admin cliente para iniciar el onboarding de la empresa.",
    "companies.users.registered": "Registrado en el tenant",
    "companies.users.pendingRegistration": "Invitacion pendiente de registro",
    "companies.columns.company": "Empresa",
    "companies.columns.users": "Usuarios",
    "companies.columns.status": "Estado",
    "companies.columns.created": "Creada",
    "companies.columns.createdBy": "por {{createdBy}}",
    "companies.toast.ready": "{{name}} esta lista para onboarding",
    "companies.toast.createFailed": "No se pudo crear la empresa",
    "companies.toast.updated": "Detalles de la empresa actualizados",
    "companies.toast.updateFailed": "No se pudo actualizar la empresa",
    "companies.toast.invitationSent": "Invitacion admin enviada",
    "companies.toast.invitationFailed": "No se pudo invitar al admin",
    "companies.toast.reactivated": "Empresa reactivada",
    "companies.toast.deactivated": "Empresa desactivada",
    "companies.toast.statusFailed":
      "No se pudo actualizar el estado de la empresa",
    "companies.confirm.activate":
      "¿Activar {{name}}? Los usuarios asignados a esta empresa podran volver a iniciar sesion.",
    "companies.confirm.deactivate":
      "¿Desactivar {{name}}? Los mapeos existentes se mantienen, pero se bloqueara el login y el registro.",
    "companies.role.pending": "Pendiente",
    "companies.role.admin": "Admin",
    "companies.role.curator": "Curator",
    "companies.role.globalCurator": "Global Curator",
    "companies.role.basic": "Basic",
    "companies.role.limited": "Limited",
    "app.sidebar.newSession": "Nueva sesion",
    "app.sidebar.searchChats": "Buscar chats",
    "app.sidebar.moreAgents": "Mas agentes",
    "app.sidebar.exploreAgents": "Explorar agentes",
    "app.sidebar.newProject": "Nuevo proyecto",
    "app.sidebar.projects": "Proyectos",
    "app.sidebar.recents": "Recientes",
    "app.sidebar.agents": "Agentes",
    "app.sidebar.adminPanel": "Panel admin",
    "app.sidebar.curatorPanel": "Panel curator",
    "app.sidebar.emptyRecents":
      "Prueba enviar un mensaje. Tu historial de chats aparecera aqui.",
    "app.userSettings.title": "Configuracion de usuario",
    "app.userSettings.notifications": "Notificaciones",
    "app.userSettings.help": "Ayuda y FAQ",
    "app.userSettings.login": "Iniciar sesion",
    "app.userSettings.logout": "Cerrar sesion",
    "app.userSettings.notificationsWithCount": "Notificaciones ({{count}})",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];

export type TranslateFn = (
  key: TranslationKey,
  values?: TranslationValues
) => string;

export const APP_LANGUAGE_OPTIONS: Array<{
  value: AppLanguage;
  labelKey: TranslationKey;
}> = [
  { value: "en", labelKey: "common.language.english" },
  { value: "es", labelKey: "common.language.spanish" },
];

export function isAppLanguage(value: string): value is AppLanguage {
  return value === "en" || value === "es";
}

export function detectInitialAppLanguage(
  browserLanguage?: string | null,
  storedLanguage?: string | null
): AppLanguage {
  if (storedLanguage && isAppLanguage(storedLanguage)) {
    return storedLanguage;
  }

  if (browserLanguage?.toLowerCase().startsWith("es")) {
    return "es";
  }

  return "en";
}

export function getTranslation(
  language: AppLanguage,
  key: TranslationKey,
  values?: TranslationValues
): string {
  const dictionary = translations[language];
  const template = String(dictionary[key] ?? translations.en[key]);

  if (!values) {
    return template;
  }

  return Object.entries(values).reduce<string>((message, [token, value]) => {
    return message.replaceAll(`{{${token}}}`, String(value));
  }, template);
}
