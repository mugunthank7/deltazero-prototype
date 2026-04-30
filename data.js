// data.js — Scenario script for the DeltaZero pipeline demo.
// One in-flight order ("CHAMP-2104") walking through the pipeline.
// The agent narrates each scene, errors are flagged, then resolved as the
// pipeline advances — modeling Art's "cone of uncertainty" shrinking.

window.STAGES_FULL = [
  { id: 'smtp',  label: 'Email Inbox',     sub: 'quotes@champion',     internal: false, kind: 'inbound' },
  { id: 'quote', label: 'Quote',           sub: 'NetSuite',            internal: false, kind: 'ns' },
  { id: 'po',    label: 'Purchase Order',  sub: 'NetSuite',            internal: false, kind: 'ns' },
  { id: 'so',    label: 'Sales Order',     sub: 'NetSuite',            internal: false, kind: 'ns' },
  { id: 'wo',    label: 'Work Order',      sub: 'Internal',            internal: true,  kind: 'ns' },
  { id: 'ps',    label: 'Packing Slip',    sub: 'Internal',            internal: true,  kind: 'ns' },
];

window.STAGES_FOUR = window.STAGES_FULL.filter(s => !s.internal);

// Confidence after the agent finishes processing each stage.
// Reflects the cone of uncertainty: errors caught early → confidence climbs.
window.STAGE_CONFIDENCE = {
  smtp: 0.62, quote: 0.74, po: 0.86, so: 0.94, wo: 0.97, ps: 0.99,
};

// Ambient totals (Art wanted real-ish numbers from phase data).
window.AMBIENT = {
  emails_processed: 1482,
  quotes: 346,
  pos: 346,
  sos: 346,
  line_items: 2248,
  classifier_acc: 1.00,
  manual_review: 0.007,
};

// The sample order being walked through the pipeline.
window.ORDER = {
  id: 'CHAMP-2104',
  customer: 'Champion Industrial Supply',
  rep: 'M. Alvarez',
  quote_no: 'Q-4471',
  po_no: 'PO-8821',
  so_no: 'SO-2104',
  wo_no: 'WO-1947',
  ps_no: 'PS-1112',
};

// SCENARIOS — each is a list of "scenes". A scene drives:
//   activeStage, agent line, errors revealed/resolved, focus inspector pane.
// Errors live on stages and have severity CRITICAL/HIGH/MEDIUM/LOW.
//
// kind: 'reading' | 'thinking' | 'finding' | 'fixing' | 'done'
// op:   side-effect on errors map: { add: [...], resolve: [errIds] }

const QTY_DATE_PRICE = {
  id: 'qty_date_price',
  label: 'Quantity + date + price drift',
  errors: {
    e1: { stage: 'quote', sev: 'HIGH',     field: 'quantity', email: '500 units', record: '50 units',
           note: 'Email from buyer says 500 — quote shows 50. Likely transcription typo.' },
    e2: { stage: 'po',    sev: 'CRITICAL', field: 'delivery_date', email: 'May 14', record: 'May 28',
           note: 'Buyer pushed delivery to May 14 in email thread. PO not updated.' },
    e3: { stage: 'so',    sev: 'MEDIUM',   field: 'unit_price',  email: '$42.80', record: '$44.10',
           note: 'Negotiated price $42.80 in last reply. SO carries pre-negotiation list price.' },
  },
  scenes: [
    { stage: 'smtp', kind: 'reading',
      line: "I see 14 new emails on quotes@champion. Classifying personal vs work.",
      detail: 'Two-layer classifier: rules + LLM at 0.85 confidence threshold.' },
    { stage: 'smtp', kind: 'thinking',
      line: "12 are work emails. 1 thread is for order CHAMP-2104, Champion Industrial Supply.",
      detail: 'Threading by subject + Message-ID references. 6 messages over 3 days.' },
    { stage: 'quote', kind: 'reading',
      line: "Pulling Quote Q-4471 from NetSuite via MCP. Comparing 14 fields against the email thread.",
      detail: 'Extractor schema: customer, line items, quantities, prices, delivery dates, terms.' },
    { stage: 'quote', kind: 'finding',
      line: "Found a discrepancy on Q-4471 — quantity says 50, but the buyer wrote 500 in their last email.",
      op: { add: ['e1'] },
      detail: 'Email evidence: "...please quote 500 units of 8821-A by Friday."' },
    { stage: 'po', kind: 'reading',
      line: "Moving to PO-8821. Re-checking the email thread for any change events since the quote.",
      detail: 'Email is the source of truth until first PO. After that, NetSuite leads — but every reply is still checked.' },
    { stage: 'po', kind: 'finding',
      line: "Critical: buyer requested delivery May 14 in email. PO still shows May 28.",
      op: { add: ['e2'] },
      detail: 'Email from buyer Tue 9:14am — "Need these on the dock by 5/14, latest."' },
    { stage: 'po', kind: 'fixing',
      line: "Notified M. Alvarez about the quantity issue on Q-4471. They updated to 500.",
      op: { resolve: ['e1'] },
      detail: 'Notification sent at 11:02am. NetSuite event observed at 11:08am. Re-validated.' },
    { stage: 'so', kind: 'reading',
      line: "Sales Order SO-2104 is open. Comparing pricing line by line.",
      detail: 'PO is now the truth-source for quantity & ship date. Email re-checked for any newer change events.' },
    { stage: 'so', kind: 'finding',
      line: "Unit price on SO-2104 looks pre-negotiation — buyer agreed $42.80, SO has $44.10.",
      op: { add: ['e3'] },
      detail: 'Reply thread Wed 4:31pm confirmed the discount.' },
    { stage: 'so', kind: 'fixing',
      line: "Both date and price corrections were entered. Re-validating SO-2104.",
      op: { resolve: ['e2', 'e3'] },
      detail: 'Two events observed in NetSuite within 18 minutes of notification.' },
    { stage: 'wo', kind: 'thinking',
      line: "Work Order WO-1947 generated downstream. Cross-checking quantities and dates flow through cleanly.",
      detail: 'WO and Packing Slip are internal — no email cross-check, just consistency against SO.' },
    { stage: 'ps', kind: 'done',
      line: "Packing Slip PS-1112 ready. CHAMP-2104 is clean — 3 errors caught and resolved upstream.",
      detail: 'Order delivery on track for May 14 at $42.80 × 500. Ready to ship.' },
  ],
};

