// Everything the store keeps in the shopper's browser (localStorage), in one
// place so the Cookies page describes and clears exactly these. Adding a key
// means updating app/(store)/cookies/page.tsx too.
export const STORAGE_KEYS = {
  /** Saved items (heart button). */
  saved: 'bsg-wishlist-v1',
  /** The PC build in progress. */
  build: 'bsg-build-v1',
  /** Cart from before ordering moved to WhatsApp; only ever removed. */
  oldCart: 'bsg-cart-v1',
} as const;
