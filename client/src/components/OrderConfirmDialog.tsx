import { useEffect, useRef } from "react";

export interface OrderConfirmationItem {
  product_name: string;
  quantity: number;
  price: number;
  line_total?: number;
}

export interface OrderConfirmation {
  type: string;
  items: OrderConfirmationItem[];
  item_count: number;
  total: number;
}

interface OrderConfirmDialogProps {
  confirmation: OrderConfirmation | null;
  isSubmitting: boolean;
  onApprove: () => void;
  onDecline: () => void;
}

// Values arrive from JSON, so the declared types are an assumption rather than
// a guarantee. Coercing keeps a non-numeric total from throwing mid-render.
function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPrice(value: unknown): string {
  return toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function OrderConfirmDialog({
  confirmation,
  isSubmitting,
  onApprove,
  onDecline,
}: OrderConfirmDialogProps) {
  const declineRef = useRef<HTMLButtonElement>(null);

  // Focus starts on Cancel rather than Place order: this dialog spends money,
  // so a stray Enter should not be the thing that commits it.
  useEffect(() => {
    if (confirmation) declineRef.current?.focus();
  }, [confirmation]);

  useEffect(() => {
    if (!confirmation) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onDecline();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirmation, isSubmitting, onDecline]);

  if (!confirmation) return null;

  const items = Array.isArray(confirmation.items) ? confirmation.items : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-confirm-title"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-200/80 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center gap-2.5 pb-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <div className="min-w-0">
            <h2 id="order-confirm-title" className="text-sm font-bold tracking-tight text-slate-900">
              Confirm your order
            </h2>
            <p className="text-[11px] font-medium text-slate-400">
              Nothing is ordered until you approve
            </p>
          </div>
        </div>

        <div className="max-h-56 space-y-2 overflow-y-auto border-t border-slate-100 py-3 custom-scrollbar">
          {items.map((item, index) => (
            <div
              key={`${item.product_name}-${index}`}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 p-2.5"
            >
              <div className="min-w-0 pr-2">
                <h3 className="truncate text-xs font-semibold text-slate-800">
                  {item.product_name}
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  ₹{formatPrice(item.price)} &bull;{" "}
                  <span className="font-medium text-slate-600">Qty: {item.quantity}</span>
                </p>
              </div>

              <span className="shrink-0 text-xs font-bold text-blue-600">
                ₹
                {formatPrice(
                  item.line_total ?? toNumber(item.price) * toNumber(item.quantity)
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-xs font-semibold text-slate-500">
            Total ({confirmation.item_count}{" "}
            {confirmation.item_count === 1 ? "item" : "items"})
          </span>
          <span className="text-base font-bold tracking-tight text-slate-900">
            ₹{formatPrice(confirmation.total)}
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            ref={declineRef}
            type="button"
            onClick={onDecline}
            disabled={isSubmitting}
            className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onApprove}
            disabled={isSubmitting}
            className="flex-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-500 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? "Placing..." : "Place order"}
          </button>
        </div>
      </div>
    </div>
  );
}
