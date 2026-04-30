// agent.jsx — Speech bubble narrator (no transcript anymore).

function AgentAvatar({ thinking }) {
  return (
    <div className={`dz-avatar ${thinking ? 'thinking' : ''}`}>
      <svg viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="15" fill="#0f172a"/>
        <circle cx="16" cy="16" r="15" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
        <path d="M11 14.5c0-.6.4-1 1-1h.5c.6 0 1 .4 1 1v1c0 .6-.4 1-1 1H12c-.6 0-1-.4-1-1v-1z" fill="#a6f4c5"/>
        <path d="M18.5 14.5c0-.6.4-1 1-1h.5c.6 0 1 .4 1 1v1c0 .6-.4 1-1 1h-.5c-.6 0-1-.4-1-1v-1z" fill="#a6f4c5"/>
        <path d="M12 20c1.2 1 2.5 1.5 4 1.5s2.8-.5 4-1.5" stroke="#a6f4c5" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
      </svg>
      <div className="dz-avatar-pulse" />
    </div>
  );
}

function SpeechBubble({ scene, scenarioStep, totalSteps }) {
  if (!scene) return null;
  const labelByKind = { reading: 'Reading', thinking: 'Reasoning', finding: 'Finding', fixing: 'Resolving', done: 'Complete' };
  return (
    <div className="dz-speech">
      <AgentAvatar thinking={scene.kind === 'thinking' || scene.kind === 'reading'} />
      <div className="dz-speech-bubble">
        <div className="dz-speech-meta">
          <span className={`dz-kind dz-kind-${scene.kind}`}>{labelByKind[scene.kind]}</span>
          {scene.headline && <span className="dz-speech-head">{scene.headline}</span>}
          <span className="dz-speech-step">Step {scenarioStep + 1} / {totalSteps}</span>
        </div>
        <div className="dz-speech-text">{scene.line}</div>
        {scene.detail && <div className="dz-speech-detail">{scene.detail}</div>}
      </div>
    </div>
  );
}

Object.assign(window, { AgentAvatar, SpeechBubble });
