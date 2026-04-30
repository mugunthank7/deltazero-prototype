// app.jsx — Shell with floating bottom-right control panel and dark mode.

const { useState, useEffect, useMemo, useCallback } = React;

function useScenario(scenarioId, stagesMode, autoplay, speed) {
  const scenario = window.SCENARIOS[scenarioId];
  const stages = stagesMode === 'four' ? window.STAGES_FOUR : window.STAGES_FULL;
  const stageIds = stages.map(s => s.id);
  const scenes = useMemo(() => scenario.scenes.filter(sc => stageIds.includes(sc.stage)), [scenario, stagesMode]);

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const [resolvedIds, setResolvedIds] = useState(new Set());
  const [activeErrorIds, setActiveErrorIds] = useState(new Set());

  useEffect(() => { setIdx(0); setResolvedIds(new Set()); setActiveErrorIds(new Set()); setPlaying(autoplay); }, [scenarioId, stagesMode, autoplay]);

  useEffect(() => {
    const a = new Set(); const r = new Set();
    for (let i = 0; i <= idx; i++) {
      const op = scenes[i]?.op; if (!op) continue;
      (op.add || []).forEach(e => a.add(e));
      (op.resolve || []).forEach(e => r.add(e));
    }
    setActiveErrorIds(a); setResolvedIds(r);
  }, [idx, scenes]);

  useEffect(() => {
    if (!playing) return;
    const sc = scenes[idx]; if (!sc) return;
    const dwell = { reading: 3000, thinking: 2800, finding: 4000, fixing: 3600, done: 4400 }[sc.kind] || 3000;
    const t = setTimeout(() => {
      setIdx(i => Math.min(i + 1, scenes.length - 1));
      if (idx >= scenes.length - 1) setPlaying(false);
    }, dwell / speed);
    return () => clearTimeout(t);
  }, [idx, playing, scenes, speed]);

  return { scenario, scenes, stages, idx, setIdx, playing, setPlaying, activeErrorIds, resolvedIds };
}

function App() {
  const [scenarioId, setScenarioId] = useState('hero_elbow');
  const [stagesMode, setStagesMode] = useState('six');
  const [autoplay, setAutoplay] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  const [theme, setTheme] = useState('light');

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  const { scenario, scenes, stages, idx, setIdx, playing, setPlaying, activeErrorIds, resolvedIds } =
    useScenario(scenarioId, stagesMode, autoplay, speed);

  const [inspectingId, setInspectingId] = useState(null);
  const currentScene = scenes[idx];
  const activeStageIdx = currentScene ? stages.findIndex(s => s.id === currentScene.stage) : -1;

  const stageState = {};
  stages.forEach((s, i) => {
    if (i < activeStageIdx) stageState[s.id] = 'done';
    else if (i === activeStageIdx) stageState[s.id] = currentScene?.kind === 'fixing' ? 'fixing' : 'active';
    else stageState[s.id] = 'pending';
  });
  if (idx === scenes.length - 1) stages.forEach(s => { stageState[s.id] = 'done'; });

  // Per-stage progress 0..1 for the green ring.
  const stageProgress = {};
  stages.forEach((s, i) => {
    if (i < activeStageIdx) stageProgress[s.id] = 1;
    else if (i > activeStageIdx) stageProgress[s.id] = 0;
    else {
      // count scenes for this stage; how many we've passed.
      const stageScenes = scenes.filter(sc => sc.stage === s.id);
      const passedHere = scenes.slice(0, idx + 1).filter(sc => sc.stage === s.id).length;
      stageProgress[s.id] = stageScenes.length ? passedHere / stageScenes.length : 0;
    }
  });
  if (idx === scenes.length - 1) stages.forEach(s => { stageProgress[s.id] = 1; });

  const errorsByStage = useMemo(() => {
    const out = {}; stages.forEach(s => { out[s.id] = []; });
    Object.entries(scenario.errors).forEach(([id, err]) => {
      if (activeErrorIds.has(id) && !resolvedIds.has(id) && out[err.stage]) out[err.stage].push({ id, ...err });
    });
    return out;
  }, [scenario, activeErrorIds, resolvedIds, stages]);

  const allErrorsForStage = useCallback((sid) => {
    const out = [];
    Object.entries(scenario.errors).forEach(([id, err]) => {
      if (err.stage !== sid) return;
      if (activeErrorIds.has(id) || resolvedIds.has(id)) out.push({ id, ...err, resolved: resolvedIds.has(id) });
    });
    return out;
  }, [scenario, activeErrorIds, resolvedIds]);

  const errorsAll = Object.entries(scenario.errors).filter(([id]) => activeErrorIds.has(id)).map(([id, err]) => ({ id, ...err }));
  const errorsByStageCount = {};
  stages.forEach(s => { errorsByStageCount[s.id] = 0; });
  errorsAll.forEach(e => { if (errorsByStageCount[e.stage] !== undefined) errorsByStageCount[e.stage] += 1; });

  const inspectingStage = stages.find(s => s.id === inspectingId);
  const inspectingErrors = inspectingId ? allErrorsForStage(inspectingId) : [];

  return (
    <div className="dz-root">
      <Header order={window.ORDER} metrics={window.METRICS}
        playing={playing} onPlayPause={() => setPlaying(p => !p)}
        onRestart={() => { setIdx(0); setPlaying(true); }}
        progress={(idx + 1) / scenes.length}
        scenarioLabel={scenario.label}
        theme={theme} onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')} />

      <div className="dz-stage-area" onClick={() => setInspectingId(null)}>
        <div className="dz-center-col">
          <SpeechBubble scene={currentScene} scenarioStep={idx} totalSteps={scenes.length} />
          <Pipeline
            stages={stages}
            stageState={stageState}
            errorsByStage={errorsByStage}
            stageProgress={stageProgress}
            onStageClick={(id) => { event?.stopPropagation?.(); setInspectingId(id === inspectingId ? null : id); }}
            activeStageId={currentScene?.stage}
            activeKind={currentScene?.kind}
            activeBubble={currentScene?.bubble}
          />
          <CaughtHere stages={stages} errorsByStageCount={errorsByStageCount} resolvedIds={resolvedIds} totalErrors={Object.keys(scenario.errors).length} />
        </div>

        {inspectingStage && (
          <StageInspector stage={inspectingStage} errors={inspectingErrors} order={window.ORDER} onClose={() => setInspectingId(null)} />
        )}
      </div>

      <BelowFold metrics={window.METRICS} stageAccuracy={window.STAGE_ACCURACY} errorTypes={window.ERROR_TYPES} prototype={window.PROTOTYPE_INFO} />

      <Floater
        scenario={scenarioId} onScenario={setScenarioId}
        stagesMode={stagesMode} onStagesMode={setStagesMode}
        autoplay={autoplay} onAutoplay={setAutoplay}
        speed={speed} onSpeed={setSpeed}
        playing={playing} onPlayPause={() => setPlaying(p => !p)}
        onRestart={() => { setIdx(0); setPlaying(true); }} />
    </div>
  );
}

