// ================================================================
// STRIPE PRICE CONFIGURATION — single source of truth
//
// Update the `id` fields here once you have created products/prices
// in the Stripe Dashboard. Both the frontend (subscription.model.ts)
// and the Cloud Functions (index.ts) import from this file.
//
// Guest pass price ID is backend-only — set it in functions/.env:
//   STRIPE_GUEST_PASS_PRICE_ID=price_1XYZ...
// ================================================================

export const STRIPE_PRICES = {

  //EXAMPLE OF PRICE INCREASE - ALWAYS KEEP ALL PREVIOUS IDs
  //   basic: {
  //     quarterly:   { id: 'price_1TCsduH14haeupiArZVyTSg2', displayCents: 999  },  // grandfathered
  //     yearly:      { id: 'price_basic_yearly',             displayCents: 3499 },  // grandfathered
  //     quarterlyV2: { id: 'price_1NEW_ID_HERE',             displayCents: 1299 },  // Jan 2027 increase
  //     yearlyV2:    { id: 'price_1NEW_ID_HERE',             displayCents: 4999 },
  //   },

  basic: {
    quarterly: { id: 'price_1TCtTIH14haeupiAChtIybDx', displayCents: 1500 },
    yearly:    { id: 'price_1TCtT4H14haeupiAUA4b6qWn',    displayCents: 3000 },
  },
  standard: {
    quarterly: { id: 'price_1TCsduH14haeupiArZVyTSg2', displayCents: 2000  },
    yearly:    { id: 'price_1TCtR6H14haeupiAkV4e1aWH', displayCents: 4000 },
  },
  gold: {
    quarterly: { id: 'price_1TCtTnH14haeupiA5OjJg0UJ', displayCents: 4500 },
    yearly:    { id: 'price_1TCtU8H14haeupiA6ddAwilS',    displayCents: 9000 },
  },
} as const;

// Maps every Price ID → its tier name. Used by the webhook handler.
// Amount and interval are read directly from the Stripe event payload.
export const PRICE_TIER_MAP: Record<string, string> = Object.fromEntries(
  (Object.entries(STRIPE_PRICES) as [string, Record<string, { id: string; displayCents: number }>][])
    .flatMap(([tier, prices]) =>
      Object.values(prices).map(({ id }) => [id, tier])
    )
);
