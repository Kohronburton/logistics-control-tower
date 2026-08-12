# Logistics Control Tower

A full-stack logistics operations engineering demo built around common cross-dock and last-mile delivery problems: inbound package flow, geospatial grouping, outbound load optimization, delivery-state integrity, live operational events, and failure-aware system design.

> **Independent portfolio project.** No proprietary Roadie systems, source code, APIs, customer data, or internal workflows are used.

## The 60-second demo

1. Open the **Operations Control Tower** and show the Miami delivery network, current outbound loads, capacity utilization, SLA risk, and live event stream.
2. Click **Optimize Outbound Loads** to compare independent round-trip mileage with the optimized network and see the active optimizer engine.
3. Open **Resilience Lab · WOW Mode** and click **Vehicle Offline**. Cargo Van 07 disappears from available capacity, the network rebalances, route lines redraw, KPIs update, and recovery events arrive through Server-Sent Events.
4. Reset and try **Priority Surge** to inject an urgent medical delivery with a 66-minute promise window, or **Delivery Exception** to remove a problematic stop from optimization.
5. Finish on **System Health** and the automated test/CI setup to show that the demo is designed as an operational system, not just a dashboard mockup.

Detailed walkthrough: [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md)

## Why this project exists

The goal is to demonstrate the engineering concerns behind a modern logistics platform rather than build another CRUD dashboard. The project focuses on end-to-end ownership across React tooling, backend APIs, service boundaries, geospatial logic, resilient optimization, automated testing, CI/CD, and operational observability.

## What makes it different

### Resilience Lab

The control tower can inject deterministic operational incidents and then recover from them:

- **Priority Surge** — adds an urgent medical delivery with a tight promise window.
- **Vehicle Offline** — removes outbound capacity and forces load redistribution.
- **Delivery Exception** — removes an active stop from optimization and sends it to exception handling.
- **Reset Baseline** — restores the same starting state so each scenario can be demonstrated repeatedly.

Each scenario triggers re-optimization, recomputes network impact, redraws route flows, and publishes operational events in real time.

### Measurable optimization impact

The UI shows a before/after comparison between independent hub round trips and optimized multi-stop loads:

- baseline dispatch mileage
- optimized network mileage
- miles avoided
- percentage travel reduction
- average vehicle utilization
- deliveries approaching their SLA/promise window

These are demonstration metrics generated from the seeded scenario data, not claims about Roadie production performance.

### Live event-driven UX

The API exposes a Server-Sent Events stream at `/api/events/stream`. The React control tower listens for operational changes such as:

```text
scenario.priority_surge
fleet.vehicle_offline
delivery.exception
load.optimization.requested
optimizer.completed
network.rebalanced
```

The event panel updates without polling while the rest of the state remains retrievable through `/api/state`.

### Dual-engine optimization

The TypeScript API calls a Python/FastAPI optimization service when available. If that dependency is unavailable, it falls back to the in-process TypeScript optimizer so the core workflow remains demonstrable and observable.

```text
React + TypeScript Control Tower
              |
              v
      Node.js / TypeScript API
         |          |        \
         |          |         +--> SSE live event stream
         |          |
         |          +--> TypeScript fallback optimizer
         |
         +--> Python / FastAPI optimizer

Supporting local services: PostgreSQL + Redis via Docker Compose
```

> The current demo uses seeded in-memory operational state. PostgreSQL and Redis are provisioned locally to show the intended service boundary, but persistence and queue execution are intentionally listed as production-evolution work rather than represented as already implemented.

More detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Core capabilities

