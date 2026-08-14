import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, Boxes, CheckCircle2, ChevronRight, CircleDollarSign,
  Clock3, Code2, Github, MapPinned, PackageCheck, Radio, Route, ShieldCheck,
  Sparkles, Truck, UsersRound, Zap
} from 'lucide-react';

type Phase = 'incident' | 'evaluating' | 'recommended' | 'applied';
type PlanId = 'preserve' | 'sla' | 'balanced';

type Plan = {
  id: PlanId;
  title: string;
  subtitle: string;
  onTime: number;
  threatened: number;
  utilization: number;
  acceptance: number;
  costIndex: number;
  marginIndex: number;
  risk: 'High' | 'Low';
  score: number;
  actions: string[];
};

const plans: Plan[] = [
  {
    id: 'preserve',
    title: 'Preserve Existing Routes',
    subtitle: 'Minimize immediate disruption',
    onTime: 76,
    threatened: 19,
    utilization: 61,
    acceptance: 86,
    costIndex: 1.0,
    marginIndex: 1.0,
    risk: 'High',
    score: 63,
    actions: ['Keep all current batches', 'No driver-window changes', 'Accept elevated SLA exposure']
  },
  {
    id: 'sla',
    title: 'Prioritize SLA Only',
    subtitle: 'Protect every possible deadline',
    onTime: 98,
    threatened: 2,
    utilization: 58,
    acceptance: 72,
    costIndex: 1.27,
    marginIndex: 0.84,
    risk: 'Low',
    score: 82,
    actions: ['Split urgent stops aggressively', 'Increase driver offer pressure', 'Trade efficiency for deadline protection']
  },
  {
    id: 'balanced',
    title: 'Balanced Recovery',
    subtitle: 'Protect SLA, capacity, and marketplace health',
    onTime: 94,
    threatened: 4,
    utilization: 83,
    acceptance: 89,
    costIndex: 1.11,
    marginIndex: 1.06,
    risk: 'Low',
    score: 94,
    actions: ['Rebuild 4 route batches', 'Prioritize 2 time-critical deliveries', 'Adjust 3 driver arrival windows', 'Create 1 cargo-capable route']
  }
];

const pipeline = ['Manifested', 'Arrived', 'Scanned', 'Sorted', 'Staged', 'Driver Assigned', 'Loaded'];

const driverPool = [
  { id: 'D-1842', vehicle: 'Sedan', zone: 'Doral', fit: 92 },
  { id: 'D-7751', vehicle: 'Cargo Van', zone: 'Hialeah', fit: 97 },
  { id: 'D-4208', vehicle: 'SUV', zone: 'Kendall', fit: 88 },
  { id: 'D-9932', vehicle: 'Pickup', zone: 'Miami Beach', fit: 84 },
  { id: 'D-5214', vehicle: 'Sedan', zone: 'Brickell', fit: 81 },
  { id: 'D-3077', vehicle: 'Cargo Van', zone: 'North Miami', fit: 95 }
];

