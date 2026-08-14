# Cross-Dock Decision Engine

This candidate case study asks one operational question:

> A late inbound trailer threatens same-day delivery windows. Which recovery strategy best balances service level, crowdsourced driver supply, vehicle capacity, acceptance likelihood, cost, and exception risk?

## Important boundary

This is an independent engineering proof of concept. The scenario, scores, driver pool, costs, contribution indexes, and recovery outcomes are simulated. They are not Roadie production data, pricing, margins, algorithms, SLAs, or internal workflows.

## Simulated incident

- Trailer arrives 31 minutes late at a Miami-area cross-dock.
- 186 packages are waiting across 24 planned route batches.
- 37 crowdsourced drivers are modeled as available.
- 19 deliveries are projected at risk before intervention.
- Four planned batches have vehicle-capacity mismatches.
- Two time-critical deliveries require special consideration.

## Recovery strategies

### Preserve Existing Routes

Protects short-term stability and cost, but leaves substantial delivery-window exposure.

### Prioritize SLA Only

Protects the greatest number of deadlines, but uses capacity less efficiently and reduces modeled marketplace acceptance and contribution performance.

### Balanced Recovery

Rebuilds selected batches, prioritizes time-critical deliveries, adjusts driver-arrival windows, and uses available vehicle capacity more efficiently. In the simulated scenario it is the recommended plan because it removes most SLA exposure without paying disproportionately for the final few percentage points.

## Explainable scoring

The Go service under `services/recovery-go` ranks candidate plans with an intentionally simple weighted model:

```text
score =
  35% on-time projection
+ 20% vehicle utilization
+ 20% modeled driver acceptance
+ 15% illustrative contribution index
+ 10% inverse exception risk
```

The weights are demonstration assumptions, not a claim about Roadie's decision logic. The purpose is to make tradeoffs inspectable instead of hiding them behind an opaque recommendation.

## Why crowdsourced driver supply matters

The model treats drivers as independent marketplace capacity, not as a company-owned fleet. Eligibility and fit can consider factors such as proximity, vehicle capability, route direction, delivery window, and modeled acceptance likelihood.

## Production evolution

A production-grade version would replace the simulated values with authenticated internal services and observed data, then add schema-managed Kafka events, durable state, idempotent consumers, dead-letter handling, geospatial indexing, experiment controls, calibration monitoring, and audited decision explanations.
