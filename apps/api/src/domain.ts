export type DeliveryStatus = 'ARRIVED' | 'SORTED' | 'ASSIGNED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'EXCEPTION';

export type Delivery = {
  id: string;
  customer: string;
  address: string;
  lat: number;
  lng: number;
  weightLbs: number;
  cubicFt: number;
  priority: 1 | 2 | 3;
  promisedBy: string;
  status: DeliveryStatus;
};

export type Vehicle = {
  id: string;
  label: string;
  maxWeightLbs: number;
  maxCubicFt: number;
};

export type Load = {
  id: string;
  vehicleId: string;
  deliveries: Delivery[];
  totalWeightLbs: number;
  totalCubicFt: number;
  utilizationPct: number;
  estimatedMiles: number;
};

const distanceMiles = (a: Delivery, b: Delivery) => {
  const R = 3958.8;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const aa = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(aa));
};

export function canTransition(from: DeliveryStatus, to: DeliveryStatus) {
  const allowed: Record<DeliveryStatus, DeliveryStatus[]> = {
    ARRIVED: ['SORTED', 'EXCEPTION'],
    SORTED: ['ASSIGNED', 'EXCEPTION'],
    ASSIGNED: ['OUT_FOR_DELIVERY', 'EXCEPTION'],
    OUT_FOR_DELIVERY: ['DELIVERED', 'EXCEPTION'],
    DELIVERED: [],
    EXCEPTION: ['SORTED']
  };
  return allowed[from].includes(to);
}

export function optimizeLoads(deliveries: Delivery[], vehicles: Vehicle[]): Load[] {
  const candidates = [...deliveries]
    .filter((d) => d.status === 'SORTED')
    .sort((a, b) => a.priority - b.priority || new Date(a.promisedBy).getTime() - new Date(b.promisedBy).getTime());

  const remaining = new Map(candidates.map((d) => [d.id, d]));
  const loads: Load[] = [];

  for (const vehicle of vehicles) {
    if (!remaining.size) break;

    const seed = [...remaining.values()][0];
    const route: Delivery[] = [];
    let weight = 0;
    let volume = 0;
    let cursor = seed;

    while (remaining.size) {
      const options = [...remaining.values()]
        .filter((d) => weight + d.weightLbs <= vehicle.maxWeightLbs && volume + d.cubicFt <= vehicle.maxCubicFt)
        .sort((a, b) => distanceMiles(cursor, a) - distanceMiles(cursor, b));

      if (!options.length) break;
      const next = options[0];
      route.push(next);
      remaining.delete(next.id);
      weight += next.weightLbs;
      volume += next.cubicFt;
      cursor = next;
    }

    if (route.length) {
      let estimatedMiles = 0;
      for (let i = 1; i < route.length; i++) estimatedMiles += distanceMiles(route[i - 1], route[i]);
      const weightPct = weight / vehicle.maxWeightLbs;
      const volumePct = volume / vehicle.maxCubicFt;
      loads.push({
        id: `LOAD-${String(loads.length + 1).padStart(2, '0')}`,
        vehicleId: vehicle.id,
        deliveries: route,
        totalWeightLbs: Number(weight.toFixed(1)),
        totalCubicFt: Number(volume.toFixed(1)),
        utilizationPct: Math.round(Math.max(weightPct, volumePct) * 100),
        estimatedMiles: Number(estimatedMiles.toFixed(1))
      });
    }
  }

  return loads;
}
