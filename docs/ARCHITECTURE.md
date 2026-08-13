# Architecture Notes

## Goals

The demo is optimized for three things:

1. Make the logistics workflow understandable in under a minute.
2. Demonstrate senior full-stack engineering concerns beyond CRUD.
3. Keep every production claim honest and inspectable in the repository.

## Runtime components

```text
┌──────────────────────────────────────────────┐
│ React / TypeScript Operations Control Tower │
│                                              │
│ dashboards · routes · scenarios · health    │
└───────────────┬──────────────────────────────┘
                │ REST + SSE
                v
┌──────────────────────────────────────────────┐
│ Node.js / TypeScript API                    │
│                                              │
│ state machine · scenarios · analytics       │
│ service orchestration · SSE fan-out         │
└──────────┬───────────────────────┬───────────┘
           │                       │
           │ preferred             │ graceful fallback
           v                       v
┌──────────────────────┐   ┌────────────────────────┐
│ Python / FastAPI     │   │ TypeScript Optimizer   │
│ Load Optimizer       │   │ In-process fallback    │
└──────────────────────┘   └────────────────────────┘

Local infrastructure available through Docker Compose:
PostgreSQL · Redis
```

## Domain model

### Delivery

A delivery carries:

- identifier
- destination coordinates
- package weight and cubic volume
- operational priority
- promised-delivery timestamp
- current status

### Delivery state machine

```text
ARRIVED ──> SORTED ──> ASSIGNED ──> OUT_FOR_DELIVERY ──> DELIVERED
   │           │           │                │
   └──────────>EXCEPTION<───┴────────────────┘
                  │
                  └────────> SORTED
```

The API refuses invalid transitions instead of allowing arbitrary status edits.

### Vehicle

Vehicles expose weight and cubic-volume capacity. The optimizer may only assign a delivery when both constraints remain feasible.

### Load

A load represents an ordered group of deliveries assigned to a vehicle with calculated:

- total weight
- total cubic volume
- utilization percentage
- estimated route mileage

## Optimization approach

This is intentionally a comprehensible heuristic rather than a claim to solve a production vehicle-routing problem optimally.

1. Filter to `SORTED` deliveries.
2. Sort by operational priority and promised-delivery time.
3. Seed a route with the most urgent eligible shipment.
4. Greedily choose the geographically closest next stop that fits remaining weight and volume capacity.
5. Repeat across available vehicles.

Distance uses the Haversine formula over latitude/longitude.

### Why this approach?

For a portfolio demo, the heuristic is easy to inspect, test, and discuss. A production routing system would likely introduce a richer cost function including traffic, stop/service time, time windows, driver constraints, pickup dependencies, facility capacity, and potentially an optimization solver.

## Network-impact analytics

The demo creates an understandable baseline by treating each sorted delivery as an independent round trip from the Doral hub. Optimized loads are compared against that baseline.

The dashboard reports:

- baseline mileage
- optimized route mileage
- miles avoided
- travel reduction percentage
- average load utilization
- number of deliveries within a three-hour promise window

These are scenario metrics from seeded data, not production benchmarks.

## Resilience Lab

Each incident starts from the same deterministic baseline.

### Priority Surge

Adds an urgent P1 medical delivery with a 66-minute promise window, then re-runs optimization.

### Vehicle Offline

Removes `VAN-07` from the fleet and rebalances work over remaining capacity.

### Delivery Exception

Moves an eligible delivery to `EXCEPTION`, removes it from optimization, and recomputes the network.

### Recovery flow

```text
incident injected
      │
      v
operational event published
      │
      v
optimization requested
      │
      v
Python service OR TypeScript fallback
      │
      v
new loads + analytics
      │
      v
network.rebalanced event
      │
      v
React UI updates routes, KPIs and event timeline
```

## Live events

The Node API exposes Server-Sent Events at `/api/events/stream`.

SSE was chosen because the demo needs lightweight one-way server-to-browser operational updates. It avoids polling and requires no client library. A multi-instance production design would put event fan-out behind shared pub/sub infrastructure and consider WebSockets where bidirectional communication is needed.

## Failure behavior

The API prefers the Python/FastAPI optimizer. If it cannot reach that service, it runs the TypeScript optimizer instead and exposes the active engine to the UI.

That makes degradation:

- visible
- deterministic
- recoverable
- non-magical

## Testing strategy

The current suite contains 23 domain regression cases covering:

- valid state transitions
- invalid state transitions
- exception recovery
- weight-capacity boundaries
- volume-capacity boundaries
- exact-capacity loads
- oversized deliveries
- filtering of non-eligible statuses
- unavailable fleet behavior
- priority ordering
- multi-vehicle distribution
- duplicate-assignment prevention
- load identifier stability
- route-mileage sanity
- input immutability

Both CircleCI and GitHub Actions run tests and compile/build the applications.

## Data and messaging boundary

PostgreSQL and Redis are available in Docker Compose, but the current demo does not pretend they are already backing runtime state. That is deliberate.

A production evolution would move:

- deliveries, vehicles, loads, and events into PostgreSQL
- optimization commands into Redis/BullMQ or Kafka
- retries/idempotency into worker semantics
- failed work into a dead-letter queue with operator replay
- location queries into PostGIS/H3 indexes

## Scaling path

For production scale:

- stateless API replicas behind a load balancer
- shared event broker/pub-sub for SSE/WebSocket fan-out
- durable job queue with idempotency keys
- Postgres read/write tuning and geospatial indexing
- containerized services under Kubernetes/ECS or equivalent
- OpenTelemetry traces and metrics
- SLOs for API latency, queue age, optimization duration, and delivery-event freshness
- load tests for burst ingestion and optimization pressure

## Security path

Production operations tooling would add:

- authenticated users
- role-based access control
- auditable operator actions
- service-to-service authentication
- secret management
- input/rate limiting
- tenant/customer data boundaries where applicable

## Design principle

The demo favors explicit engineering tradeoffs over hidden complexity. A reviewer should be able to understand what is implemented, what is simulated, what fails over, and what would change for production by reading the code and documentation.
