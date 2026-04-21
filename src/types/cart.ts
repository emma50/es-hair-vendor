export interface CartItem {
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  price: number;
  quantity: number;
  image: string;
  slug: string;
  maxStock: number;
}

/**
 * State Management Map
 * ═══════════════════
 *
 * This project follows a strict "one source of truth per data type" policy.
 * Each piece of state lives in exactly ONE location:
 *
 * ┌─────────────────────────────┬────────────────────┬──────────────────────────────────┐
 * │ Data                        │ Location           │ Reason                           │
 * ├─────────────────────────────┼────────────────────┼──────────────────────────────────┤
 * │ Cart items + display data   │ Zustand+localStorage│ Must persist across sessions,   │
 * │                             │ (eshair-cart-v1)   │ work offline before hydration.   │
 * │                             │                    │ Denormalized by design: cart      │
 * │                             │                    │ snapshots price/name at add-time. │
 * │                             │                    │ Server re-validates at checkout.  │
 * ├─────────────────────────────┼────────────────────┼──────────────────────────────────┤
 * │ Toast notifications         │ React Context      │ Ephemeral, cross-component,      │
 * │                             │ (ToastProvider)    │ auto-dismiss. No persistence.    │
 * ├─────────────────────────────┼────────────────────┼──────────────────────────────────┤
 * │ Filters (category, sort,    │ URL searchParams   │ Shareable, bookmarkable,         │
 * │ search, page/cursor)        │                    │ server-readable. The URL is the   │
 * │                             │                    │ single source of truth.           │
 * ├─────────────────────────────┼────────────────────┼──────────────────────────────────┤
 * │ Announcement dismissed      │ sessionStorage     │ Dismissed per browser session,    │
 * │                             │                    │ reappears on new session.         │
 * ├─────────────────────────────┼────────────────────┼──────────────────────────────────┤
 * │ UI toggles (mobile nav,     │ Local useState     │ Component-scoped, no other       │
 * │ gallery index, variant      │                    │ component needs this data.        │
 * │ selection, field errors,    │                    │                                  │
 * │ payment method)             │                    │                                  │
 * ├─────────────────────────────┼────────────────────┼──────────────────────────────────┤
 * │ Server data (products,      │ Server (DB)        │ Fetched via server components     │
 * │ orders, categories,         │                    │ or server actions. Never cached   │
 * │ settings)                   │                    │ in client state — React cache +   │
 * │                             │                    │ ISR handle freshness.             │
 * └─────────────────────────────┴────────────────────┴──────────────────────────────────┘
 *
 * Rules:
 * 1. NEVER duplicate server data in client state (no product cache in Zustand)
 * 2. NEVER store URL-representable state in useState (use searchParams)
 * 3. NEVER use Context for high-frequency updates (use Zustand selectors)
 * 4. Cart price/stock validated server-side at checkout, not re-synced client-side
 */
