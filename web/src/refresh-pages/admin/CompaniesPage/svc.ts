import type {
  CompanyCreatePayload,
  CompanyDetail,
  CompanySnapshot,
  CompanyUpdatePayload,
  PaginatedResponse,
} from "./interfaces";

const BASE_URL = "/api/admin/companies";
export const COMPANIES_FETCH_URL = `${BASE_URL}?page_num=0&page_size=250`;

const PLATFORM_HEADERS: HeadersInit = {
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_PLATFORM_ADMIN_API_KEY ?? "api_key"}`,
};

async function parseErrorDetail(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const body = await response.json();
    return body?.detail ?? fallback;
  } catch {
    return fallback;
  }
}

async function readJsonOrThrow<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, fallbackMessage));
  }

  return response.json();
}

export async function fetchCompanies(): Promise<
  PaginatedResponse<CompanySnapshot>
> {
  const response = await fetch(COMPANIES_FETCH_URL, {
    headers: PLATFORM_HEADERS,
  });
  return readJsonOrThrow(response, "Failed to load companies");
}

export async function createCompany(
  payload: CompanyCreatePayload
): Promise<CompanyDetail> {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...PLATFORM_HEADERS },
    body: JSON.stringify(payload),
  });

  return readJsonOrThrow(response, "Failed to create company");
}

export async function fetchCompany(companyId: string): Promise<CompanyDetail> {
  const response = await fetch(`${BASE_URL}/${companyId}`, {
    headers: PLATFORM_HEADERS,
  });
  return readJsonOrThrow(response, "Failed to load company");
}

export async function updateCompany(
  companyId: string,
  payload: CompanyUpdatePayload
): Promise<CompanySnapshot> {
  const response = await fetch(`${BASE_URL}/${companyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...PLATFORM_HEADERS },
    body: JSON.stringify(payload),
  });

  return readJsonOrThrow(response, "Failed to update company");
}

export async function inviteCompanyAdmin(
  companyId: string,
  email: string
): Promise<CompanyDetail> {
  const response = await fetch(`${BASE_URL}/${companyId}/invite-admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...PLATFORM_HEADERS },
    body: JSON.stringify({ email }),
  });

  return readJsonOrThrow(response, "Failed to invite company admin");
}

export async function activateCompany(
  companyId: string
): Promise<CompanySnapshot> {
  const response = await fetch(`${BASE_URL}/${companyId}/activate`, {
    method: "POST",
    headers: PLATFORM_HEADERS,
  });

  return readJsonOrThrow(response, "Failed to activate company");
}

export async function deactivateCompany(
  companyId: string
): Promise<CompanySnapshot> {
  const response = await fetch(`${BASE_URL}/${companyId}/deactivate`, {
    method: "POST",
    headers: PLATFORM_HEADERS,
  });

  return readJsonOrThrow(response, "Failed to deactivate company");
}
