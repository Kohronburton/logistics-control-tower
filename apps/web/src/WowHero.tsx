import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Github, Play, Radio, RefreshCw, ShieldCheck, Truck, Zap } from 'lucide-react';

type Phase = 'baseline' | 'incident' | 'reoptimizing' | 'recovered';
type StoryKey = 'vehicle-offline' | 'priority-surge' | 'delivery-exception';
type Analytics = { baselineMiles: number; optimizedMiles: number; milesSaved: number; savingsPct: number; avgUtilizationPct: number; slaRiskCount: number };

type Story = { alert: string; detail: string; recovered: string; stops: string };

const stories: Record<StoryKey, Story> = {
  'vehicle-offline': {
    alert: 'VAN-07 BREAKDOWN',
    detail: '4 deliveries at risk · outbound capacity lost',
    recovered: '4 stops rebalanced · no stops dropped',
    stops: '4'
  },
  'priority-surge': {
    alert: 'URGENT MEDICAL STOP',
    detail: '66-minute promise window injected into the network',
    recovered: 'priority stop absorbed · routes resequenced',
    stops: '1'
  },
  'delivery-exception': {
    alert: 'DELIVERY EXCEPTION',
    detail: 'problem stop removed from normal dispatch flow',
    recovered: 'exception isolated · remaining route protected',
    stops: '1'
  }
};

const fallback: Analytics = {
  baselineMiles: 164.1,
  optimizedMiles: 66.7,
  milesSaved: 97.4,
  savingsPct: 59,
  avgUtilizationPct: 67,
  slaRiskCount: 3
};

const paths = [
  'M 12 53 C 28 42, 43 18, 82 18',
  'M 12 53 C 29 50, 45 62, 82 56',
  'M 12 53 C 26 68, 45 82, 75 86'
];

const stops = [
  { x: 25, y: 38, label: 'HIALEAH' },
  { x: 49, y: 33, label: 'WYNWOOD' },
  { x: 69, y: 46, label: 'BRICKELL' },
  { x: 82, y: 30, label: 'MIAMI BEACH' },
  { x: 82, y: 18, label: 'AVENTURA' },
  { x: 55, y: 72, label: 'CORAL GABLES' },
  { x: 75, y: 86, label: 'KENDALL' }
];

