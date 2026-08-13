import { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, Boxes, CheckCircle2, Clock3, Gauge, MapPinned, PackageCheck,
  Radio, RefreshCw, Route, ServerCog, ShieldCheck, Sparkles, Truck, Wifi, Zap
} from 'lucide-react';

type Delivery = {
  id: string; customer: string; address: string; lat: number; lng: number; weightLbs: number; cubicFt: number;
  priority: 1 | 2 | 3; promisedBy: string; status: string;
};

type Load = {
  id: string; vehicleId: string; deliveries: Delivery[]; totalWeightLbs: number; totalCubicFt: number;
  utilizationPct: number; estimatedMiles: number;
};

type Health = {
  api: string; postgres: string; redis: string; queueDepth: number; failedJobs: number; avgProcessingMs: number;
  sseClients?: number; vehiclesOnline?: number; vehiclesTotal?: number;
};

type OpsEvent = { at: string; type: string; entity: string; severity?: 'info' | 'success' | 'warning' | 'critical'; message?: string };
type Scenario = null | { key: string; title: string; detail: string; severity: 'info' | 'success' | 'warning' | 'critical' };
type Analytics = { baselineMiles: number; optimizedMiles: number; milesSaved: number; savingsPct: number; avgUtilizationPct: number; slaRiskCount: number };
type StatePayload = { deliveries: Delivery[]; loads: Load[]; events: OpsEvent[]; health: Health; analytics: Analytics; scenario: Scenario; engine: string };

const fallbackDeliveries: Delivery[] = [
  { id: 'RD-1042', customer: 'Doral Pharmacy', address: 'Doral, FL', lat: 25.8195, lng: -80.3553, weightLbs: 18, cubicFt: 2.2, priority: 1, promisedBy: new Date(Date.now() + 7200000).toISOString(), status: 'SORTED' },
  { id: 'RD-1043', customer: 'Coral Gables Retail', address: 'Coral Gables, FL', lat: 25.7215, lng: -80.2684, weightLbs: 42, cubicFt: 5.7, priority: 2, promisedBy: new Date(Date.now() + 14400000).toISOString(), status: 'SORTED' },
  { id: 'RD-1044', customer: 'Brickell Market', address: 'Brickell, Miami, FL', lat: 25.7617, lng: -80.1918, weightLbs: 12, cubicFt: 1.5, priority: 1, promisedBy: new Date(Date.now() + 10800000).toISOString(), status: 'SORTED' },
  { id: 'RD-1045', customer: 'Miami Beach Home', address: 'Miami Beach, FL', lat: 25.7907, lng: -80.13, weightLbs: 55, cubicFt: 7.5, priority: 3, promisedBy: new Date(Date.now() + 21600000).toISOString(), status: 'ARRIVED' },
  { id: 'RD-1046', customer: 'Wynwood Studio', address: 'Wynwood, Miami, FL', lat: 25.801, lng: -80.199, weightLbs: 28, cubicFt: 3.4, priority: 2, promisedBy: new Date(Date.now() + 18000000).toISOString(), status: 'SORTED' },
  { id: 'RD-1047', customer: 'Hialeah Medical', address: 'Hialeah, FL', lat: 25.8576, lng: -80.2781, weightLbs: 24, cubicFt: 2.8, priority: 1, promisedBy: new Date(Date.now() + 9000000).toISOString(), status: 'SORTED' },
  { id: 'RD-1048', customer: 'Kendall Office', address: 'Kendall, FL', lat: 25.6793, lng: -80.3173, weightLbs: 60, cubicFt: 8.1, priority: 3, promisedBy: new Date(Date.now() + 25200000).toISOString(), status: 'SORTED' },
  { id: 'RD-1049', customer: 'Aventura Boutique', address: 'Aventura, FL', lat: 25.9565, lng: -80.1392, weightLbs: 16, cubicFt: 2, priority: 2, promisedBy: new Date(Date.now() + 16200000).toISOString(), status: 'SORTED' }
];