- **Operations Control Tower** — cross-dock metrics, delivery visibility, fleet status, and optimization impact
- **Animated Miami network view** — simulated South Florida delivery points and outbound route flows
- **Smart Load Builder** — groups sorted deliveries by capacity, urgency, promise window, and proximity
- **Resilience Lab** — repeatable operational incident simulation with automatic network recovery
- **Delivery state machine** — protects valid operational transitions
- **Live SSE event stream** — broadcasts optimizer, scenario, delivery, and recovery events
- **System health view** — API, queue indicator, datastore readiness, fleet availability, processing latency, event stream, and optimizer engine
- **Python optimization service** — FastAPI/Pydantic service for route/load grouping
- **TypeScript fallback optimizer** — graceful degradation if the Python service is unavailable
- **23 domain regression tests** — state transitions, capacity boundaries, prioritization, duplicate prevention, fleet constraints, and input integrity
- **CircleCI + GitHub Actions definitions** — independent test/build quality gates
- **Docker Compose** — local Postgres, Redis, and Python optimizer services

## Technology

**Frontend:** React, TypeScript, Vite, Lucide

**API:** Node.js, TypeScript, Express, Zod, Server-Sent Events

**Optimization:** Python, FastAPI, Pydantic, Haversine geospatial distance calculation

**Data / Messaging direction:** PostgreSQL, Redis, event-driven workflow patterns

**Testing / Delivery:** Vitest, CircleCI, GitHub Actions, Docker Compose

## Run locally

### 1. Install JavaScript dependencies

```bash
npm install
```

### 2. Start supporting services

```bash
docker compose up -d
```

This starts Postgres, Redis, and the Python optimization service.

### 3. Start the API and React app

```bash
npm run dev
```

Open:

- Control Tower: `http://localhost:5173`
- API: `http://localhost:4000`
- Python optimizer docs: `http://localhost:8001/docs`

## Quality checks

```bash
npm test
npm run build
```

The repository defines **23 domain test cases** across the delivery state machine and load optimizer. Both CI definitions run the test suite and build both applications as quality gates.

## Engineering decisions demonstrated

### Capacity-aware optimization

A load cannot exceed the assigned vehicle's weight or cubic-volume constraints. The optimizer starts with urgent work and then chooses geographically close feasible stops.

### Graceful degradation

Optimization is separated behind a service boundary. The API prefers the Python service but can fall back to the TypeScript implementation. The active engine is visible in the control tower so degradation is explicit rather than silent.

### Explicit delivery-state integrity

Operational transitions are modeled as a state machine rather than arbitrary status edits. Delivered shipments cannot move backward, and exception recovery follows an explicit path.

### Repeatable incident simulation

Each Resilience Lab scenario starts from a known baseline before the incident is applied. This keeps before/after comparisons deterministic and makes the demo easy to reproduce in an interview.

### Observable operations

The UI exposes event activity, fleet availability, queue indicators, failure count, processing latency, optimization impact, and the active optimizer engine because production logistics systems need operator visibility in addition to successful API responses.

## Production evolution

The demo intentionally keeps some infrastructure lightweight so the engineering concepts remain easy to run and review. A production evolution would include:

- PostgreSQL persistence for deliveries, loads, vehicles, and events
- Redis/BullMQ or Kafka-backed asynchronous optimization jobs with idempotency and retry semantics
- dead-letter queues and operator replay controls
- PostGIS/H3 geospatial indexing and route/cluster queries
- authenticated role-based operations tooling
- WebSocket/SSE fan-out infrastructure for multi-instance deployment
- distributed tracing, structured metrics, SLOs, and alerting
- container orchestration and autoscaling
- integration/load testing and performance budgets

## Repository guide

```text
apps/web/                  React control tower
apps/api/                  TypeScript API + domain rules + tests
services/optimizer/        Python/FastAPI optimization service
.circleci/                 CircleCI quality gate
.github/workflows/         GitHub Actions quality gate
docs/                      architecture + recruiter demo walkthrough
docker-compose.yml         local supporting services
```

## Author

**Kohron Burton**  
Senior Full-Stack Engineer  
[kohronburton.com](https://kohronburton.com) · [LinkedIn](https://www.linkedin.com/in/kohronburton)
