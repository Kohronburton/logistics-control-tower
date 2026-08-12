# 60-Second Demo Walkthrough

This walkthrough is designed for a recruiter, hiring manager, or senior engineer who has limited time and wants to understand both the product behavior and the engineering behind it.

## Opening — 0:00 to 0:10

> "I built this as an independent logistics engineering demo around the problems in the role: React operations tooling, APIs, geospatial decisions, distributed workflows, reliability, and testing. It uses no proprietary Roadie systems or data."

Point to:

- Operations Control Tower
- Miami delivery network
- live event-stream indicator
- current optimizer engine

## Establish the baseline — 0:10 to 0:20

Point to the network-impact strip.

> "Instead of only showing a route, I calculate a simple comparison between independent hub round trips and capacity-aware multi-stop loads. That gives the operator visible before-and-after impact: travel, utilization, and SLA risk."

Click **Optimize Outbound Loads**.

Call out:

- baseline mileage
- optimized mileage
- miles avoided
- capacity utilization
- animated outbound route flows

## WOW moment — 0:20 to 0:45

Open **Resilience Lab · WOW Mode** and click **Vehicle Offline**.

> "The part I wanted to demonstrate is what happens when operations stop being ideal. Here I'm taking a cargo van offline. The API removes that capacity, re-runs optimization, updates the fleet and network KPIs, redraws the routes, and broadcasts the recovery sequence through Server-Sent Events."

Point to:

- fleet changing from 3/3 to 2/3
- scenario banner
- changed loads/routes
- updated optimization metrics
- live `fleet.vehicle_offline`, `load.optimization.requested`, `optimizer.completed`, and `network.rebalanced` events

Then briefly mention the other two scenarios:

- **Priority Surge** injects an urgent medical stop with a tight promise window.
- **Delivery Exception** moves an active stop out of normal optimization and into exception handling.

## Engineering finish — 0:45 to 1:00

Scroll to **System Health**.

> "The frontend is React/TypeScript. The API is Node/TypeScript with explicit delivery-state rules. Optimization is behind a service boundary: it prefers a Python/FastAPI service and falls back to TypeScript if that dependency is unavailable. I also included 23 domain regression tests plus CircleCI and GitHub Actions quality-gate definitions."

Close with:

> "The point wasn't to imitate Roadie's internal product. It was to show how I think about an operational logistics system end to end — product workflow, APIs, geospatial decisions, failure behavior, observability, and maintainability."

## If the interviewer wants to go deeper

### Why SSE instead of polling?

SSE keeps the control tower simple for server-to-client operational events. It is a good fit for one-way status/event updates, is browser-native, and avoids continuous polling. For high-scale bidirectional workflows, WebSockets or a managed pub/sub layer could be appropriate.

### Why Python plus TypeScript?

The optimizer is a separable computational workload. Keeping it behind an API boundary lets the platform use Python where data/optimization libraries are useful without coupling the React/API stack to Python. The TypeScript fallback demonstrates graceful degradation.

### Why not claim Postgres/Redis are already doing persistence/queues?

The Docker Compose environment provisions them to illustrate the intended boundary, but the demo intentionally keeps its operational state in memory. The README labels persistence and queue execution as production-evolution work rather than pretending those pieces are complete.

### What would you build next?

1. Persist delivery/load/event state in PostgreSQL.
2. Move optimization requests onto Redis/BullMQ or Kafka with idempotency, retries, and dead-letter handling.
3. Add PostGIS or H3 for geospatial indexing and clustering.
4. Add authenticated operator roles and audit trails.
5. Add load testing, tracing, SLOs, and container orchestration.