function WowHero() {
  const [phase, setPhase] = useState<Phase>('baseline');
  const [storyKey, setStoryKey] = useState<StoryKey>('vehicle-offline');
  const [analytics, setAnalytics] = useState<Analytics>(fallback);
  const [runId, setRunId] = useState(0);
  const [live, setLive] = useState(false);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const pullState = async () => {
    const response = await fetch('/api/state');
    if (!response.ok) return;
    const state = await response.json();
    if (state?.analytics) setAnalytics(state.analytics);
    setLive(true);
  };

  const runStory = async (key: StoryKey = 'vehicle-offline') => {
    clearTimers();
    setRunId((value) => value + 1);
    setStoryKey(key);
    setPhase('baseline');

    try {
      const reset = await fetch('/api/scenarios/reset', { method: 'POST' });
      if (reset.ok) {
        const data = await reset.json();
        if (data.analytics) setAnalytics(data.analytics);
        setLive(true);
      }
    } catch {
      setLive(false);
    }

    timers.current.push(window.setTimeout(() => setPhase('incident'), 2500));
    timers.current.push(window.setTimeout(async () => {
      setPhase('reoptimizing');
      try {
        const response = await fetch(`/api/scenarios/${key}`, { method: 'POST' });
        if (response.ok) {
          const data = await response.json();
          if (data.analytics) setAnalytics(data.analytics);
          setLive(true);
        }
      } catch {
        setLive(false);
      }
    }, 4500));
    timers.current.push(window.setTimeout(() => setPhase('recovered'), 7600));
  };

  const breakNetwork = () => {
    const choices: StoryKey[] = ['vehicle-offline', 'priority-surge', 'delivery-exception'];
    runStory(choices[Math.floor(Math.random() * choices.length)]).catch(() => undefined);
  };

  useEffect(() => {
    pullState().catch(() => undefined);
    const auto = window.setTimeout(() => runStory('vehicle-offline').catch(() => undefined), 650);
    return () => {
      window.clearTimeout(auto);
      clearTimers();
    };
  }, []);

  const story = stories[storyKey];
  const title = phase === 'baseline'
    ? 'NETWORK HEALTHY'
    : phase === 'incident'
      ? story.alert
      : phase === 'reoptimizing'
        ? 'NETWORK REOPTIMIZING…'
        : 'NETWORK RECOVERED';

  const detail = phase === 'baseline'
    ? '3 vehicles moving · 9 outbound stops · all routes active'
    : phase === 'incident'
      ? story.detail
      : phase === 'reoptimizing'
        ? 'Reassigning capacity · recalculating routes · streaming recovery events'
        : story.recovered;

  const visiblePaths = phase === 'incident' && storyKey === 'vehicle-offline' ? paths.slice(1) : paths;

  return (
    <section className="wow-stage" id="wow" key={runId}>
      <div className="wow-stage-inner">
        <div className="wow-intro">
          <div>
            <div className="wow-live"><Radio size={13}/><i className={live ? 'online' : ''}></i>{live ? 'LIVE API + EVENT SYSTEM' : 'DEMO MODE'}</div>
            <h1>Watch the network break.<br/><span>Watch it recover.</span></h1>
            <p>Not a dashboard screenshot. A live logistics network that fails, rebalances capacity, redraws routes, and recovers in front of you.</p>
          </div>
          <div className="wow-buttons">
            <button className="wow-break" onClick={breakNetwork}><AlertTriangle size={18}/>BREAK THE NETWORK</button>
            <button className="wow-replay" onClick={() => runStory('vehicle-offline')}><Play size={15}/>Replay 15-sec demo</button>
          </div>
        </div>

        <div className={`wow-simulator wow-${phase}`}>
          <div className="wow-map">
            <div className="wow-map-grid"></div>
            <div className="wow-water"></div>
            <div className="wow-road road-a"></div>
            <div className="wow-road road-b"></div>
            <div className="wow-road road-c"></div>

            <svg className="wow-routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {visiblePaths.map((path, index) => (
                <g key={`${path}-${phase}`}>
                  <path d={path} className={`wow-route-line route-line-${index}`}/>
                  <g className="wow-moving-truck">
                    <circle r="2.35" className={`wow-truck-dot truck-${index}`}/>
                    <text textAnchor="middle" y="1.15" fontSize="3.3">🚚</text>
                    <animateMotion dur={`${5.1 + index * 0.8}s`} repeatCount="indefinite" path={path}/>
                  </g>
                </g>
              ))}
            </svg>

            <div className="wow-hub"><strong>XD</strong><span>DORAL CROSS-DOCK</span></div>
            {stops.map((stop, index) => <div key={stop.label} className={`wow-stop stop-${index}`} style={{ left: `${stop.x}%`, top: `${stop.y}%` }}><i></i><span>{stop.label}</span></div>)}

            {(phase === 'incident' || phase === 'reoptimizing') && storyKey === 'vehicle-offline' && (
              <div className="wow-broken-van"><span>🚚</span><strong>VAN-07</strong><small>OFFLINE</small></div>
            )}

            {phase === 'reoptimizing' && <div className="wow-scan"><span>REASSIGNING CAPACITY</span></div>}

            <div className={`wow-phase-card phase-card-${phase}`}>
              <div className="wow-phase-icon">
                {phase === 'baseline' && <CheckCircle2 size={24}/>} 
                {phase === 'incident' && <AlertTriangle size={24}/>} 
                {phase === 'reoptimizing' && <RefreshCw size={24}/>} 
                {phase === 'recovered' && <ShieldCheck size={24}/>} 
              </div>
              <div><strong>{title}</strong><span>{detail}</span></div>
            </div>
          </div>

          <aside className="wow-scoreboard">
            <div className="wow-score-head"><span>15-SECOND RECOVERY RUN</span><strong>{phase === 'recovered' ? 'RECOVERED' : phase.toUpperCase()}</strong></div>

            <div className="wow-timeline">
              {(['baseline','incident','reoptimizing','recovered'] as Phase[]).map((step, index) => {
                const order: Phase[] = ['baseline','incident','reoptimizing','recovered'];
                const active = order.indexOf(phase) >= index;
                return <div key={step} className={`wow-step ${active ? 'done' : ''}`}><i></i><b>{index + 1}</b><span>{step === 'baseline' ? 'Dispatch' : step === 'incident' ? 'Failure' : step === 'reoptimizing' ? 'Re-route' : 'Recover'}</span></div>;
              })}
            </div>

            <div className="wow-before">
              <span>WITHOUT OPTIMIZATION</span>
              <strong>{analytics.baselineMiles || 164.1} mi</strong>
              <small>{Math.max(analytics.slaRiskCount, 3)} promise windows at risk</small>
            </div>

            <div className="wow-response"><Zap size={13}/>CONTROL TOWER RESPONSE</div>

            <div className={`wow-after ${phase === 'recovered' ? 'show' : ''}`}>
              <span>OPTIMIZED DEMO RESULT</span>
              <strong>{analytics.optimizedMiles || 66.7} mi</strong>
              <small>{analytics.savingsPct || 59}% less travel</small>
            </div>

            <div className="wow-results">
              <div><strong>{phase === 'recovered' ? story.stops : '—'}</strong><span>stops recovered</span></div>
              <div><strong>{phase === 'recovered' ? '0' : '—'}</strong><span>stops dropped</span></div>
              <div><strong>{phase === 'recovered' ? `${analytics.avgUtilizationPct || 67}%` : '—'}</strong><span>fleet utilization</span></div>
              <div><strong>{phase === 'recovered' ? '1.4s' : '—'}</strong><span>simulated recovery</span></div>
            </div>
          </aside>
        </div>

        <div className="wow-signature">
          <div><span>BUILT BY</span><strong>Kohron Burton</strong><small>React · TypeScript · Node · Python · Real-Time Events · Distributed Systems</small></div>
          <div><a href="#control-tower-deep-dive">Explore engineering</a><a href="https://github.com/Kohronburton/logistics-control-tower" target="_blank" rel="noreferrer"><Github size={15}/>View GitHub</a></div>
        </div>

        <div className="wow-scroll"><span>SCROLL FOR THE ENGINEERING DEEP DIVE</span><b>↓</b></div>
      </div>
    </section>
  );
}

export default WowHero;
