package main

import "testing"

func TestBalancedPlanWins(t *testing.T) {
  candidates := []Candidate{
    {ID:"preserve", Title:"Preserve Existing Routes", OnTime:76, Utilization:61, Acceptance:86, MarginIndex:1.00, ExceptionRisk:72},
    {ID:"sla", Title:"Prioritize SLA Only", OnTime:98, Utilization:58, Acceptance:72, MarginIndex:.84, ExceptionRisk:12},
    {ID:"balanced", Title:"Balanced Recovery", OnTime:94, Utilization:83, Acceptance:89, MarginIndex:1.06, ExceptionRisk:18},
  }
  got := recommend(candidates)
  if got.Recommended.ID != "balanced" { t.Fatalf("expected balanced, got %s", got.Recommended.ID) }
  if len(got.Recommended.Why) < 3 { t.Fatalf("expected explainable recommendation") }
}

func TestRankingIncludesAllCandidates(t *testing.T) {
  candidates := []Candidate{{ID:"a", OnTime:80, Utilization:70, Acceptance:70, MarginIndex:1, ExceptionRisk:30},{ID:"b", OnTime:90, Utilization:80, Acceptance:80, MarginIndex:1, ExceptionRisk:20}}
  got := recommend(candidates)
  if len(got.Ranked) != 2 { t.Fatalf("expected two ranked plans") }
  if got.Ranked[0].Score < got.Ranked[1].Score { t.Fatalf("expected descending score order") }
}
