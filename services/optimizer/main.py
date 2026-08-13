from __future__ import annotations

from math import asin, cos, radians, sin, sqrt
from typing import Literal
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="Logistics Load Optimizer", version="0.1.0")


class Delivery(BaseModel):
    id: str
    lat: float
    lng: float
    weightLbs: float = Field(ge=0)
    cubicFt: float = Field(ge=0)
    priority: Literal[1, 2, 3]
    promisedBy: str
    status: str


class Vehicle(BaseModel):
    id: str
    maxWeightLbs: float = Field(gt=0)
    maxCubicFt: float = Field(gt=0)


class OptimizeRequest(BaseModel):
    deliveries: list[Delivery]
    vehicles: list[Vehicle]


def distance_miles(a: Delivery, b: Delivery) -> float:
    radius = 3958.8
    d_lat = radians(b.lat - a.lat)
    d_lng = radians(b.lng - a.lng)
    h = sin(d_lat / 2) ** 2 + cos(radians(a.lat)) * cos(radians(b.lat)) * sin(d_lng / 2) ** 2
    return 2 * radius * asin(sqrt(h))


def optimize(payload: OptimizeRequest) -> list[dict]:
    candidates = sorted(
        [d for d in payload.deliveries if d.status == "SORTED"],
        key=lambda d: (d.priority, d.promisedBy),
    )
    remaining = {d.id: d for d in candidates}
    loads: list[dict] = []

    for vehicle in payload.vehicles:
        if not remaining:
            break

        route: list[Delivery] = []
        total_weight = 0.0
        total_volume = 0.0
        cursor = next(iter(remaining.values()))

        while remaining:
            feasible = [
                d
                for d in remaining.values()
                if total_weight + d.weightLbs <= vehicle.maxWeightLbs
                and total_volume + d.cubicFt <= vehicle.maxCubicFt
            ]
            if not feasible:
                break

            next_stop = min(feasible, key=lambda d: distance_miles(cursor, d))
            route.append(next_stop)
            remaining.pop(next_stop.id)
            total_weight += next_stop.weightLbs
            total_volume += next_stop.cubicFt
            cursor = next_stop

        if route:
            miles = sum(distance_miles(route[i - 1], route[i]) for i in range(1, len(route)))
            utilization = max(total_weight / vehicle.maxWeightLbs, total_volume / vehicle.maxCubicFt)
            loads.append(
                {
                    "id": f"PY-LOAD-{len(loads) + 1:02d}",
                    "vehicleId": vehicle.id,
                    "deliveryIds": [d.id for d in route],
                    "totalWeightLbs": round(total_weight, 1),
                    "totalCubicFt": round(total_volume, 1),
                    "utilizationPct": round(utilization * 100),
                    "estimatedMiles": round(miles, 1),
                }
            )

    return loads


@app.get("/health")
def health() -> dict:
    return {"service": "optimizer", "status": "healthy"}


@app.post("/optimize")
def optimize_endpoint(payload: OptimizeRequest) -> dict:
    loads = optimize(payload)
    assigned = sum(len(load["deliveryIds"]) for load in loads)
    sorted_count = sum(1 for d in payload.deliveries if d.status == "SORTED")
    return {"loads": loads, "unassigned": sorted_count - assigned}
