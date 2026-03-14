import type { OperationStatus } from '../../types/api';

export const operationStatusOptions: OperationStatus[] = [
  'draft',
  'waiting',
  'ready',
  'done',
  'cancelled',
];

export function operationProgressStep(status: OperationStatus): number {
  switch (status) {
    case 'draft':
      return 0;
    case 'waiting':
      return 1;
    case 'ready':
      return 2;
    case 'done':
      return 3;
    default:
      return 0;
  }
}

