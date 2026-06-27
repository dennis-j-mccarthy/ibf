// Coordinator-friendly fair journey, mapping HubSpot deal stages (across the
// Sales + Accounting pipelines) to a simple 5-step progression.
export const FAIR_STATUS_STEPS = [
  'Booked',
  'Prepping',
  'Books shipping',
  'Fair week',
  'Wrapped up',
] as const;

// dealstage id -> step (1..5). Stage ids are unique across pipelines.
const STAGE_TO_STEP: Record<string, number> = {
  // Sales Pipeline — booked once the contract is signed
  closedwon: 1,
  // IBF Sales Pipeline — Closed Won
  '1334097016': 1,
  // Accounting Pipeline (execution)
  '995003204': 2, // Virtual Pre Fair
  '995003205': 2, // On Site Pre Fair < 90 Days
  '1103699306': 2, // Sales Order Creation
  '1103699307': 3, // Manifest Downloaded
  '999761060': 3, // CSI Shipping
  '995003206': 4, // Fair Occurring
  '1103699308': 5, // POS Reports
  '995003207': 5, // Post Fair
  '999761062': 5, // Final Fair Reconciliation
  '999761059': 5, // CSI Ship to Schools inquiries
  '995003208': 5, // CSI Refund
  '999761058': 5, // CSI Ave Dollars Cash Back
  '999761061': 5, // CSI Odd Duck
  '999761063': 5, // Accounts Receivable
  '999761064': 5, // Final Closeout
};

// Cancelled / lost / not-moving-forward → no status shown.
const LOST = new Set(['closedlost', '977375353', '1334097017']);

// Returns the current step (1..5), or null when cancelled/unknown. Anything on
// the dashboard with an upcoming fair is at least "Booked".
export function fairStatusStep(dealstage: string | null | undefined): number | null {
  if (!dealstage || LOST.has(dealstage)) return null;
  return STAGE_TO_STEP[dealstage] ?? 1;
}
