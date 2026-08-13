import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express, { type Response } from 'express';
import { z } from 'zod';
import { canTransition, optimizeLoads, type Delivery, type DeliveryStatus, type Load, type Vehicle } from './domain.js';

const app = express();
app.use(cors());
app.use(express.json());

const promised = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
const hub = { lat: 25.8195, lng: -80.3553 };

function seedDeliveries(): Delivery[] {
  return [
    { id: 'RD-1042', customer: 'Doral Pharmacy', address: 'Doral, FL', lat: 25.8195, lng: -80.3553, weightLbs: 18, cubicFt: 2.2, priority: 1, promisedBy: promised(2), status: 'SORTED' },
    { id: 'RD-1043', customer: 'Coral Gables Retail', address: 'Coral Gables, FL', lat: 25.7215, lng: -80.2684, weightLbs: 42, cubicFt: 5.7, priority: 2, promisedBy: promised(4), status: 'SORTED' },
    { id: 'RD-1044', customer: 'Brickell Market', address: 'Brickell, Miami, FL', lat: 25.7617, lng: -80.1918, weightLbs: 12, cubicFt: 1.5, priority: 1, promisedBy: promised(3), status: 'SORTED' },
    { id: 'RD-1045', customer: 'Miami Beach Home', address: 'Miami Beach, FL', lat: 25.7907, lng: -80.1300, weightLbs: 55, cubicFt: 7.5, priority: 3, promisedBy: promised(6), status: 'ARRIVED' },
    { id: 'RD-1046', customer: 'Wynwood Studio', address: 'Wynwood, Miami, FL', lat: 25.8010, lng: -80.1990, weightLbs: 28, cubicFt: 3.4, priority: 2, promisedBy: promised(5), status: 'SORTED' },
    { id: 'RD-1047', customer: 'Hialeah Medical', address: 'Hialeah, FL', lat: 25.8576, lng: -80.2781, weightLbs: 24, cubicFt: 2.8, priority: 1, promisedBy: promised(2.5), status: 'SORTED' },
    { id: 'RD-1048', customer: 'Kendall Office', address: 'Kendall, FL', lat: 25.6793, lng: -80.3173, weightLbs: 60, cubicFt: 8.1, priority: 3, promisedBy: promised(7), status: 'SORTED' },
    { id: 'RD-1049', customer: 'Aventura Boutique', address: 'Aventura, FL', lat: 25.9565, lng: -80.1392, weightLbs: 16, cubicFt: 2.0, priority: 2, promisedBy: promised(4.5), status: 'SORTED' },
    { id: 'RD-1050', customer: 'Little Havana Cafe', address: 'Little Havana, Miami, FL', lat: 25.7658, lng: -80.2197, weightLbs: 20, cubicFt: 2.4, priority: 2, promisedBy: promised(5.5), status: 'SORTED' },
    { id: 'RD-1051', customer: 'North Miami Clinic', address: 'North Miami, FL', lat: 25.8901, lng: -80.1867, weightLbs: 31, cubicFt: 3.9, priority: 1, promisedBy: promised(3.5), status: 'SORTED' }
  ];
}

const baseVehicles: Vehicle[] = [
  { id: 'VAN-07', label: 'Cargo Van 07', maxWeightLbs: 180, maxCubicFt: 24 },
  { id: 'VAN-12', label: 'Cargo Van 12', maxWeightLbs: 200, maxCubicFt: 28 },
  { id: 'SUV-03', label: 'SUV 03', maxWeightLbs: 120, maxCubicFt: 16 }
];

type Severity = 'info' | 'success' | 'warning' | 'critical';
type OpsEvent = { at: string; type: string; entity: string; severity: Severity; message?: string };
type Scenario = null | { key: string; title: string; detail: string; severity: Severity };

type Analytics = {
  baselineMiles: number;
  optimizedMiles: number;
  milesSaved: number;
  savingsPct: number;
  avgUtilizationPct: number;
  slaRiskCount: number;
};

let deliveries = seedDeliveries();
let activeVehicles = [...baseVehicles];
let loads: Load[] = optimizeLoads(deliveries, activeVehicles);
let activeScenario: Scenario = null;
let lastEngine = 'typescript-seed';