function WowHero() {
  const [phase, setPhase] = useState<Phase>('incident');
  const [selected, setSelected] = useState<PlanId | null>(null);
  const [live, setLive] = useState(false);
  const [engine, setEngine] = useState('decision-simulator');

  useEffect(() => {
    fetch('/api/state')
      .then((response) => response.ok ? response.json() : null)
      .then((state) => {
        if (state) {
          setLive(true);
          if (state.engine) setEngine(state.engine);
        }
      })
      .catch(() => setLive(false));
  }, []);

  const activePlan = useMemo(() => plans.find((plan) => plan.id === selected) ?? plans[2], [selected]);

  const recommend = () => {
    setPhase('evaluating');
    setSelected(null);
    window.setTimeout(() => {
      setSelected('balanced');
      setPhase('recommended');
    }, 950);
  };

  const applyRecovery = async () => {
    setPhase('evaluating');
    try {
      const response = await fetch('/api/optimize', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        if (data.engine) setEngine(data.engine);
        setLive(true);
      }
    } catch {
      setLive(false);
    }
    window.setTimeout(() => {
      setSelected('balanced');
      setPhase('applied');
    }, 850);
  };

  const reset = () => {
    setSelected(null);
    setPhase('incident');
  };

  const isAfter = phase === 'recommended' || phase === 'applied';

  return (
    <section className="wow-stage" id="wow">
      <div className="wow-shell">
        <div className="wow-topbar">
          <div className="wow-case-label"><Radio size={13}/><i className={live ? 'online' : ''}></i>INDEPENDENT ROADIE XD CANDIDATE CASE STUDY</div>
          <div className="wow-disclaimer">SIMULATED DATA · PUBLIC-WORKFLOW CONCEPTS · NOT AFFILIATED WITH ROADIE</div>
        </div>

        <div className="wow-hero-copy">
          <div>
            <p className="wow-kicker">CROSS-DOCK DECISION ENGINE</p>
            <h1>A late trailer just threatened <span>19 deliveries.</span></h1>
            <p className="wow-lede">The hard problem is not drawing routes. It is deciding what to protect when facility readiness, driver supply, vehicle capacity, delivery windows, acceptance likelihood, and cost all compete.</p>
          </div>
          <div className="wow-hero-actions">
            <button className="wow-primary" onClick={recommend} disabled={phase === 'evaluating'}><Sparkles size={17}/>{phase === 'evaluating' ? 'Evaluating tradeoffs…' : 'Recommend Best Plan'}</button>
            {isAfter && <button className="wow-apply" onClick={applyRecovery}><Zap size={16}/>Apply Balanced Recovery</button>}
            <button className="wow-secondary" onClick={reset}>Reset Incident</button>
          </div>
        </div>

        <div className="wow-incident-grid">
          <div className="wow-incident-card critical"><div className="icon"><AlertTriangle size={20}/></div><div><span>TRAILER ARRIVAL</span><strong>31 min late</strong><small>Miami cross-dock · simulated incident</small></div></div>
          <div className="wow-incident-card"><div className="icon"><Boxes size={20}/></div><div><span>PACKAGES WAITING</span><strong>186</strong><small>manifest + staging workload</small></div></div>
          <div className="wow-incident-card"><div className="icon"><Route size={20}/></div><div><span>PLANNED BATCHES</span><strong>24</strong><small>4 with capacity mismatches</small></div></div>
          <div className="wow-incident-card"><div className="icon"><UsersRound size={20}/></div><div><span>AVAILABLE DRIVERS</span><strong>37</strong><small>crowdsourced supply pool</small></div></div>
          <div className="wow-incident-card danger"><div className="icon"><Clock3 size={20}/></div><div><span>AT-RISK DELIVERIES</span><strong>{phase === 'applied' ? '4' : '19'}</strong><small>{phase === 'applied' ? 'after recovery' : 'before intervention'}</small></div></div>
          <div className="wow-incident-card"><div className="icon"><PackageCheck size={20}/></div><div><span>PROJECTED ON-TIME</span><strong>{phase === 'applied' ? '94%' : '76%'}</strong><small>{phase === 'applied' ? '+18 pts after recovery' : 'current projection'}</small></div></div>
        </div>

        <div className="wow-workspace">
          <section className="wow-ops-panel">
            <div className="wow-panel-head">
              <div><p>ROADIE XD WORKFLOW MODEL</p><h2>Cross-dock readiness → marketplace dispatch</h2></div>
              <span className={`wow-status ${phase}`}>{phase === 'incident' ? 'INCIDENT ACTIVE' : phase === 'evaluating' ? 'SCORING PLANS' : phase === 'recommended' ? 'PLAN RECOMMENDED' : 'RECOVERY APPLIED'}</span>
            </div>

            <div className="wow-pipeline">
              {pipeline.map((step, index) => <div key={step} className={`wow-pipeline-step ${index <= (phase === 'incident' ? 4 : 6) ? 'done' : ''}`}><i>{index + 1}</i><span>{step}</span>{index < pipeline.length - 1 && <ChevronRight size={14}/>}</div>)}
            </div>

            <div className="wow-market-grid">
              <div className="wow-market-map">
                <div className="wow-map-title"><div><MapPinned size={17}/><strong>Driver Supply + Route Demand</strong></div><span>37 available</span></div>
                <div className="wow-map-field">
                  <div className="wow-hub"><strong>XD</strong><span>Doral Cross-Dock</span></div>
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M18 50 C36 33, 52 20, 84 17"/><path d="M18 50 C38 49, 54 55, 84 48"/><path d="M18 50 C35 68, 55 82, 78 88"/>
                  </svg>
                  <div className="wow-demand demand-1"><i></i><span>North Miami</span><b>6 gigs</b></div>
                  <div className="wow-demand demand-2"><i></i><span>Brickell</span><b>5 gigs</b></div>
                  <div className="wow-demand demand-3"><i></i><span>Kendall</span><b>7 gigs</b></div>
                  {driverPool.map((driver, index) => <div key={driver.id} className={`wow-driver driver-${index}`} title={`${driver.id} · ${driver.vehicle} · ${driver.zone}`}><Truck size={11}/><span>{driver.fit}</span></div>)}
                  {phase === 'evaluating' && <div className="wow-scan-line"></div>}
                  {phase === 'applied' && <div className="wow-recovered-banner"><CheckCircle2 size={18}/><div><strong>NETWORK RECOVERED</strong><span>4 batches rebuilt · 3 arrival windows adjusted</span></div></div>}
                </div>
              </div>

              <div className="wow-driver-pool">
                <div className="wow-map-title"><div><UsersRound size={17}/><strong>Candidate Driver Pool</strong></div><span>sample</span></div>
                <div className="wow-driver-list">
                  {driverPool.slice(0, 4).map((driver) => <div key={driver.id} className="wow-driver-row"><div className="avatar"><Truck size={14}/></div><div><strong>{driver.id}</strong><span>{driver.vehicle} · {driver.zone}</span></div><div className="fit"><b>{driver.fit}%</b><span>fit score</span></div></div>)}
                </div>
                <div className="wow-supply-note"><ShieldCheck size={14}/><span>Eligibility is illustrative: proximity, vehicle fit, route direction, delivery window, and acceptance likelihood.</span></div>
              </div>
            </div>
          </section>

          <aside className="wow-decision-panel">
            <div className="wow-panel-head compact"><div><p>DECISION ENGINE</p><h2>Compare recovery strategies</h2></div><Code2 size={18}/></div>
            <div className="wow-plan-list">
              {plans.map((plan) => <button key={plan.id} className={`wow-plan ${selected === plan.id ? 'selected' : ''}`} onClick={() => { setSelected(plan.id); setPhase('recommended'); }}>
                <div className="wow-plan-title"><div><strong>{plan.title}</strong><span>{plan.subtitle}</span></div><b>{plan.score}</b></div>
                <div className="wow-plan-metrics"><div><span>On-time</span><strong>{plan.onTime}%</strong></div><div><span>Utilization</span><strong>{plan.utilization}%</strong></div><div><span>Acceptance</span><strong>{plan.acceptance}%</strong></div><div><span>Risk</span><strong className={plan.risk === 'High' ? 'bad' : 'good'}>{plan.risk}</strong></div></div>
                <div className="wow-plan-index"><span>Driver-cost index <b>{plan.costIndex.toFixed(2)}×</b></span><span>Contribution index <b>{plan.marginIndex.toFixed(2)}×</b></span></div>
              </button>)}
            </div>

            {isAfter && <div className="wow-explanation">
              <div className="wow-rec-head"><Sparkles size={18}/><div><span>RECOMMENDED</span><strong>{activePlan.title}</strong></div><b>{activePlan.score}/100</b></div>
              <p>Balanced recovery wins because it removes most SLA exposure without buying the final few percentage points of on-time performance at disproportionate marketplace cost and lower vehicle utilization.</p>
              <div className="wow-why">
                {activePlan.actions.map((action) => <div key={action}><CheckCircle2 size={13}/><span>{action}</span></div>)}
              </div>
              <div className="wow-explain-rule"><span>WHY THIS DECISION?</span><p>Two time-critical deliveries cannot tolerate the extra dwell time. The remaining stops share delivery corridors, fit available vehicle capacity, and retain stronger projected driver acceptance.</p></div>
            </div>}
          </aside>
        </div>

        <div className="wow-business-proof">
          <div className="wow-proof-copy"><p>BUSINESS IMPACT · ILLUSTRATIVE</p><h2>{phase === 'applied' ? 'Recovery applied. The operation is healthier.' : 'The decision is only useful if the tradeoff is visible.'}</h2><span>These values are simulated scenario outputs—not Roadie production metrics, pricing, margins, or internal algorithms.</span></div>
          <div className="wow-proof-metrics">
            <div><span>Threatened</span><strong>{phase === 'applied' ? '4' : '19'}</strong><small>deliveries</small></div>
            <ArrowRight size={18}/>
            <div className={phase === 'applied' ? 'positive' : ''}><span>Projected on-time</span><strong>{phase === 'applied' ? '94%' : '76%'}</strong><small>{phase === 'applied' ? '+18 points' : 'before recovery'}</small></div>
            <div><span>Vehicle utilization</span><strong>{phase === 'applied' ? '83%' : '61%'}</strong><small>illustrative</small></div>
            <div><span>Driver acceptance</span><strong>{phase === 'applied' ? '89%' : '86%'}</strong><small>model assumption</small></div>
          </div>
        </div>

        <div className="wow-footer-card">
          <div><span>BUILT BY</span><strong>Kohron Burton</strong><small>React · TypeScript · APIs · Distributed Systems · Python · Go learning track</small></div>
          <div className="wow-links"><a href="#control-tower-deep-dive"><Code2 size={15}/>Show Me the Engineering</a><a href="https://github.com/Kohronburton/logistics-control-tower" target="_blank" rel="noreferrer"><Github size={15}/>View GitHub</a></div>
          <div className="wow-engine"><CircleDollarSign size={14}/><span>Decision model: SLA + capacity + acceptance + cost + exception risk</span><b>{engine.replaceAll('-', ' ')}</b></div>
        </div>
      </div>
    </section>
  );
}

export default WowHero;