function Header({ order, metrics, playing, onPlayPause, onRestart, progress, scenarioLabel, theme, onToggleTheme }) {
  const stats = [
    { lbl: 'Email Classifier Accuracy', val: `${Math.round(metrics.classification_accuracy*100)}%`,
      tip: { t: 'Email Classifier Accuracy',
             d: 'Share of inbound emails the classifier routes correctly into work vs. personal. Two-layer: rule match on Champion product/order codes, with an LLM fallback at 0.85 confidence threshold for ambiguous emails.' } },
    { lbl: 'Detection rate', val: `${(metrics.error_detection_rate*100).toFixed(1)}%`,
      tip: { t: 'Error detection rate (recall)',
             d: 'Of all the discrepancies present in the test set across all severities, what fraction did DeltaZero flag. Higher is better. Computed against the synthetic ground-truth labels from the validation harness.' } },
    { lbl: 'CRITICAL catch', val: `${(metrics.critical_catch_rate*100).toFixed(1)}%`,
      tip: { t: 'CRITICAL catch rate',
             d: 'Detection rate restricted to severity = CRITICAL — the discrepancies that would block shipping (wrong part, wrong qty, wrong address). Target ≥ 90% per gate.' } },
    { lbl: 'False positive', val: `${(metrics.false_positive_rate*100).toFixed(1)}%`,
      tip: { t: 'False positive rate',
             d: 'Of all the records the agent flagged as having a discrepancy, what share were actually clean. Low FP keeps reps from wasting review cycles. Target ≤ 20%.' } },
    { lbl: 'False negative', val: `${(metrics.false_negative_rate*100).toFixed(1)}%`,
      tip: { t: 'False negative rate',
             d: 'Of all the discrepancies present in the test set, what share did the agent fail to catch (= 1 − detection rate). False negatives are the dangerous ones — they reach the floor and ship as wrong orders.' } },
  ];
  return (
    <header className="dz-hd">
      <div className="dz-hd-left">
        <div className="dz-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 20L12 4l8 16H4z"/><path d="M9 14h6"/></svg>
        </div>
        <div>
          <div className="dz-hd-title">DeltaZero</div>
          <div className="dz-hd-sub">Order intake validator · live trace</div>
        </div>
      </div>
      <div className="dz-hd-mid">
        {stats.map((s, i) => (
          <div className="dz-hd-stat" key={s.lbl}>
            <span className="lbl">{s.lbl}<span className="info">i</span></span>
            <b>{s.val}</b>
            <div className={`dz-tip ${i >= 3 ? 'r' : ''}`}><strong>{s.tip.t}</strong>{s.tip.d}</div>
          </div>
        ))}
      </div>
      <div className="dz-hd-right">
        <div className="dz-hd-order">
          <div className="dz-hd-order-eyebrow">In flight · {scenarioLabel}</div>
          <div className="dz-hd-order-id">{order.id}</div>
          <div className="dz-hd-order-cust">{order.customer} · {order.customer_contact}</div>
        </div>
        <button className="dz-theme-toggle" onClick={onToggleTheme} aria-label="Toggle theme">
          {theme === 'light'
            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M16.9 16.9l2.1 2.1M4.9 19.1l2.1-2.1M16.9 7.1l2.1-2.1"/></svg>}
        </button>
        <div className="dz-hd-controls">
          <button className="dz-btn icon" onClick={onRestart} aria-label="Restart">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M2 8a6 6 0 1 0 1.5-4M2 3v3.5h3.5"/></svg>
          </button>
          <button className="dz-btn primary" onClick={onPlayPause}>{playing ? 'Pause' : 'Play'}</button>
        </div>
      </div>
      <div className="dz-hd-progress"><div className="dz-hd-progress-fill" style={{ width: `${progress * 100}%` }} /></div>
    </header>
  );
}

function CaughtHere({ stages, errorsByStageCount, resolvedIds, totalErrors }) {
  const totalOpen = Object.values(errorsByStageCount).reduce((a, b) => a + b, 0);
  return (
    <div className="dz-totals">
      <div className="dz-totals-lead">
        <div className="dz-totals-num">{totalOpen}</div>
        <div className="dz-totals-lbl">Open</div>
      </div>
      <div className="dz-totals-rows">
        <div className="dz-tippable dz-totals-cell" style={{ position: 'relative' }}>
          <div className="dz-totals-cell-lbl">Caught at</div>
          <div className="dz-totals-cell-val">
            {stages.filter(s => errorsByStageCount[s.id] > 0).map(s => s.label).join(' · ') || '—'}
          </div>
          <div className="dz-tip up"><strong>Caught at</strong>Stage(s) where the agent first flagged a discrepancy in this run. The earlier the catch, the cheaper the fix — errors caught at Quote never reach the floor.</div>
        </div>
        {stages.filter(s => errorsByStageCount[s.id] > 0).map(s => (
          <div className="dz-totals-cell" key={s.id}>
            <div className="dz-totals-cell-lbl">{s.label}</div>
            <div className="dz-totals-cell-val">{errorsByStageCount[s.id]} open</div>
          </div>
        ))}
      </div>
      <div className="dz-totals-resolved">{resolvedIds.size} of {totalErrors} resolved</div>
    </div>
  );
}

function BelowFold({ metrics, stageAccuracy, errorTypes, prototype }) {
  return (
    <section className="dz-below">
      <div className="dz-below-hd">
        <div className="dz-eyebrow">Verified performance · 346 threads · 149 emails</div>
        <h2>Where errors get caught — and how accurately.</h2>
      </div>

      <div className="dz-handoff-grid">
        {stageAccuracy.map(s => (
          <div key={s.stage} className="dz-handoff-card dz-tippable">
            <div className="dz-handoff-card-label">{s.label}</div>
            <div className="dz-handoff-card-nums">
              <span className="dz-handoff-card-big">{s.caught}</span>
              <span className="dz-handoff-card-small">/ {s.total} caught</span>
            </div>
            <div className="dz-handoff-card-bar"><div className="dz-handoff-card-fill" style={{ width: `${s.rate*100}%` }} /></div>
            <div className="dz-handoff-card-pct">{(s.rate*100).toFixed(1)}% detection</div>
            <div className="dz-tip"><strong>{s.label}</strong>{s.tip}</div>
          </div>
        ))}
      </div>

      <div className="dz-etypes">
        <div className="dz-etypes-hd">Detection rate by error type</div>
        <div className="dz-etypes-rows">
          {errorTypes.map(e => (
            <div key={e.type} className="dz-etypes-row dz-tippable" style={{ position: 'relative' }}>
              <div className="dz-etypes-sev" style={{ background: window.SEVERITY_COLOR[e.severity] }} title={e.severity}/>
              <div>{e.label}</div>
              <div className="dz-etypes-bar"><div className="dz-etypes-fill" style={{ width: `${e.rate*100}%` }} /></div>
              <div className="dz-etypes-nums">{e.detected}/{e.injected}</div>
              <div className="dz-etypes-pct">{(e.rate*100).toFixed(1)}%</div>
              <div className="dz-tip"><strong>{e.label}</strong>{e.tip}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="dz-gates">
        {[
          { lbl: 'TP rate', val: `${(metrics.error_detection_rate*100).toFixed(1)}%`, target: 'target ≥ 70%',
            tip: 'True positive rate, also called recall. Of all real discrepancies, the share the agent flagged.' },
          { lbl: 'CRITICAL catch', val: `${(metrics.critical_catch_rate*100).toFixed(1)}%`, target: 'target ≥ 90%',
            tip: 'Detection rate restricted to severity = CRITICAL. These are the ship-blocking errors — wrong part, wrong qty, wrong address.' },
          { lbl: 'FP rate', val: `${(metrics.false_positive_rate*100).toFixed(1)}%`, target: 'target ≤ 20%',
            tip: 'False positive rate. Share of records flagged that were actually clean. Low FP keeps reps from drowning in noise.' },
          { lbl: 'Avg. time / email', val: `${metrics.avg_processing_time.toFixed(1)}s`, target: `manual review ${(metrics.manual_review_rate*100).toFixed(1)}%`,
            tip: 'Mean wall-clock to fully validate one email thread end-to-end (classification + extraction + 14-field diff + recommendation).' },
        ].map(g => (
          <div className="dz-gate-card" key={g.lbl}>
            <div className="dz-gate-label">{g.lbl}</div>
            <div className="dz-gate-val">{g.val}</div>
            <div className="dz-gate-target">{g.target}</div>
            <div className="dz-tip"><strong>{g.lbl}</strong>{g.tip}</div>
          </div>
        ))}
      </div>

      <div className="dz-proto">
        <div className="dz-proto-hd">
          <span className="dz-proto-tag">Prototype only</span>
          <span className="dz-proto-title">Training & operating cost</span>
          <span className="dz-proto-note">Reference values from current dev runs — not part of the customer demo.</span>
        </div>
        <div className="dz-proto-grid">
          {prototype.map(p => (
            <div className="dz-proto-cell" key={p.lbl}>
              <div className="dz-proto-cell-lbl">{p.lbl}</div>
              <div className="dz-proto-cell-val">{p.val}</div>
              <div className="dz-proto-cell-sub">{p.sub}</div>
              <div className="dz-tip"><strong>{p.lbl}</strong>{p.tip}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Floater({ scenario, onScenario, stagesMode, onStagesMode, autoplay, onAutoplay, speed, onSpeed, playing, onPlayPause, onRestart }) {
  return (
    <div className="dz-floater">
      <div className="dz-floater-hd">
        <span className="dz-floater-title"><span className="dz-floater-title-dot"/>DeltaZero panel</span>
        <div className="dz-floater-actions">
          <button className="dz-floater-btn" onClick={onRestart} aria-label="Restart">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 8a6 6 0 1 0 1.5-4M2 3v3.5h3.5"/></svg>
          </button>
          <button className="dz-floater-btn primary" onClick={onPlayPause}>{playing ? 'Pause' : 'Play'}</button>
        </div>
      </div>

      <div className="dz-floater-section">
        <div className="dz-floater-section-lbl">Scenario</div>
        <select className="dz-select" value={scenario} onChange={e => onScenario(e.target.value)}>
          {Object.values(window.SCENARIOS).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      <div className="dz-floater-section">
        <div className="dz-floater-section-lbl">Stages</div>
        <div className="dz-segmented">
          <button className={`dz-segmented-btn ${stagesMode === 'four' ? 'active' : ''}`} onClick={() => onStagesMode('four')}>4 customer</button>
          <button className={`dz-segmented-btn ${stagesMode === 'six' ? 'active' : ''}`} onClick={() => onStagesMode('six')}>All 6</button>
        </div>
      </div>

      <div className="dz-floater-section">
        <div className="dz-floater-section-lbl">Playback speed</div>
        <div className="dz-floater-speed">
          <input type="range" min="0.5" max="3" step="0.25" value={speed} onChange={e => onSpeed(parseFloat(e.target.value))} />
          <div className="dz-floater-speed-val">{speed.toFixed(2)}×</div>
        </div>
        <div className="dz-floater-note">Speed affects narration only — for prototype/demo purposes.</div>
      </div>

      <div className="dz-floater-section">
        <div className="dz-floater-row">
          <button className="dz-floater-btn" style={{ width: '100%' }} onClick={() => onAutoplay(!autoplay)}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Autoplay: {autoplay ? 'On' : 'Off'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