const events: OpsEvent[] = [
  { at: new Date().toISOString(), type: 'system.ready', entity: 'CONTROL-TOWER', severity: 'success', message: 'Operations control tower online' },
  { at: new Date(Date.now() - 18000).toISOString(), type: 'delivery.sorted', entity: 'RD-1042', severity: 'info' },
  { at: new Date(Date.now() - 31000).toISOString(), type: 'delivery.arrived', entity: 'RD-1045', severity: 'info' }
];

const sseClients = new Set<Response>();

function publish(type: string, entity: string, severity: Severity = 'info', message?: string) {
  const event: OpsEvent = { at: new Date().toISOString(), type, entity, severity, message };
  events.unshift(event);
  if (events.length > 100) events.length = 100;
  const frame = `data: ${JSON.stringify(event)}\n\n`;
  sseClients.forEach((client) => client.write(frame));
  return event;
}

function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const radius = 3958.8;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

function routeMiles(load: Load) {
  if (!load.deliveries.length) return 0;
  let miles = distanceMiles(hub, load.deliveries[0]);
  for (let i = 1; i < load.deliveries.length; i++) miles += distanceMiles(load.deliveries[i - 1], load.deliveries[i]);
  miles += distanceMiles(load.deliveries[load.deliveries.length - 1], hub);
  return miles;
}

function analytics(): Analytics {
  const sorted = deliveries.filter((delivery) => delivery.status === 'SORTED');
  const baselineMiles = sorted.reduce((sum, delivery) => sum + distanceMiles(hub, delivery) * 2, 0);
  const optimizedMiles = loads.reduce((sum, load) => sum + routeMiles(load), 0);
  const milesSaved = Math.max(0, baselineMiles - optimizedMiles);
  const avgUtilizationPct = loads.length ? loads.reduce((sum, load) => sum + load.utilizationPct, 0) / loads.length : 0;
  const threeHours = Date.now() + 3 * 60 * 60 * 1000;
  const slaRiskCount = deliveries.filter((delivery) => delivery.status !== 'DELIVERED' && new Date(delivery.promisedBy).getTime() <= threeHours).length;

  return {
    baselineMiles: Number(baselineMiles.toFixed(1)),
    optimizedMiles: Number(optimizedMiles.toFixed(1)),
    milesSaved: Number(milesSaved.toFixed(1)),
    savingsPct: baselineMiles ? Math.round((milesSaved / baselineMiles) * 100) : 0,
    avgUtilizationPct: Math.round(avgUtilizationPct),
    slaRiskCount
  };
}

function health() {
  return {
    api: 'healthy',
    postgres: 'demo-ready',
    redis: 'demo-ready',
    queueDepth: activeScenario ? 5 : 2,
    failedJobs: 0,
    avgProcessingMs: activeScenario ? 214 : 168,
    sseClients: sseClients.size,
    vehiclesOnline: activeVehicles.length,
    vehiclesTotal: baseVehicles.length
  };
}

function state() {
  return { deliveries, loads, events: events.slice(0, 20), health: health(), analytics: analytics(), scenario: activeScenario, engine: lastEngine, vehicles: activeVehicles };
}

