import { useEffect, useMemo, useState } from 'react';
import { Activity, Boxes, CheckCircle2, Clock3, MapPinned, PackageCheck, Route, ServerCog, Sparkles, Truck } from 'lucide-react';

type Delivery = {
  id: string; customer: string; address: string; lat: number; lng: number; weightLbs: number; cubicFt: number;
  priority: 1 | 2 | 3; promisedBy: string; status: string;
};

type Load = {
  id: string; vehicleId: string; deliveries: Delivery[]; totalWeightLbs: number; totalCubicFt: number;
  utilizationPct: number; estimatedMiles: number;
};

type Health = { api: string; postgres: string; redis: string; queueDepth: number; failedJobs: number; avgProcessingMs: number };
type Event = { at: string; type: string; entity: string };

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

function badgeClass(status: string) {
  return `status status-${status.toLowerCase()}`;
}

function App() {
  const [deliveries, setDeliveries] = useState<Delivery[]>(fallbackDeliveries);
  const [loads, setLoads] = useState<Load[]>([]);
  const [health, setHealth] = useState<Health>({ api: 'healthy', postgres: 'demo-ready', redis: 'demo-ready', queueDepth: 3, failedJobs: 0, avgProcessingMs: 182 });
  const [events, setEvents] = useState<Event[]>([
    { at: new Date().toISOString(), type: 'system.ready', entity: 'CONTROL-TOWER' },
    { at: new Date(Date.now() - 19000).toISOString(), type: 'delivery.sorted', entity: 'RD-1042' }
  ]);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/deliveries').then((r) => r.json()),
      fetch('/api/loads').then((r) => r.json()),
      fetch('/api/health').then((r) => r.json()),
      fetch('/api/events').then((r) => r.json())
    ])
      .then(([d, l, h, e]) => { setDeliveries(d); setLoads(l); setHealth(h); setEvents(e); })
      .catch(() => undefined);
  }, []);

  const metrics = useMemo(() => ({
    today: 147,
    crossDock: deliveries.filter((d) => ['ARRIVED', 'SORTED'].includes(d.status)).length,
    ready: deliveries.filter((d) => d.status === 'SORTED').length,
    onTime: '96.4%'
  }), [deliveries]);

  const optimize = async () => {
    setOptimizing(true);
    try {
      const response = await fetch('/api/optimize', { method: 'POST' });
      const data = await response.json();
      setLoads(data.loads);
      const eventResponse = await fetch('/api/events');
      setEvents(await eventResponse.json());
    } catch {
      setLoads([
        { id: 'LOAD-01', vehicleId: 'VAN-07', deliveries: deliveries.slice(0, 3), totalWeightLbs: 72, totalCubicFt: 9.4, utilizationPct: 82, estimatedMiles: 18.2 },
        { id: 'LOAD-02', vehicleId: 'VAN-12', deliveries: deliveries.slice(3, 6), totalWeightLbs: 107, totalCubicFt: 13.7, utilizationPct: 68, estimatedMiles: 14.7 }
      ]);
    } finally {
      setTimeout(() => setOptimizing(false), 550);
    }
  };

  const minLat = Math.min(...deliveries.map((d) => d.lat));
  const maxLat = Math.max(...deliveries.map((d) => d.lat));
  const minLng = Math.min(...deliveries.map((d) => d.lng));
  const maxLng = Math.max(...deliveries.map((d) => d.lng));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">L</div><div><strong>Logistics</strong><span>Control Tower</span></div></div>
        <nav>
          <a className="active" href="#control"><Activity size={18}/>Control Tower</a>
          <a href="#deliveries"><Boxes size={18}/>Deliveries</a>
          <a href="#optimizer"><Route size={18}/>Load Builder</a>
          <a href="#health"><ServerCog size={18}/>System Health</a>
        </nav>
        <div className="side-note"><span>ENGINEERING DEMO</span><p>Cross-dock workflows, geospatial grouping, event-driven operations.</p></div>
      </aside>

      <main>
        <header id="control">
          <div><p className="eyebrow">SOUTH FLORIDA CROSS-DOCK</p><h1>Operations Control Tower</h1><p className="subtitle">Live visibility from inbound scan to optimized outbound load.</p></div>
          <div className="live-pill"><span></span>LIVE OPERATIONS</div>
        </header>

        <section className="metrics-grid">
          <Metric icon={<PackageCheck size={20}/>} label="Deliveries Today" value={metrics.today} detail="+12% vs yesterday" />
          <Metric icon={<Boxes size={20}/>} label="At Cross-Dock" value={metrics.crossDock} detail="Inbound + sorted" />
          <Metric icon={<Truck size={20}/>} label="Ready to Assign" value={metrics.ready} detail="Eligible for optimization" />
          <Metric icon={<CheckCircle2 size={20}/>} label="On-Time" value={metrics.onTime} detail="Target ≥ 95%" />
        </section>

        <section className="dashboard-grid">
          <article className="panel map-panel">
            <div className="panel-head"><div><p className="kicker">GEOSPATIAL VIEW</p><h2>Miami Delivery Network</h2></div><MapPinned size={20}/></div>
            <div className="map-canvas">
              <div className="map-grid"></div>
              <div className="hub"><span>XD</span><small>Doral Cross-Dock</small></div>
              {deliveries.map((d) => {
                const x = 8 + ((d.lng - minLng) / Math.max(0.001, maxLng - minLng)) * 80;
                const y = 84 - ((d.lat - minLat) / Math.max(0.001, maxLat - minLat)) * 70;
                return <div key={d.id} className={`map-dot priority-${d.priority}`} style={{ left: `${x}%`, top: `${y}%` }} title={`${d.id} · ${d.address}`}><span>{d.id.replace('RD-', '')}</span></div>;
              })}
              <div className="map-label label-north">Aventura / North Miami</div>
              <div className="map-label label-south">Kendall / Coral Gables</div>
            </div>
          </article>

          <article className="panel loads-panel" id="optimizer">
            <div className="panel-head"><div><p className="kicker">SMART LOAD BUILDER</p><h2>Outbound Loads</h2></div><Sparkles size={20}/></div>
            <button className="optimize-btn" onClick={optimize} disabled={optimizing}>{optimizing ? 'Optimizing network…' : 'Optimize Outbound Loads'}</button>
            <div className="load-list">
              {loads.length === 0 && <div className="empty-state">Run optimization to group sorted deliveries by capacity, priority, delivery window, and proximity.</div>}
              {loads.map((load) => <div className="load-card" key={load.id}>
                <div className="load-title"><strong>{load.id}</strong><span>{load.vehicleId}</span></div>
                <div className="load-stats"><span><b>{load.deliveries.length}</b> stops</span><span><b>{load.estimatedMiles}</b> mi</span><span><b>{load.utilizationPct}%</b> utilized</span></div>
                <div className="util-track"><i style={{ width: `${Math.min(load.utilizationPct, 100)}%` }}></i></div>
                <div className="stop-tags">{load.deliveries.slice(0, 4).map((d) => <span key={d.id}>{d.id}</span>)}</div>
              </div>)}
            </div>
          </article>
        </section>

        <section className="panel deliveries-panel" id="deliveries">
          <div className="panel-head"><div><p className="kicker">CROSS-DOCK QUEUE</p><h2>Active Deliveries</h2></div><span className="count-chip">{deliveries.length} shown</span></div>
          <div className="table-wrap"><table><thead><tr><th>Delivery</th><th>Destination</th><th>Priority</th><th>Capacity</th><th>Promise</th><th>Status</th></tr></thead>
            <tbody>{deliveries.map((d) => <tr key={d.id}><td><strong>{d.id}</strong><small>{d.customer}</small></td><td>{d.address}</td><td><span className={`priority-chip p${d.priority}`}>P{d.priority}</span></td><td>{d.weightLbs} lb · {d.cubicFt} ft³</td><td><Clock3 size={14}/>{new Date(d.promisedBy).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</td><td><span className={badgeClass(d.status)}>{d.status.replaceAll('_', ' ')}</span></td></tr>)}</tbody>
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
              <Health label="Avg Processing" value={`${health.avgProcessingMs} ms`} />
            </div>
          </article>
          <article className="panel events-panel"><div className="panel-head"><div><p className="kicker">EVENT STREAM</p><h2>Operational Events</h2></div><Activity size={20}/></div>
            <div className="event-list">{events.slice(0, 6).map((e, i) => <div className="event-row" key={`${e.at}-${i}`}><span className="event-time">{new Date(e.at).toLocaleTimeString([], { hour12: false })}</span><code>{e.type}</code><strong>{e.entity}</strong></div>)}</div>
          </article>
        </section>

        <footer>Independent engineering demonstration · Built around common cross-dock and last-mile delivery problems · No proprietary Roadie systems or data used.</footer>
      </main>
    </div>
  );
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string | number; detail: string }) {
  return <div className="metric-card"><div className="metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>;
}

function Health({ label, value, good = false }: { label: string; value: string; good?: boolean }) {
  return <div className="health-item"><span>{label}</span><strong>{good && <i className="health-dot"></i>}{value}</strong></div>;
}

export default App;
