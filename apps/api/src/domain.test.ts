import { describe, expect, it } from 'vitest';
import { canTransition, optimizeLoads, type Delivery, type Vehicle } from './domain.js';

const vehicles: Vehicle[] = [{ id: 'V1', label: 'Van', maxWeightLbs: 100, maxCubicFt: 10 }];
const base: Delivery = {
  id: 'D1', customer: 'A', address: 'Miami, FL', lat: 25.76, lng: -80.19,
  weightLbs: 20, cubicFt: 2, priority: 1, promisedBy: new Date().toISOString(), status: 'SORTED'
};

describe('delivery state machine', () => {
  it('allows arrived deliveries to be sorted', () => expect(canTransition('ARRIVED', 'SORTED')).toBe(true));
  it('blocks arrived deliveries from skipping directly to delivered', () => expect(canTransition('ARRIVED', 'DELIVERED')).toBe(false));
  it('allows sorted deliveries to be assigned', () => expect(canTransition('SORTED', 'ASSIGNED')).toBe(true));
  it('allows assigned deliveries to leave for delivery', () => expect(canTransition('ASSIGNED', 'OUT_FOR_DELIVERY')).toBe(true));
  it('allows out-for-delivery shipments to complete', () => expect(canTransition('OUT_FOR_DELIVERY', 'DELIVERED')).toBe(true));
  it('blocks delivered shipments from moving backward', () => expect(canTransition('DELIVERED', 'OUT_FOR_DELIVERY')).toBe(false));
  it('allows exception recovery back to sorted', () => expect(canTransition('EXCEPTION', 'SORTED')).toBe(true));
  it('blocks exception shipments from jumping directly to delivered', () => expect(canTransition('EXCEPTION', 'DELIVERED')).toBe(false));
});

describe('load optimizer', () => {
  it('respects vehicle weight capacity', () => {
    const loads = optimizeLoads([{ ...base }, { ...base, id: 'D2', weightLbs: 90 }], vehicles);
    expect(loads[0].totalWeightLbs).toBeLessThanOrEqual(100);
  });

  it('respects vehicle volume capacity', () => {
    const loads = optimizeLoads([{ ...base }, { ...base, id: 'D2', cubicFt: 9 }], vehicles);
    expect(loads[0].totalCubicFt).toBeLessThanOrEqual(10);
  });

  it('only optimizes sorted deliveries', () => {
    const loads = optimizeLoads([{ ...base, status: 'ARRIVED' }], vehicles);
    expect(loads).toHaveLength(0);
  });

  it('ignores exception deliveries', () => {
    const loads = optimizeLoads([{ ...base, status: 'EXCEPTION' }], vehicles);
    expect(loads).toHaveLength(0);
  });

  it('ignores already delivered shipments', () => {
    const loads = optimizeLoads([{ ...base, status: 'DELIVERED' }], vehicles);
    expect(loads).toHaveLength(0);
  });

  it('reports bounded utilization', () => {
    const loads = optimizeLoads([{ ...base, weightLbs: 50, cubicFt: 5 }], vehicles);
    expect(loads[0].utilizationPct).toBeLessThanOrEqual(100);
  });

  it('accepts a load that exactly matches capacity', () => {
    const loads = optimizeLoads([{ ...base, weightLbs: 100, cubicFt: 10 }], vehicles);
    expect(loads[0].totalWeightLbs).toBe(100);
    expect(loads[0].totalCubicFt).toBe(10);
    expect(loads[0].utilizationPct).toBe(100);
  });

  it('leaves an oversized shipment unassigned', () => {
    const loads = optimizeLoads([{ ...base, weightLbs: 101 }], vehicles);
    expect(loads).toHaveLength(0);
  });

  it('returns no loads when no vehicles are available', () => {
    expect(optimizeLoads([{ ...base }], [])).toHaveLength(0);
  });

  it('starts with the highest-priority eligible shipment', () => {
    const lowerPriority = { ...base, id: 'D3', priority: 3 as const, lat: 25.761, lng: -80.191 };
    const urgent = { ...base, id: 'D2', priority: 1 as const, lat: 25.90, lng: -80.30 };
    const loads = optimizeLoads([lowerPriority, urgent], vehicles);
    expect(loads[0].deliveries[0].id).toBe('D2');
  });

  it('uses multiple vehicles when a single vehicle cannot hold all work', () => {
    const fleet: Vehicle[] = [
      { id: 'V1', label: 'Van 1', maxWeightLbs: 100, maxCubicFt: 10 },
      { id: 'V2', label: 'Van 2', maxWeightLbs: 100, maxCubicFt: 10 }
    ];
    const work = [
      { ...base, id: 'D1', weightLbs: 60 },
      { ...base, id: 'D2', weightLbs: 60 },
      { ...base, id: 'D3', weightLbs: 60 }
    ];
    expect(optimizeLoads(work, fleet)).toHaveLength(2);
  });

  it('never assigns one delivery to two loads', () => {
    const fleet: Vehicle[] = [
      { id: 'V1', label: 'Van 1', maxWeightLbs: 70, maxCubicFt: 10 },
      { id: 'V2', label: 'Van 2', maxWeightLbs: 70, maxCubicFt: 10 },
      { id: 'V3', label: 'Van 3', maxWeightLbs: 70, maxCubicFt: 10 }
    ];
    const work = [
      { ...base, id: 'D1', weightLbs: 60 },
      { ...base, id: 'D2', weightLbs: 60 },
      { ...base, id: 'D3', weightLbs: 60 }
    ];
    const ids = optimizeLoads(work, fleet).flatMap((load) => load.deliveries.map((delivery) => delivery.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('generates stable human-readable load identifiers', () => {
    const fleet: Vehicle[] = [
      { id: 'V1', label: 'Van 1', maxWeightLbs: 25, maxCubicFt: 3 },
      { id: 'V2', label: 'Van 2', maxWeightLbs: 25, maxCubicFt: 3 }
    ];
    const loads = optimizeLoads([{ ...base, id: 'D1' }, { ...base, id: 'D2' }], fleet);
    expect(loads.map((load) => load.id)).toEqual(['LOAD-01', 'LOAD-02']);
  });

  it('never reports negative route mileage', () => {
    const loads = optimizeLoads([{ ...base }, { ...base, id: 'D2', lat: 25.80, lng: -80.25 }], vehicles);
    expect(loads[0].estimatedMiles).toBeGreaterThanOrEqual(0);
  });

  it('does not mutate the input delivery collection', () => {
    const input = [{ ...base }, { ...base, id: 'D2', priority: 2 as const }];
    const snapshot = JSON.stringify(input);
    optimizeLoads(input, vehicles);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
