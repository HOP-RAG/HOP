import { IconFunctionComponent } from "@opal/types";
import { TranslateFn, TranslationKey } from "@/lib/i18n/app-language";
import {
  SvgActions,
  SvgActivity,
  SvgArrowExchange,
  SvgAudio,
  SvgBarChart,
  SvgBookOpen,
  SvgBubbleText,
  SvgClipboard,
  SvgCpu,
  SvgDiscordMono,
  SvgDownload,
  SvgEmpty,
  SvgFileText,
  SvgFiles,
  SvgGlobe,
  SvgHistory,
  SvgImage,
  SvgMcp,
  SvgNetworkGraph,
  SvgOnyxOctagon,
  SvgOrganization,
  SvgPaintBrush,
  SvgProgressBars,
  SvgSearchMenu,
  SvgSlack,
  SvgTerminal,
  SvgThumbsUp,
  SvgUploadCloud,
  SvgUser,
  SvgUserKey,
  SvgUserSync,
  SvgUsers,
  SvgWallet,
  SvgZoomIn,
} from "@opal/icons";

export interface AdminRouteEntry {
  path: string;
  icon: IconFunctionComponent;
  title: string;
  sidebarLabel: string;
  copyKey?: string;
}

/**
 * Single source of truth for every admin route: path, icon, page-header
 * title, and sidebar label.
 */
