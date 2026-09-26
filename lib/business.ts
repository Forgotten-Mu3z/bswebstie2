// Business and legal details shown on the policy pages, the contact page and
// the footer. Only the owner can supply these. A value left as null is simply
// not shown (the pages point people to WhatsApp instead), and
// scripts/deploy.mjs lists every value that is still missing.
//
// Never fill these with made-up or "example" details: they are published as
// statements about the business.

export type BusinessInfo = {
  /** The name customers know the store by (used across the site). */
  tradingName: string;
  country: string;
  /** Registered legal name, e.g. as on the commercial registration. */
  legalName: string | null;
  /** Commercial registration (CR) number, if the business has one. */
  registrationNumber: string | null;
  /** Address for customers and legal notices. */
  address: string | null;
  /** One address for orders, returns, privacy and legal requests. */
  supportEmail: string | null;
  /**
   * Days after receiving an item within which a change-of-mind return can be
   * asked for. null: no fixed period is published (customers ask first).
   */
  changeOfMindDays: number | null;
  /** How customers can pay, e.g. ['Cash on collection', 'Bank transfer']. */
  paymentMethods: string[] | null;
  /** How orders reach customers: delivery areas, collection, times. */
  delivery: string | null;
  /** Governing law and courts, worded by the owner's legal adviser. */
  governingLaw: string | null;
};

export const BUSINESS: BusinessInfo = {
  tradingName: 'BLACKSHARK',
  country: 'Oman',
  // TODO_OWNER: every value below. Leave null until confirmed.
  legalName: null,
  registrationNumber: null,
  address: null,
  supportEmail: null,
  changeOfMindDays: null,
  paymentMethods: null,
  delivery: null,
  // TODO_LEGAL_REVIEW: confirm governing-law and dispute wording with
  // qualified Oman legal counsel before filling this in.
  governingLaw: null,
};

/** "BLACKSHARK" or "Legal Name LLC (trading as BLACKSHARK)". */
export function businessName() {
  return BUSINESS.legalName
    ? `${BUSINESS.legalName} (trading as ${BUSINESS.tradingName})`
    : BUSINESS.tradingName;
}
