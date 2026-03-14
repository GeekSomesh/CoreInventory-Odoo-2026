import { format } from 'date-fns';
import type { OperationStatus, OperationType } from '../types/api';

const opTypeLabelMap: Record<OperationType, string> = {
  receipt: 'Receipt',
  delivery: 'Delivery',
  transfer: 'Transfer',
  adjustment: 'Adjustment',
};

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, 'dd MMM yyyy, HH:mm');
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, 'dd MMM yyyy');
}

export function formatQty(value: number | null | undefined): string {
  return new Intl.NumberFormat('en-US').format(value ?? 0);
}

export function statusClassName(status: OperationStatus): string {
  return `badge badge-${status}`;
}

export function operationTypeLabel(type: OperationType): string {
  return opTypeLabelMap[type] ?? type;
}

export function compactRef(id: string): string {
  return id.slice(0, 8);
}

