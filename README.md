# Logistics Control Tower

A full-stack logistics operations engineering demo built around common cross-dock and last-mile delivery problems: inbound package flow, geospatial grouping, outbound load optimization, delivery-state integrity, operational visibility, and failure-aware system design.

> Independent portfolio project. No proprietary Roadie systems, source code, APIs, or customer data are used.

## Why this project exists

The goal is to demonstrate the engineering concerns behind a modern logistics platform rather than build another generic CRUD dashboard. The demo focuses on end-to-end ownership across React tooling, backend APIs, distributed/async workflow patterns, geospatial logic, automated testing, and operational observability.

## Demo capabilities

- **Operations Control Tower** — live cross-dock metrics and delivery visibility
- **Miami geospatial network view** — simulated South Florida delivery points
- **Smart Load Builder** — groups sorted deliveries by proximity, priority, promise window, weight, and volume constraints
- **Delivery state machine** — guards operational transitions and prevents invalid backward movement
- **Event stream** — surfaces operational state changes and optimizer activity
- **System Health** — API, queue, datastore, failure, and latency indicators
- **Python optimization service** — FastAPI service for route/load grouping
- **TypeScript fallback optimizer** — keeps the demo functional if the Python service is unavailable
- **Automated tests** — domain rules, capacity constraints, and optimizer behavior
- **CircleCI pipeline** — test + build quality gate

## Architecture

```text
React + TypeScript
       |
       v
Node.js / TypeScript API
       |
  +----+-------------------+
  |                        |
  v                        v
PostgreSQL               Redis / Queue
                           |
                           v
                  Python FastAPI Optimizer
```

The local demo currently uses seeded operational data while the service boundaries are structured so Postgres/Redis-backed persistence and queue execution can be introduced without changing the UI contract.

## Event model

Representative events:

```text
delivery.arrived
delivery.sorted
load.optimization.requested
optimizer.completed
delivery.assigned
delivery.out_for_delivery
delivery.delivered
delivery.exception
```

## Tech stack

**Frontend:** React, TypeScript, Vite, Lucide

**API:** Node.js, TypeScript, Express, Zod

**Optimization:** Python, FastAPI, Pydantic, geospatial distance calculation

**Data / Messaging:** PostgreSQL, Redis-ready architecture, event-driven workflow patterns

**Testing / Delivery:** Vitest, CircleCI, Docker Compose

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

## Run tests

```bash
npm test
```

## Engineering decisions demonstrated

### Capacity-aware optimization

A load cannot exceed the assigned vehicle's weight or cubic-volume constraints. The optimizer prioritizes urgent deliveries first and then greedily selects geographically close feasible stops.

### Reliability over magic

The TypeScript API attempts to use the Python optimizer service, but falls back to an in-process TypeScript implementation if that dependency is unavailable. The UI can therefore remain available while preserving visibility into which engine handled the request.

### Explicit delivery-state integrity

Operational transitions are modeled as a state machine rather than arbitrary status edits. A delivered shipment cannot move backward; exceptions can follow an explicit recovery path.

### Observable operations

The demo exposes event activity, queue depth, failed-job count, and processing latency because production logistics systems need operator visibility, not just successful API responses.

## Next engineering passes

- Persist deliveries, loads, and events in PostgreSQL
- Move optimization requests onto Redis-backed workers with retry/idempotency semantics
- Add dead-letter queue controls and failed-job replay
- Add PostGIS/H3 geospatial indexing and cluster visualization
- Add WebSocket/SSE updates for live control-tower events
- Add load-test scenarios and performance budgets
- Add driver/vehicle capacity profiles and time-window SLA scoring
- Expand test suite around concurrency, duplicate events, and recovery paths

## Author

**Kohron Burton**  
Senior Full-Stack Engineer  
[kohronburton.com](https://kohronburton.com) · [LinkedIn](https://www.linkedin.com/in/kohronburton)