const QTY_ONLY = {
  id: 'qty_only',
  label: 'Quantity mismatch only',
  errors: {
    e1: { stage: 'quote', sev: 'HIGH', field: 'quantity', email: '500 units', record: '50 units',
           note: 'Email from buyer says 500 — quote shows 50.' },
  },
  scenes: [
    { stage: 'smtp', kind: 'reading',
      line: "Reading 14 emails on quotes@champion. 12 work, 2 personal.",
      detail: '100% classifier accuracy, 0.7% manual review on 2-year baseline.' },
    { stage: 'smtp', kind: 'thinking',
      line: "Threading: order CHAMP-2104, Champion Industrial Supply, 6-message conversation.",
      detail: 'Extractor recovered all 14 fields with confidence ≥ 0.91.' },
    { stage: 'quote', kind: 'reading',
      line: "Comparing Quote Q-4471 against the thread.",
      detail: '14-field schema check via MCP-fetched NetSuite record.' },
    { stage: 'quote', kind: 'finding',
      line: "Quantity discrepancy — email says 500, quote has 50. HIGH severity.",
      op: { add: ['e1'] },
      detail: 'Buyer literal quote: "...please quote 500 units of 8821-A by Friday."' },
    { stage: 'quote', kind: 'fixing',
      line: "Notified M. Alvarez. They corrected Q-4471 to 500. Re-validated.",
      op: { resolve: ['e1'] },
      detail: 'Notification → fix observed in 6 minutes.' },
    { stage: 'po', kind: 'reading',
      line: "PO-8821 generated from corrected quote. Re-checking new emails — none material.",
      detail: 'No change events between quote correction and PO issuance.' },
    { stage: 'so', kind: 'reading',
      line: "Sales Order SO-2104 looks consistent across all 14 fields.",
      detail: 'Confidence 94%.' },
    { stage: 'wo', kind: 'thinking',
      line: "WO-1947 inherits cleanly from SO-2104.",
      detail: 'No further email events.' },
    { stage: 'ps', kind: 'done',
      line: "PS-1112 ready. Order CHAMP-2104 clean. 1 error caught, 0 reached the floor.",
      detail: 'Outcome: 100% caught upstream of work order.' },
  ],
};

const DATE_DRIFT = {
  id: 'date_drift',
  label: 'Delivery date drift mid-stream',
  errors: {
    e1: { stage: 'po', sev: 'CRITICAL', field: 'delivery_date', email: 'May 14', record: 'May 28',
           note: 'Buyer pushed delivery to May 14 after PO was issued. PO not updated.' },
    e2: { stage: 'so', sev: 'HIGH', field: 'ship_date', email: 'May 14', record: 'May 28',
           note: 'SO inherited stale ship date from PO.' },
  },
  scenes: [
    { stage: 'smtp', kind: 'reading',
      line: "Sweeping the inbox. Two threads tied to CHAMP-2104.",
      detail: 'Both threads on same Message-ID chain.' },
    { stage: 'quote', kind: 'reading',
      line: "Quote Q-4471 looks good. All 14 fields match the early thread.",
      detail: 'No issues at quote stage.' },
    { stage: 'po', kind: 'reading',
      line: "PO-8821 issued. Re-checking the email thread for any change events.",
      detail: 'A late reply changed delivery — checking.' },
    { stage: 'po', kind: 'finding',
      line: "Buyer reply Tuesday 9:14am moved delivery to May 14. PO still says May 28.",
      op: { add: ['e1'] },
      detail: 'Critical — 14-day swing. Production schedule depends on it.' },
    { stage: 'so', kind: 'reading',
      line: "SO-2104 inherited the stale ship date. Same root cause.",
      op: { add: ['e2'] },
      detail: 'Linked finding — fix the PO and SO both clear.' },
    { stage: 'so', kind: 'fixing',
      line: "Notified M. Alvarez. PO and SO both updated to May 14.",
      op: { resolve: ['e1', 'e2'] },
      detail: 'One root cause, two records corrected.' },
    { stage: 'wo', kind: 'thinking',
      line: "Work Order WO-1947 picked up the corrected schedule.",
      detail: 'Floor schedule re-flowed automatically.' },
    { stage: 'ps', kind: 'done',
      line: "PS-1112 ready. Delivery May 14 confirmed. 0 errors reached the floor.",
      detail: 'Caught at PO stage, propagation prevented.' },
  ],
};

window.SCENARIOS = {
  qty_date_price: QTY_DATE_PRICE,
  qty_only: QTY_ONLY,
  date_drift: DATE_DRIFT,
};

window.SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
window.SEVERITY_COLOR = {
  CRITICAL: '#b42318',
  HIGH:     '#dc6803',
  MEDIUM:   '#b54708',
  LOW:      '#175cd3',
};
