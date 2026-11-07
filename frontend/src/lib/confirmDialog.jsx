import { useEffect, useState } from "react";
import ConfirmModal from "@/components/ui/ConfirmModal";

// In-app replacement for window.confirm(). Usage:
//   if (!(await confirmDialog({ title: "Delete term?", message: "...", variant: "danger" }))) return;
let openDialog = null;

/**
 * Opens the shared confirm dialog and resolves true (confirmed) or false (cancelled).
 *
 * @param {{title?: string, message?: string, confirmLabel?: string, cancelLabel?: string, variant?: string}} options
 * @returns {Promise<boolean>}
 */
export function confirmDialog(options = {}) {
  if (!openDialog) return Promise.resolve(false);
  return new Promise((resolve) => openDialog({ ...options, resolve }));
}

/** Mount once near the app root. */
export function ConfirmDialogHost() {
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    openDialog = (next) => {
      setDialog((current) => {
        current?.resolve(false); // a newer request replaces an unanswered one
        return next;
      });
    };
    return () => { openDialog = null; };
  }, []);

  const close = (answer) => {
    dialog?.resolve(answer);
    setDialog(null);
  };

  return (
    <ConfirmModal
      open={Boolean(dialog)}
      onClose={() => close(false)}
      onConfirm={() => close(true)}
      variant={dialog?.variant || "warning"}
      title={dialog?.title || "Are you sure?"}
      message={dialog?.message}
      confirmLabel={dialog?.confirmLabel || "Confirm"}
      cancelLabel={dialog?.cancelLabel || "Cancel"}
    />
  );
}