const fallbackAnalytics: Analytics = { baselineMiles: 112.4, optimizedMiles: 61.8, milesSaved: 50.6, savingsPct: 45, avgUtilizationPct: 78, slaRiskCount: 3 };

function badgeClass(status: string) {
  return `status status-${status.toLowerCase()}`;
}

function App() {
  const [deliveries, setDeliveries] = useState<Delivery[]>(fallbackDeliveries);
  const [loads, setLoads] = useState<Load[]>([]);
  const [health, setHealth] = useState<Health>({ api: 'healthy', postgres: 'demo-ready', redis: 'demo-ready', queueDepth: 2, failedJobs: 0, avgProcessingMs: 168, vehiclesOnline: 3, vehiclesTotal: 3 });
  const [events, setEvents] = useState<OpsEvent[]>([
    { at: new Date().toISOString(), type: 'system.ready', entity: 'CONTROL-TOWER', severity: 'success' },
    { at: new Date(Date.now() - 19000).toISOString(), type: 'delivery.sorted', entity: 'RD-1042', severity: 'info' }
  ]);
  const [analytics, setAnalytics] = useState<Analytics>(fallbackAnalytics);
  const [scenario, setScenario] = useState<Scenario>(null);
  const [engine, setEngine] = useState('typescript-seed');
  const [streamConnected, setStreamConnected] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [runningScenario, setRunningScenario] = useState<string | null>(null);

  const applyState = (data: StatePayload) => {
    setDeliveries(data.deliveries);
    setLoads(data.loads);
    setEvents(data.events);
    setHealth(data.health);
    setAnalytics(data.analytics);
    setScenario(data.scenario);
    setEngine(data.engine);
  };

  const refreshState = async () => {
    const response = await fetch('/api/state');
    if (!response.ok) throw new Error('Unable to load operations state');
    applyState(await response.json());
  };

  useEffect(() => {
    refreshState().catch(() => undefined);

    const source = new EventSource('/api/events/stream');
    source.onopen = () => setStreamConnected(true);
    source.onerror = () => setStreamConnected(false);
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as OpsEvent;
        setEvents((current) => [event, ...current].slice(0, 20));
      } catch {
        // Ignore malformed demo stream frames while preserving the dashboard.
      }
    };

    return () => source.close();
  }, []);

  const metrics = useMemo(() => ({
    today: 147,
    crossDock: deliveries.filter((delivery) => ['ARRIVED', 'SORTED'].includes(delivery.status)).length,
    ready: deliveries.filter((delivery) => delivery.status === 'SORTED').length,
    onTime: scenario?.severity === 'critical' ? '93.8%' : '96.4%'
  }), [deliveries, scenario]);

  const optimize = async () => {
    setOptimizing(true);
    try {
      const response = await fetch('/api/optimize', { method: 'POST' });
      const data = await response.json();
      setLoads(data.loads);
      setAnalytics(data.analytics);
      setEngine(data.engine);
      await refreshState();
    } catch {
      setLoads([
        { id: 'LOAD-01', vehicleId: 'VAN-07', deliveries: deliveries.slice(0, 3), totalWeightLbs: 72, totalCubicFt: 9.4, utilizationPct: 82, estimatedMiles: 18.2 },
        { id: 'LOAD-02', vehicleId: 'VAN-12', deliveries: deliveries.slice(3, 6), totalWeightLbs: 107, totalCubicFt: 13.7, utilizationPct: 68, estimatedMiles: 14.7 }
      ]);
    } finally {
      setTimeout(() => setOptimizing(false), 550);
    }
  };

  const runScenario = async (key: string) => {
    setRunningScenario(key);
    try {
      const response = await fetch(`/api/scenarios/${key}`, { method: 'POST' });
      if (!response.ok) throw new Error('Scenario failed');
      applyState(await response.json());
    } finally {
      setTimeout(() => setRunningScenario(null), 450);
    }
  };

  const minLat = Math.min(...deliveries.map((delivery) => delivery.lat), 25.6793);
  const maxLat = Math.max(...deliveries.map((delivery) => delivery.lat), 25.9565);
  const minLng = Math.min(...deliveries.map((delivery) => delivery.lng), -80.3553);
  const maxLng = Math.max(...deliveries.map((delivery) => delivery.lng), -80.13);
  const project = (point: { lat: number; lng: number }) => ({
    x: 8 + ((point.lng - minLng) / Math.max(0.001, maxLng - minLng)) * 80,
    y: 84 - ((point.lat - minLat) / Math.max(0.001, maxLat - minLat)) * 70
  });
  const hubPoint = project({ lat: 25.8195, lng: -80.3553 });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">L</div><div><strong>Logistics</strong><span>Control Tower</span></div></div>
        <nav>
          <a className="active" href="#control"><Activity size={18}/>Control Tower</a>
          <a href="#resilience"><Zap size={18}/>Resilience Lab</a>
          <a href="#deliveries"><Boxes size={18}/>Deliveries</a>
          <a href="#optimizer"><Route size={18}/>Load Builder</a>
          <a href="#health"><ServerCog size={18}/>System Health</a>
        </nav>
        <div className="side-note"><span>ENGINEERING DEMO</span><p>Cross-dock workflows, live events, geospatial optimization, failure-aware operations.</p></div>
      </aside>

      <main>
        <header id="control">
          <div><p className="eyebrow">SOUTH FLORIDA CROSS-DOCK</p><h1>Operations Control Tower</h1><p className="subtitle">See the network react when real-world logistics stops going according to plan.</p></div>
          <div className="header-pills">
            <div className={`live-pill ${streamConnected ? '' : 'offline'}`}><Wifi size={13}/><span></span>{streamConnected ? 'LIVE EVENT STREAM' : 'DEMO STREAM'}</div>
            <div className="engine-pill"><Sparkles size={13}/>{engine.replaceAll('-', ' ')}</div>
          </div>
        </header>

        <section className="metrics-grid">
          <Metric icon={<PackageCheck size={20}/>} label="Deliveries Today" value={metrics.today} detail="+12% vs yesterday" />
          <Metric icon={<Boxes size={20}/>} label="At Cross-Dock" value={metrics.crossDock} detail="Inbound + sorted" />
          <Metric icon={<Truck size={20}/>} label="Ready to Assign" value={metrics.ready} detail="Eligible for optimization" />
          <Metric icon={<CheckCircle2 size={20}/>} label="On-Time" value={metrics.onTime} detail="Target ≥ 95%" />
        </section>

        <section className="impact-strip">
          <Impact icon={<Route size={18}/>} label="Independent Dispatch" value={`${analytics.baselineMiles} mi`} detail="baseline" />
          <Impact icon={<Sparkles size={18}/>} label="Optimized Network" value={`${analytics.optimizedMiles} mi`} detail={`${analytics.savingsPct}% less travel`} positive />
          <Impact icon={<Gauge size={18}/>} label="Capacity Utilization" value={`${analytics.avgUtilizationPct}%`} detail="across active loads" positive />
          <Impact icon={<AlertTriangle size={18}/>} label="SLA Risk" value={analytics.slaRiskCount} detail="promise windows < 3h" warning={analytics.slaRiskCount > 0} />
        </section>

        <section className={`scenario-panel panel ${scenario ? `scenario-${scenario.severity}` : ''}`} id="resilience">
          <div className="scenario-copy">
            <p className="kicker"><Radio size={12}/> RESILIENCE LAB · WOW MODE</p>
            <h2>{scenario ? scenario.title : 'Stress the network. Watch it recover.'}</h2>
            <p>{scenario ? scenario.detail : 'Inject a realistic operational problem and the control tower will re-optimize capacity, update network KPIs, redraw routes, and emit the recovery events live.'}</p>
            {scenario && <div className="incident-badge"><AlertTriangle size={14}/> Active operational change</div>}
          </div>
          <div className="scenario-actions">
            <ScenarioButton icon={<Zap size={16}/>} title="Priority Surge" detail="Urgent medical stop" busy={runningScenario === 'priority-surge'} onClick={() => runScenario('priority-surge')} />
            <ScenarioButton icon={<Truck size={16}/>} title="Vehicle Offline" detail="Lose outbound capacity" busy={runningScenario === 'vehicle-offline'} onClick={() => runScenario('vehicle-offline')} />
            <ScenarioButton icon={<AlertTriangle size={16}/>} title="Delivery Exception" detail="Remove a problem stop" busy={runningScenario === 'delivery-exception'} onClick={() => runScenario('delivery-exception')} />
            <button className="scenario-reset" onClick={() => runScenario('reset')} disabled={Boolean(runningScenario)}><RefreshCw size={15}/>Reset baseline</button>
          </div>
        </section>

        <section className="dashboard-grid">
          <article className="panel map-panel">
            <div className="panel-head"><div><p className="kicker">LIVE GEOSPATIAL NETWORK</p><h2>Miami Delivery Flow</h2></div><div className="map-head-meta"><span className="pulse-dot"></span>{loads.length} active loads</div></div>
            <div className="map-canvas">
              <div className="map-grid"></div>
              <svg className="route-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {loads.map((load, index) => {
                  const points = [hubPoint, ...load.deliveries.map(project)].map((point) => `${point.x},${point.y}`).join(' ');
                  return <polyline key={load.id} className={`route-line route-${index % 3}`} points={points} />;
                })}
              </svg>
              <div className="hub" style={{ left: `${hubPoint.x}%`, top: `${hubPoint.y}%` }}><span>XD</span><small>Doral Cross-Dock</small></div>
              {deliveries.map((delivery) => {
                const point = project(delivery);
                return <div key={delivery.id} className={`map-dot priority-${delivery.priority} ${delivery.status === 'EXCEPTION' ? 'map-dot-exception' : ''}`} style={{ left: `${point.x}%`, top: `${point.y}%` }} title={`${delivery.id} · ${delivery.address}`}><span>{delivery.id.replace('RD-', '')}</span></div>;
              })}
              <div className="map-label label-north">Aventura / North Miami</div>
              <div className="map-label label-south">Kendall / Coral Gables</div>
              <div className="map-legend"><span><i className="legend-p1"></i>P1 urgent</span><span><i className="legend-route"></i>optimized flow</span></div>
            </div>
          </article>

          <article className="panel loads-panel" id="optimizer">
            <div className="panel-head"><div><p className="kicker">SMART LOAD BUILDER</p><h2>Outbound Loads</h2></div><Sparkles size={20}/></div>
            <button className="optimize-btn" onClick={optimize} disabled={optimizing}>{optimizing ? 'Recomputing network…' : 'Optimize Outbound Loads'}</button>
            <div className="optimization-proof"><ShieldCheck size={15}/><span><strong>{analytics.milesSaved} miles avoided</strong> versus independent round trips</span></div>
            <div className="load-list">
              {loads.length === 0 && <div className="empty-state">Run optimization to group sorted deliveries by capacity, priority, delivery window, and proximity.</div>}
              {loads.map((load) => <div className="load-card" key={load.id}>
                <div className="load-title"><strong>{load.id}</strong><span>{load.vehicleId}</span></div>
                <div className="load-stats"><span><b>{load.deliveries.length}</b> stops</span><span><b>{load.estimatedMiles}</b> mi</span><span><b>{load.utilizationPct}%</b> utilized</span></div>
                <div className="util-track"><i style={{ width: `${Math.min(load.utilizationPct, 100)}%` }}></i></div>
                <div className="stop-tags">{load.deliveries.slice(0, 5).map((delivery) => <span key={delivery.id}>{delivery.id}</span>)}</div>
              </div>)}
            </div>
          </article>
        </section>

        <section className="panel deliveries-panel" id="deliveries">
          <div className="panel-head"><div><p className="kicker">CROSS-DOCK QUEUE</p><h2>Active Deliveries</h2></div><span className="count-chip">{deliveries.length} shown</span></div>
          <div className="table-wrap"><table><thead><tr><th>Delivery</th><th>Destination</th><th>Priority</th><th>Capacity</th><th>Promise</th><th>Status</th></tr></thead>
            <tbody>{deliveries.map((delivery) => <tr key={delivery.id} className={delivery.id === 'RD-1099' ? 'priority-row' : ''}><td><strong>{delivery.id}</strong><small>{delivery.customer}</small></td><td>{delivery.address}</td><td><span className={`priority-chip p${delivery.priority}`}>P{delivery.priority}</span></td><td>{delivery.weightLbs} lb · {delivery.cubicFt} ft³</td><td><Clock3 size={14}/>{new Date(delivery.promisedBy).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</td><td><span className={badgeClass(delivery.status)}>{delivery.status.replaceAll('_', ' ')}</span></td></tr>)}</tbody>
          </table></div>
        </section>

        <section className="bottom-grid" id="health">
          <article className="panel health-panel"><div className="panel-head"><div><p className="kicker">RELIABILITY</p><h2>System Health</h2></div><ServerCog size={20}/></div>
            <div className="health-grid">
              <Health label="API" value={health.api} good />
              <Health label="Postgres" value={health.postgres} good />
              <Health label="Redis" value={health.redis} good />
              <Health label="Queue Depth" value={String(health.queueDepth)} />
              <Health label="Failed Jobs" value={String(health.failedJobs)} good={health.failedJobs === 0} />
              <Health label="Fleet Online" value={`${health.vehiclesOnline ?? 3}/${health.vehiclesTotal ?? 3}`} good={(health.vehiclesOnline ?? 3) === (health.vehiclesTotal ?? 3)} />
              <Health label="Avg Processing" value={`${health.avgProcessingMs} ms`} />
              <Health label="Event Stream" value={streamConnected ? 'connected' : 'demo-ready'} good={streamConnected} />
              <Health label="Optimizer" value={engine.replaceAll('-', ' ')} good />
            </div>
          </article>
          <article className="panel events-panel"><div className="panel-head"><div><p className="kicker">LIVE EVENT STREAM</p><h2>Operational Events</h2></div><Activity size={20}/></div>
            <div className="event-list">{events.slice(0, 8).map((event, index) => <div className={`event-row event-${event.severity ?? 'info'}`} key={`${event.at}-${index}`}><span className="event-time">{new Date(event.at).toLocaleTimeString([], { hour12: false })}</span><code>{event.type}</code><strong>{event.entity}</strong>{event.message && <small>{event.message}</small>}</div>)}</div>
          </article>
        </section>

        <footer>Independent engineering demonstration · Common cross-dock and last-mile delivery problems only · No proprietary Roadie systems, APIs, code, or data used.</footer>
      </main>
    </div>
  );
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string | number; detail: string }) {
  return <div className="metric-card"><div className="metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>;
}

function Impact({ icon, label, value, detail, positive = false, warning = false }: { icon: React.ReactNode; label: string; value: string | number; detail: string; positive?: boolean; warning?: boolean }) {
  return <div className={`impact-item ${positive ? 'impact-positive' : ''} ${warning ? 'impact-warning' : ''}`}><div className="impact-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>;
}

function ScenarioButton({ icon, title, detail, busy, onClick }: { icon: React.ReactNode; title: string; detail: string; busy: boolean; onClick: () => void }) {
  return <button className="scenario-button" onClick={onClick} disabled={busy}><span>{icon}</span><div><strong>{busy ? 'Rebalancing…' : title}</strong><small>{detail}</small></div></button>;
}

function Health({ label, value, good = false }: { label: string; value: string; good?: boolean }) {
  return <div className="health-item"><span>{label}</span><strong>{good && <i className="health-dot"></i>}{value}</strong></div>;
}

export default App;
