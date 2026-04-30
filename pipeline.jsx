// pipeline.jsx — Pipeline diagram with circular progress rings on each icon.

const STAGE_ICONS = {
  smtp:  (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>),
  quote: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h7M9 15h7M9 18h4"/></svg>),
  po:    (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 7h16l-1 12H5L4 7z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>),
  so:    (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 7h13l4 4v6H3z"/><circle cx="8" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>),
  wo:    (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>),
  ps:    (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 8l8-4 8 4-8 4-8-4z"/><path d="M4 8v8l8 4 8-4V8"/><path d="M12 12v8"/></svg>),
};

function StageNode({ stage, state, errorCount, progress, onClick }) {
  const isActive = state === 'active' || state === 'fixing';
  const isDone = state === 'done';
  // SVG ring: r=42, circumference = 2πr ≈ 263.89
  const R = 42; const C = 2 * Math.PI * R;
  const offset = C * (1 - progress);
  return (
    <div className="dz-node-wrap" onClick={onClick}>
      <div className="dz-node-ring-wrap">
        <svg className="dz-node-ring" viewBox="0 0 88 88">
          <circle className="track" cx="44" cy="44" r={R} />
          <circle className="fill"  cx="44" cy="44" r={R}
            strokeDasharray={C} strokeDashoffset={offset} />
        </svg>
        <div className={`dz-node ${state} ${stage.internal ? 'internal' : ''}`}>
          <div className="dz-node-icon">{STAGE_ICONS[stage.id]}</div>
          {isActive && <div className="dz-node-pulse" />}
          {errorCount > 0 && <div className="dz-err-badge">{errorCount}</div>}
          {isDone && errorCount === 0 && (
            <div className="dz-ok-badge">
              <svg viewBox="0 0 14 14"><path d="M3 7.4l2.6 2.6L11 4.5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          )}
        </div>
      </div>
      <div className="dz-node-meta">
        <div className="dz-node-label">{stage.label}</div>
        <div className="dz-node-sub">{stage.sub}</div>
      </div>
    </div>
  );
}

function NodeBubble({ text, kind }) {
  return (
    <div className={`dz-node-bubble dz-node-bubble-${kind}`}>
      <span className="dz-node-bubble-dot" />
      <span>{text}</span>
      <div className="dz-node-bubble-tail" />
    </div>
  );
}

function Connector({ active, done }) {
  return (
    <div className={`dz-connector ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
      <div className="dz-connector-line" />
      <div className="dz-connector-dot" />
    </div>
  );
}

function Pipeline({ stages, stageState, errorsByStage, onStageClick, activeStageId, activeKind, activeBubble, stageProgress }) {
  return (
    <div className="dz-pipeline">
      <div className="dz-pipeline-track">
        {stages.map((s, i) => {
          const state = stageState[s.id] || 'pending';
          const errs = errorsByStage[s.id] || [];
          const isSpeaking = s.id === activeStageId;
          const blurb = isSpeaking ? activeBubble : '';
          return (
            <React.Fragment key={s.id}>
              <div className="dz-node-col">
                {isSpeaking && blurb && <NodeBubble text={blurb} kind={activeKind} />}
                <StageNode
                  stage={s} state={state} errorCount={errs.length}
                  progress={stageProgress[s.id] ?? 0}
                  onClick={() => onStageClick(s.id)} />
              </div>
              {i < stages.length - 1 && (
                <Connector
                  active={state === 'active' || state === 'fixing'}
                  done={state === 'done'} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { Pipeline, StageNode, Connector, NodeBubble });
