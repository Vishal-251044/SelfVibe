"use client";

/**
 * "Are you sure?" sheet for destructive actions (delete track / artist / album).
 */
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import FormAlert from "@/components/ui/FormAlert";

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {() => void} props.onConfirm
 * @param {string} props.title
 * @param {string} props.description
 * @param {string} [props.confirmLabel="Delete"]
 * @param {boolean} [props.loading=false]
 * @param {string|null} [props.error]
 */
export default function ConfirmSheet({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  loading = false,
  error = null,
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      dismissible={!loading}
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            loading={loading}
            className="bg-danger text-black shadow-none hover:bg-danger/85 hover:shadow-none"
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <FormAlert message={error} />
    </Sheet>
  );
}
