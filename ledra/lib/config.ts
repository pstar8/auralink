/**
 * One place for anything you might want to rename before the demo.
 */
export const BRAND = {
  name: 'AuraLink',
  tagline: 'Payments that reconcile themselves',
  seller: {
    name: 'Amaka Obi',
    shop: 'Amaka Threads',
    initials: 'AO',
    city: 'Ibadan',
  },
};

export const APP = {
  sandbox: true,
  /** How long a payment link stays live. */
  quoteMinutes: 15,
  /** Small tolerance for exchange-rate drift, in percent. */
  underpayTolerance: 1,
  currency: '₦',
};

export const RATES = {
  /** Naira per 1 USDC, refreshed by the quote engine. */
  usdcNgn: 1615.4,
  /** Busha's cut on settled payments. */
  feePercent: 0.8,
};
