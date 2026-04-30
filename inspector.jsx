// inspector.jsx — Drill-in for a clicked stage.
function StageInspector({ stage, errors, order, onClose }) {
  if (!stage) return null;
  const open = errors.filter(e => !e.resolved);
  const closed = errors.filter(e => e.resolved);
  const recordLabels = { smtp: 'thread', quote: order.quote_no, po: order.po_no, so: order.so_no, wo: order.wo_no, ps: order.ps_no };
  return (
    <div className="dz-inspect" onClick={(e) => e.stopPropagation()}>
      <div className="dz-inspect-hd">
        <div>
          <div className="dz-inspect-eyebrow">{stage.sub}</div>
          <div className="dz-inspect-title">{stage.label}</div>
        </div>
        <button className="dz-inspect-x" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="dz-inspect-body">
        <div className="dz-kv">
          <div className="dz-kv-row"><span>Order</span><b>{order.id}</b></div>
          <div className="dz-kv-row"><span>Customer</span><b>{order.customer}</b></div>
          <div className="dz-kv-row"><span>Sales rep</span><b>{order.rep}</b></div>
          <div className="dz-kv-row"><span>Record</span><b>{recordLabels[stage.id]}</b></div>
        </div>
        {open.length > 0 && (<><div className="dz-inspect-sec">Open discrepancies</div>{open.map(e => <ErrorCard key={e.id} err={e} />)}</>)}
        {closed.length > 0 && (<><div className="dz-inspect-sec">Resolved</div>{closed.map(e => <ErrorCard key={e.id} err={e} resolved />)}</>)}
        {open.length === 0 && closed.length === 0 && (
          <div className="dz-inspect-empty">No discrepancies at this stage. All checked fields match across the email thread and the NetSuite record.</div>
        )}
      </div>
    </div>
  );
}
function ErrorCard({ err, resolved }) {
  const color = window.SEVERITY_COLOR[err.sev];
  return (
    <div className={`dz-err-card ${resolved ? 'resolved' : ''}`}>
      <div className="dz-err-card-hd">
        <span className="dz-err-sev" style={{ background: color }}>{err.sev}</span>
        <span className="dz-err-field">{err.field.replace(/_/g, ' ')}</span>
        {resolved && <span className="dz-err-tag">resolved</span>}
      </div>
      <div className="dz-err-grid">
        <div><div className="dz-err-side">From email</div><div className="dz-err-val email">{err.email}</div></div>
        <div className="dz-err-arrow">→</div>
        <div><div className="dz-err-side">In record</div><div className="dz-err-val record">{err.record}</div></div>
      </div>
      <div className="dz-err-note">{err.note}</div>
    </div>
  );
}
Object.assign(window, { StageInspector, ErrorCard });
