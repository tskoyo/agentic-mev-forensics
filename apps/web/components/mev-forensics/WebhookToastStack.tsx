"use client";

import { WebhookToast } from "./WebhookToast";

export interface ToastItem {
  id: string;
  txHash: string;
}

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  onJump: (txHash: string) => void;
}

export function WebhookToastStack({ toasts, onDismiss, onJump }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <WebhookToast
          key={t.id}
          txHash={t.txHash}
          onDismiss={() => onDismiss(t.id)}
          onJump={onJump}
        />
      ))}
    </div>
  );
}
