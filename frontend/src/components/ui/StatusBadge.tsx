import type { OperationStatus } from '../../types/api';

interface StatusBadgeProps {
  status: OperationStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`badge badge-${status}`}>{status.toUpperCase()}</span>;
}

