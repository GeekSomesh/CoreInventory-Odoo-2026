export type OperationStatus = 'draft' | 'waiting' | 'ready' | 'done' | 'cancelled';
export type OperationType = 'receipt' | 'delivery' | 'transfer' | 'adjustment';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

export interface Location {
  id: string;
  warehouse_id: string;
  name: string;
  full_path: string;
  type?: string;
  active?: boolean;
}

export interface Warehouse {
  id: string;
  name: string;
  short_code: string;
  address?: string;
  active: boolean;
  created_at?: string;
  locations?: Location[];
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category_id: string | null;
  category_name?: string;
  uom: string;
  reorder_min: number;
  reorder_max: number;
  active: boolean;
  created_at?: string;
  total_stock?: number;
  stock_by_location?: Array<{ location: string; qty: number }>;
}

export interface ReceiptLine {
  id: string;
  receipt_id: string;
  product_id: string;
  expected_qty: number;
  received_qty: number;
  location_id: string | null;
  product_name?: string;
  sku?: string;
  uom?: string;
  location_name?: string;
}

export interface Receipt {
  id: string;
  ref: string;
  supplier: string;
  warehouse_id: string;
  warehouse_name?: string;
  scheduled_date: string | null;
  notes?: string;
  status: OperationStatus;
  created_by: string;
  validated_by?: string;
  created_at: string;
  validated_at?: string;
  lines: ReceiptLine[];
}

export interface DeliveryLine {
  id: string;
  delivery_id: string;
  product_id: string;
  demand_qty: number;
  done_qty: number;
  location_id: string | null;
  product_name?: string;
  sku?: string;
  uom?: string;
  location_name?: string;
}

export interface Delivery {
  id: string;
  ref: string;
  customer: string;
  warehouse_id: string;
  warehouse_name?: string;
  scheduled_date: string | null;
  notes?: string;
  status: OperationStatus;
  created_by: string;
  validated_by?: string;
  created_at: string;
  validated_at?: string;
  lines: DeliveryLine[];
}

export interface TransferLine {
  id: string;
  transfer_id: string;
  product_id: string;
  qty: number;
  product_name?: string;
  sku?: string;
  uom?: string;
}

export interface Transfer {
  id: string;
  ref: string;
  from_location_id: string;
  to_location_id: string;
  from_location_name?: string;
  to_location_name?: string;
  scheduled_date: string | null;
  notes?: string;
  status: OperationStatus;
  created_by: string;
  validated_by?: string;
  created_at: string;
  validated_at?: string;
  lines: TransferLine[];
}

export interface AdjustmentLine {
  id: string;
  adjustment_id: string;
  product_id: string;
  system_qty: number;
  counted_qty: number;
  change_qty?: number;
  resulting_qty?: number;
  delta: number;
  product_name?: string;
  sku?: string;
  uom?: string;
}

export interface Adjustment {
  id: string;
  ref: string;
  location_id: string;
  location_name?: string;
  notes?: string;
  status: OperationStatus;
  created_by: string;
  validated_by?: string;
  created_at: string;
  validated_at?: string;
  lines: AdjustmentLine[];
}

export interface MoveHistoryItem {
  id: string;
  operation_type: OperationType;
  ref: string;
  product_id: string;
  product_name?: string;
  sku?: string;
  from_location_id: string;
  to_location_id: string;
  from_location_name?: string;
  to_location_name?: string;
  qty: number;
  user_id: string;
  user_name?: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface DashboardStats {
  totalProducts: number;
  lowStockItems: number;
  pendingReceipts: number;
  pendingDeliveries: number;
  pendingTransfers: number;
  lowStockList: Product[];
  recentMoves: MoveHistoryItem[];
}

export interface DashboardTrendPoint {
  date: string;
  received: number;
  delivered: number;
  transferred: number;
  adjusted: number;
}

export interface DashboardCategorySummary extends Category {
  product_count: number;
  total_stock: number;
}

export interface AutomationSummary {
  requested_lines: number;
  requested_qty: number;
  transfer_docs: number;
  transfer_qty: number;
  receipt_docs: number;
  receipt_qty: number;
  delivery_lines: number;
  delivery_qty: number;
}

export interface AutomationDeliveryResponse {
  delivery: Delivery;
  transfers: Transfer[];
  receipts: Receipt[];
  summary: AutomationSummary;
}
