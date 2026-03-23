import { UserRole } from "@/lib/types";

export interface PaginatedResponse<T> {
  items: T[];
  total_items: number;
}

export interface CompanySnapshot {
  id: string;
  tenant_id: string;
  name: string;
  domain: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  user_count: number;
}

export interface CompanyUserSnapshot {
  email: string;
  mapping_active: boolean;
  registered: boolean;
  role: UserRole | null;
  is_active: boolean | null;
}

export interface CompanyDetail extends CompanySnapshot {
  users: CompanyUserSnapshot[];
}

export interface CompanyCreatePayload {
  name: string;
  admin_email: string;
  domain?: string | null;
}

export interface CompanyUpdatePayload {
  name?: string;
  domain?: string | null;
}