async function runOptimization() {
  const optimizerUrl = process.env.OPTIMIZER_URL ?? 'http://localhost:8001';
  publish('load.optimization.requested', 'NETWORK', 'info', `${activeVehicles.length} vehicles available`);
  let engine = 'typescript-fallback';

  try {
    const response = await fetch(`${optimizerUrl}/optimize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deliveries, vehicles: activeVehicles })
    });
    if (!response.ok) throw new Error(`Optimizer returned ${response.status}`);

    const payload = await response.json() as { loads: Array<Omit<Load, 'deliveries'> & { deliveryIds: string[] }> };
    loads = payload.loads.map((load) => ({
      ...load,
      deliveries: load.deliveryIds
        .map((id) => deliveries.find((delivery) => delivery.id === id))
        .filter((delivery): delivery is Delivery => Boolean(delivery))
    }));
    engine = 'python-fastapi';
  } catch {
    loads = optimizeLoads(deliveries, activeVehicles);
  }

  lastEngine = engine;
  const summary = analytics();
  publish('optimizer.completed', `${engine}:${loads.length}-loads`, 'success', `${summary.milesSaved} miles avoided vs independent dispatch`);
  return { engine, analytics: summary };
}

app.get('/api/health', (_req, res) => res.json(health()));
app.get('/api/state', (_req, res) => res.json(state()));
app.get('/api/deliveries', (_req, res) => res.json(deliveries));
app.get('/api/loads', (_req, res) => res.json(loads));
app.get('/api/events', (_req, res) => res.json(events));

app.get('/api/events/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  sseClients.add(res);
  res.write(`data: ${JSON.stringify({ at: new Date().toISOString(), type: 'stream.connected', entity: 'CLIENT', severity: 'success' })}\n\n`);

  const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), 20000);
  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

app.post('/api/optimize', async (_req, res) => {
  const result = await runOptimization();
  const assigned = loads.reduce((count, load) => count + load.deliveries.length, 0);
  const unassigned = deliveries.filter((delivery) => delivery.status === 'SORTED').length - assigned;
  res.json({ loads, unassigned, ...result });
});

const scenarioSchema = z.enum(['priority-surge', 'vehicle-offline', 'delivery-exception', 'reset']);

app.post('/api/scenarios/:scenario', async (req, res) => {
  const parsed = scenarioSchema.safeParse(req.params.scenario);
  if (!parsed.success) return res.status(400).json({ error: 'Unknown scenario' });

  const scenario = parsed.data;
  if (scenario === 'reset') {
    deliveries = seedDeliveries();
    activeVehicles = [...baseVehicles];
    activeScenario = null;
    loads = optimizeLoads(deliveries, activeVehicles);
    lastEngine = 'typescript-seed';
    publish('scenario.reset', 'NETWORK', 'success', 'Baseline operations restored');
    return res.json(state());
  }

  deliveries = seedDeliveries();
  activeVehicles = [...baseVehicles];
  activeScenario = null;

  if (scenario === 'priority-surge') {
    deliveries.unshift({
      id: 'RD-1099', customer: 'Critical Medical', address: 'Miami Beach, FL', lat: 25.8127, lng: -80.1341,
      weightLbs: 14, cubicFt: 1.8, priority: 1, promisedBy: promised(1.1), status: 'SORTED'
    });
    activeScenario = { key: scenario, title: 'Priority Surge', detail: 'Urgent medical delivery added with a 66-minute promise window.', severity: 'warning' };
    publish('scenario.priority_surge', 'RD-1099', 'warning', activeScenario.detail);
  }

  if (scenario === 'vehicle-offline') {
    activeVehicles = baseVehicles.filter((vehicle) => vehicle.id !== 'VAN-07');
    activeScenario = { key: scenario, title: 'Vehicle Offline', detail: 'Cargo Van 07 removed from capacity. Remaining loads must be rebalanced.', severity: 'critical' };
    publish('fleet.vehicle_offline', 'VAN-07', 'critical', activeScenario.detail);
  }

  if (scenario === 'delivery-exception') {
    const target = deliveries.find((delivery) => delivery.status === 'SORTED');
    if (target) target.status = 'EXCEPTION';
    activeScenario = { key: scenario, title: 'Delivery Exception', detail: `${target?.id ?? 'Delivery'} moved to exception handling and removed from optimization.`, severity: 'warning' };
    publish('delivery.exception', target?.id ?? 'UNKNOWN', 'warning', activeScenario.detail);
  }

  await runOptimization();
  publish('network.rebalanced', 'CONTROL-TOWER', 'success', 'Outbound loads recomputed after operational change');
  return res.json(state());
});

const transitionSchema = z.object({ status: z.enum(['ARRIVED', 'SORTED', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION']) });

app.post('/api/deliveries/:id/status', (req, res) => {
  const delivery = deliveries.find((item) => item.id === req.params.id);
  if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

  const parsed = transitionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid status' });

  const next = parsed.data.status as DeliveryStatus;
  if (!canTransition(delivery.status, next)) return res.status(409).json({ error: `Invalid transition ${delivery.status} -> ${next}` });

  delivery.status = next;
  publish(`delivery.${next.toLowerCase()}`, delivery.id, next === 'EXCEPTION' ? 'warning' : 'info');
  res.json(delivery);
});

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(moduleDir, '../../web/dist');
app.use(express.static(webDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  return res.sendFile(path.join(webDist, 'index.html'));
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`Logistics Control Tower listening on http://localhost:${port}`));
