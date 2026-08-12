import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import { canTransition, optimizeLoads, type Delivery, type DeliveryStatus, type Load, type Vehicle } from './domain.js';

const app = express();
app.use(cors());
app.use(express.json());

const now = new Date();
const promised = (hours: number) => new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();

const deliveries: Delivery[] = [
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

const vehicles: Vehicle[] = [
  { id: 'VAN-07', label: 'Cargo Van 07', maxWeightLbs: 180, maxCubicFt: 24 },
  { id: 'VAN-12', label: 'Cargo Van 12', maxWeightLbs: 200, maxCubicFt: 28 },
  { id: 'SUV-03', label: 'SUV 03', maxWeightLbs: 120, maxCubicFt: 16 }
];

let loads: Load[] = optimizeLoads(deliveries, vehicles);
const events = [
  { at: new Date().toISOString(), type: 'system.ready', entity: 'CONTROL-TOWER' },
  { at: new Date(Date.now() - 18000).toISOString(), type: 'delivery.sorted', entity: 'RD-1042' },
  { at: new Date(Date.now() - 31000).toISOString(), type: 'delivery.arrived', entity: 'RD-1045' }
];

app.get('/api/health', (_req, res) => {
  res.json({ api: 'healthy', postgres: 'demo-ready', redis: 'demo-ready', queueDepth: 3, failedJobs: 0, avgProcessingMs: 182 });
});

app.get('/api/deliveries', (_req, res) => res.json(deliveries));
app.get('/api/loads', (_req, res) => res.json(loads));
app.get('/api/events', (_req, res) => res.json(events));

app.post('/api/optimize', async (_req, res) => {
  const optimizerUrl = process.env.OPTIMIZER_URL ?? 'http://localhost:8001';
  let engine = 'typescript-fallback';

  try {
    const response = await fetch(`${optimizerUrl}/optimize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deliveries, vehicles })
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
    loads = optimizeLoads(deliveries, vehicles);
  }

  const assigned = loads.reduce((n, load) => n + load.deliveries.length, 0);
  const unassigned = deliveries.filter((d) => d.status === 'SORTED').length - assigned;
  events.unshift({ at: new Date().toISOString(), type: 'optimizer.completed', entity: `${engine}:${loads.length}-loads` });
  res.json({ loads, unassigned, engine });
});

const transitionSchema = z.object({ status: z.enum(['ARRIVED', 'SORTED', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION']) });

app.post('/api/deliveries/:id/status', (req, res) => {
  const delivery = deliveries.find((d) => d.id === req.params.id);
  if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

  const parsed = transitionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid status' });

  const next = parsed.data.status as DeliveryStatus;
  if (!canTransition(delivery.status, next)) return res.status(409).json({ error: `Invalid transition ${delivery.status} -> ${next}` });

  delivery.status = next;
  events.unshift({ at: new Date().toISOString(), type: `delivery.${next.toLowerCase()}`, entity: delivery.id });
  res.json(delivery);
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`Logistics Control Tower API listening on http://localhost:${port}`));
