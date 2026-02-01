export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export type ShowToastFunction = (
  type: ToastType,
  message: string,
  duration?: number
) => void;
