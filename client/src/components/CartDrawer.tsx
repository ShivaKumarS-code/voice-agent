export interface CartItem {
  cart_item_id: string;
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  item_total?: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  isLoading: boolean;
}

// These values arrive from JSON, so the declared types are an assumption rather
// than a guarantee. Coercing keeps a non-numeric price from throwing mid-render,
// which would blank the whole app rather than just the drawer.
function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPrice(value: unknown): string {
  return toNumber(value).toFixed(2);
}

export function CartDrawer({ isOpen, onClose, cartItems, isLoading }: CartDrawerProps) {
  if (!isOpen) return null;

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + toNumber(item.price) * toNumber(item.quantity),
    0
  );

  return (
    <div className="absolute right-0 top-11 w-80 sm:w-96 bg-white rounded-2xl p-4 shadow-xl ring-1 ring-slate-200/80 z-50 animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 tracking-tight">Shopping Cart</h2>
            <p className="text-[10px] font-medium text-slate-400">Managed by AI Assistant</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close cart"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Cart Items List */}
      <div className="py-3 max-h-72 overflow-y-auto space-y-2 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-2">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-[11px] font-medium text-slate-400">Updating cart...</span>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
            <div className="h-10 w-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">Your cart is empty</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Ask AI: <span className="text-blue-600 font-medium">"Add headphones to my cart"</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {cartItems.map((item) => (
              <div
                key={item.cart_item_id}
                className="p-2.5 rounded-xl bg-slate-50/80 hover:bg-slate-50 border border-slate-100 flex items-center justify-between transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <h4 className="text-xs font-semibold text-slate-800 truncate">{item.product_name}</h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                    <span>${formatPrice(item.price)}</span>
                    <span>&bull;</span>
                    <span className="font-medium text-slate-600">Qty: {item.quantity}</span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="text-xs font-bold text-blue-600">
                    ${formatPrice(toNumber(item.price) * toNumber(item.quantity))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {cartItems.length > 0 && (
        <div className="pt-3 border-t border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Subtotal</span>
            <span className="text-sm font-bold text-slate-900 tracking-tight">
              ${formatPrice(totalAmount)}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 text-center leading-normal">
            Cart updates live when you talk or chat with the AI assistant.
          </p>
        </div>
      )}
    </div>
  );
}
