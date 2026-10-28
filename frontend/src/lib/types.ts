export type UserRole = "admin" | "manager" | "storekeeper" | "technician" | "accountant" | "sales" | string;

export interface User {
  id: number;
  name: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  role_id?: number | null;
  branch_id?: number | null;
  branch_name?: string | null;
  is_active: boolean;
  permissions?: string[];
  last_login_at?: string | null;
  created_at?: string | null;
}

export interface Branch {
  id: number;
  name: string;
  code: string;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  is_active: boolean;
  bus_count?: number;
  warehouse_count?: number;
}

export interface Bus {
  id: number;
  bus_no: string;
  name?: string | null;
  make_model?: string | null;
  route?: string | null;
  branch_id?: number | null;
  branch_name?: string | null;
  branch?: { id: number; name: string; code: string } | null;
  odometer_km: number;
  status: "ACTIVE" | "IN_GARAGE" | "OFF_ROAD" | string;
  notes?: string | null;
  tickets_count?: number;
}

export interface PartCatalogItem {
  id: number;
  name: string;
  name_bn?: string | null;
  category?: string | null;
  unit: string;
  life_km?: number | null;
  life_days?: number | null;
}

export interface PartHistoryItem {
  id: number;
  bus_id: number;
  bus_no?: string;
  part_name: string;
  action: "INSTALLED" | "REPLACED" | "TRANSFER_OUT" | "TRANSFER_IN" | string;
  qty: number;
  odometer_km?: number | null;
  on_date: string;
  ticket_id?: number | null;
  counterpart_bus_no?: string | null;
  note?: string | null;
}

export type TicketType =
  | "PART_REQUEST"
  | "PART_REPLACEMENT"
  | "PART_TRANSFER"
  | "WORK_SHEET"
  | "VEHICLE_RELEASE";

export type TicketPriority = "NORMAL" | "URGENT" | "EMERGENCY";

export type TicketStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "VERIFIED"
  | "APPROVED"
  | "FINAL_APPROVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "GARAGE_OUT"
  | "CLOSED"
  | "REJECTED"
  | "CANCELLED";

export interface TicketItem {
  id: number;
  part_name: string;
  part_no?: string | null;
  qty: number;
  unit: string;
  unit_price?: number | null;
  line_total?: number | null;
  remarks?: string | null;
  bin_code?: string | null;
  warehouse_id?: number | null;
  last_replaced_on?: string | null;
  last_replaced_km?: number | null;
  used_km?: number | null;
  expected_life_km?: number | null;
  is_premature: boolean;
  is_premature_wear?: boolean;
  last_installed_date?: string | null;
  actual_km_run?: number | null;
  premature_reason?: string | null;
  premature_note?: string | null;
}

export interface TicketApproval {
  step: number;
  status: "PENDING" | "DONE" | "REJECTED" | "SKIPPED";
  user_name?: string | null;
  comment?: string | null;
  is_override: boolean;
  acted_at?: string | null;
}

export interface TicketAttachment {
  id: number;
  kind: "PROBLEM" | "OLD_PART" | "DOCUMENT" | "OTHER";
  url: string;
  name: string;
  is_image: boolean;
  note?: string | null;
  uploaded_by?: string | null;
  created_at: string;
}

export interface TicketEvent {
  id: number;
  event: string;
  detail?: string | null;
  user_name?: string | null;
  created_at: string;
}

export interface ReleaseChecklistItem {
  id: number;
  label: string;
  label_bn?: string | null;
  checked: boolean;
  checked_by?: string | null;
  checked_at?: string | null;
  note?: string | null;
}

export interface TicketActionGuards {
  edit: boolean;
  submit: boolean;
  delete: boolean;
  verify: boolean;
  approve: boolean;
  final_approve: boolean;
  reject: boolean;
  override: boolean;
  reopen: boolean;
  cancel: boolean;
  start: boolean;
  complete: boolean;
  garage_out: boolean;
  close: boolean;
  cost: boolean;
  checklist: boolean;
  attach: boolean;
  comment: boolean;
}

export interface Ticket {
  id: number;
  ticket_no: string;
  type: TicketType;
  title: string;
  description?: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  bus_id?: number | null;
  to_bus_id?: number | null;
  bus?: { id: number; bus_no: string; name?: string; route?: string; odometer_km?: number; status?: string } | null;
  to_bus?: { id: number; bus_no: string; name?: string; route?: string; odometer_km?: number; status?: string } | null;
  branch?: { id: number; name: string; code: string } | null;
  warehouse_id?: number | null;
  warehouse?: { id: number; name: string; code: string; location?: string | null } | null;
  route?: string | null;
  driver_name?: string | null;
  odometer_km?: number | null;
  needed_by?: string | null;
  reason_category?: string | null;
  reason_text?: string | null;
  is_premature: boolean;
  labor_cost?: number | null;
  parts_cost?: number | null;
  other_cost?: number | null;
  items_total?: number | null;
  total?: number | null;
  total_cost?: number | null;
  work_notes?: string | null;
  created_by_id?: number | null;
  created_by_name?: string | null;
  created_at?: string;
  submitted_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  garage_out_at?: string | null;
  garage_out_by?: string | null;
  gate_pass_no?: string | null;
  closed_at?: string | null;
  reject_reason?: string | null;
  rejected_by?: string | null;
  pending_step?: number | null;
  items_count?: number;
  images_count?: number;
  items?: TicketItem[];
  approvals?: TicketApproval[];
  attachments?: TicketAttachment[];
  events?: TicketEvent[];
  checklist?: ReleaseChecklistItem[];
  can?: TicketActionGuards;
}

export interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export type Page<T> = PageResponse<T>;

export interface TicketSummary {
  counts: {
    total: number;
    open: number;
    draft: number;
    pending_approval: number;
    pending_me: number;
    approved_waiting: number;
    in_progress: number;
    completed: number;
    garage_out: number;
    closed: number;
    rejected: number;
    premature: number;
    buses_in_garage: number;
  };
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  pending_me: Ticket[];
  recent: Ticket[];
  daily: { date: string; count: number }[];
  top_buses: { bus_no: string; tickets: number; cost?: number | null }[];
}

export interface Warehouse {
  id: number;
  branch_id: number;
  branch_name?: string | null;
  name: string;
  code: string;
  location?: string | null;
  warehouse_type: string;
  is_location_based: boolean;
  is_active: boolean;
  total_bins?: number;
  created_at?: string | null;
}

export interface LocationBin {
  id: number;
  warehouse_id: number;
  row_code: string;
  col_code: string;
  rack_code: string;
  bin_code: string;
  full_code: string;
  name: string;
  loc_type: string;
  max_capacity?: number | null;
  status: string;
}

export interface HierarchyRack {
  rack_code: string;
  bins: LocationBin[];
}

export interface HierarchyCol {
  col_code: string;
  racks: HierarchyRack[];
}

export interface HierarchyRow {
  row_code: string;
  cols: HierarchyCol[];
}

export interface WarehouseLocationsPayload {
  warehouse: Warehouse;
  total_bins: number;
  locations: LocationBin[];
  hierarchy: HierarchyRow[];
}

export interface Supplier {
  id: number;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  supplied_categories?: string | null;
  rating: number;
  notes?: string | null;
  is_active: boolean;
  created_at?: string | null;
}
