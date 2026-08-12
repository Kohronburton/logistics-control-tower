import { describe, expect, it } from 'vitest';
import { canTransition, optimizeLoads, type Delivery, type Vehicle } from './domain.js';

const vehicles: Vehicle[] = [{ id: 'V1', label: 'Van', maxWeightLbs: 100, maxCubicFt: 10 }];
const base: Delivery = {
  id: 'D1', customer: 'A', address: 'Miami, FL', lat: 25.76, lng: -80.19,
  weightLbs: 20, cubicFt: 2, priority: 1, promisedBy: new Date().toISOString(), status: 'SORTED'
};

describe('delivery state machine', () => {
  it('allows forward operational transitions', () => expect(canTransition('SORTED', 'ASSIGNED')).toBe(true));
  it('blocks delivered shipments from moving backward', () => expect(canTransition('DELIVERED', 'OUT_FOR_DELIVERY')).toBe(false));
  it('allows exception recovery back to sorted', () => expect(canTransition('EXCEPTION', 'SORTED')).toBe(true));
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

  it('reports bounded utilization', () => {
    const loads = optimizeLoads([{ ...base, weightLbs: 50, cubicFt: 5 }], vehicles);
    expect(loads[0].utilizationPct).toBeLessThanOrEqual(100);
  });
});