export const ADMIN_ROUTES = {
  INDEXING_STATUS: {
    path: "/admin/indexing/status",
    icon: SvgBookOpen,
    title: "Existing Connectors",
    sidebarLabel: "Existing Connectors",
    copyKey: "indexingStatus",
  },
  ADD_CONNECTOR: {
    path: "/admin/add-connector",
    icon: SvgUploadCloud,
    title: "Add Connector",
    sidebarLabel: "Add Connector",
    copyKey: "addConnector",
  },
  DOCUMENT_SETS: {
    path: "/admin/documents/sets",
    icon: SvgFiles,
    title: "Document Sets",
    sidebarLabel: "Document Sets",
    copyKey: "documentSets",
  },
  DOCUMENT_EXPLORER: {
    path: "/admin/documents/explorer",
    icon: SvgZoomIn,
    title: "Document Explorer",
    sidebarLabel: "Explorer",
    copyKey: "documentExplorer",
  },
  DOCUMENT_FEEDBACK: {
    path: "/admin/documents/feedback",
    icon: SvgThumbsUp,
    title: "Document Feedback",
    sidebarLabel: "Feedback",
    copyKey: "documentFeedback",
  },
  AGENTS: {
    path: "/admin/agents",
    icon: SvgOnyxOctagon,
    title: "Agents",
    sidebarLabel: "Agents",
    copyKey: "agents",
  },
  SLACK_BOTS: {
    path: "/admin/bots",
    icon: SvgSlack,
    title: "Slack Integration",
    sidebarLabel: "Slack Integration",
    copyKey: "slackBots",
  },
  DISCORD_BOTS: {
    path: "/admin/discord-bot",
    icon: SvgDiscordMono,
    title: "Discord Integration",
    sidebarLabel: "Discord Integration",
    copyKey: "discordBots",
  },
  MCP_ACTIONS: {
    path: "/admin/actions/mcp",
    icon: SvgMcp,
    title: "MCP Actions",
    sidebarLabel: "MCP Actions",
    copyKey: "mcpActions",
  },
  OPENAPI_ACTIONS: {
    path: "/admin/actions/open-api",
    icon: SvgActions,
    title: "OpenAPI Actions",
    sidebarLabel: "OpenAPI Actions",
    copyKey: "openApiActions",
  },
  STANDARD_ANSWERS: {
    path: "/admin/standard-answer",
    icon: SvgClipboard,
    title: "Standard Answers",
    sidebarLabel: "Standard Answers",
    copyKey: "standardAnswers",
  },
  GROUPS: {
    path: "/admin/groups",
    icon: SvgUsers,
    title: "Manage User Groups",
    sidebarLabel: "Groups",
    copyKey: "groups",
  },
  CHAT_PREFERENCES: {
    path: "/admin/configuration/chat-preferences",
    icon: SvgBubbleText,
    title: "Chat Preferences",
    sidebarLabel: "Chat Preferences",
    copyKey: "chatPreferences",
  },
  LLM_MODELS: {
    path: "/admin/configuration/llm",
    icon: SvgCpu,
    title: "Language Models",
    sidebarLabel: "Language Models",
    copyKey: "llmModels",
  },
  WEB_SEARCH: {
    path: "/admin/configuration/web-search",
    icon: SvgGlobe,
    title: "Web Search",
    sidebarLabel: "Web Search",
    copyKey: "webSearch",
  },
  IMAGE_GENERATION: {
    path: "/admin/configuration/image-generation",
    icon: SvgImage,
    title: "Image Generation",
    sidebarLabel: "Image Generation",
    copyKey: "imageGeneration",
  },
  VOICE: {
    path: "/admin/configuration/voice",
    icon: SvgAudio,
    title: "Voice",
    sidebarLabel: "Voice",
    copyKey: "voice",
  },
  CODE_INTERPRETER: {
    path: "/admin/configuration/code-interpreter",
    icon: SvgTerminal,
    title: "Code Interpreter",
    sidebarLabel: "Code Interpreter",
    copyKey: "codeInterpreter",
  },
  INDEX_SETTINGS: {
    path: "/admin/configuration/search",
    icon: SvgSearchMenu,
    title: "Index Settings",
    sidebarLabel: "Index Settings",
    copyKey: "indexSettings",
  },
  DOCUMENT_PROCESSING: {
    path: "/admin/configuration/document-processing",
    icon: SvgFileText,
    title: "Document Processing",
    sidebarLabel: "Document Processing",
    copyKey: "documentProcessing",
  },
  KNOWLEDGE_GRAPH: {
    path: "/admin/kg",
    icon: SvgNetworkGraph,
    title: "Knowledge Graph",
    sidebarLabel: "Knowledge Graph",
    copyKey: "knowledgeGraph",
  },
  USERS: {
    path: "/admin/users",
    icon: SvgUser,
    title: "Users & Requests",
    sidebarLabel: "Users",
    copyKey: "users",
  },
  COMPANIES: {
    path: "/admin/companies",
    icon: SvgOrganization,
    title: "Companies",
    sidebarLabel: "Companies",
    copyKey: "companies",
  },
  API_KEYS: {
    path: "/admin/api-key",
    icon: SvgUserKey,
    title: "Service Accounts",
    sidebarLabel: "Service Accounts",
    copyKey: "apiKeys",
  },
  TOKEN_RATE_LIMITS: {
    path: "/admin/token-rate-limits",
    icon: SvgProgressBars,
    title: "Spending Limits",
    sidebarLabel: "Spending Limits",
    copyKey: "tokenRateLimits",
  },
  USAGE: {
    path: "/admin/performance/usage",
    icon: SvgActivity,
    title: "Usage Statistics",
    sidebarLabel: "Usage Statistics",
    copyKey: "usage",
  },
  QUERY_HISTORY: {
    path: "/admin/performance/query-history",
    icon: SvgHistory,
    title: "Query History",
    sidebarLabel: "Query History",
    copyKey: "queryHistory",
  },
  CUSTOM_ANALYTICS: {
    path: "/admin/performance/custom-analytics",
    icon: SvgBarChart,
    title: "Custom Analytics",
    sidebarLabel: "Custom Analytics",
    copyKey: "customAnalytics",
  },
  THEME: {
    path: "/admin/theme",
    icon: SvgPaintBrush,
    title: "Appearance & Theming",
    sidebarLabel: "Appearance & Theming",
    copyKey: "theme",
  },
  BILLING: {
    path: "/admin/billing",
    icon: SvgWallet,
    title: "Plans & Billing",
    sidebarLabel: "Plans & Billing",
    copyKey: "billing",
  },
  INDEX_MIGRATION: {
    path: "/admin/document-index-migration",
    icon: SvgArrowExchange,
    title: "Document Index Migration",
    sidebarLabel: "Document Index Migration",
    copyKey: "indexMigration",
  },
  SCIM: {
    path: "/admin/scim",
    icon: SvgUserSync,
    title: "SCIM",
    sidebarLabel: "SCIM",
    copyKey: "scim",
  },
  DEBUG: {
    path: "/admin/debug",
    icon: SvgDownload,
    title: "Debug Logs",
    sidebarLabel: "Debug Logs",
    copyKey: "debug",
  },
  // Prefix-only entries used for layout matching — not rendered as sidebar
  // items or page headers.
  DOCUMENTS: {
    path: "/admin/documents",
    icon: SvgEmpty,
    title: "",
    sidebarLabel: "",
  },
  PERFORMANCE: {
    path: "/admin/performance",
    icon: SvgEmpty,
    title: "",
    sidebarLabel: "",
  },
} as const satisfies Record<string, AdminRouteEntry>;

/**
 * Helper that converts a route entry into the `{ name, icon, link }`
 * shape expected by the sidebar.
 */
export function sidebarItem(route: AdminRouteEntry) {
  return { name: route.sidebarLabel, icon: route.icon, link: route.path };
}

export function getAdminRouteCopy(route: AdminRouteEntry, t: TranslateFn) {
  if (!route.copyKey) {
    return {
      title: route.title,
      sidebarLabel: route.sidebarLabel,
    };
  }

  return {
    title: t(`admin.routes.${route.copyKey}.title` as TranslationKey),
    sidebarLabel: t(`admin.routes.${route.copyKey}.sidebar` as TranslationKey),
  };
}
