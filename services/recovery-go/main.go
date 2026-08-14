package main

import (
  "encoding/json"
  "log"
  "net/http"
  "os"
  "sort"
)

type Candidate struct {
  ID string `json:"id"`
  Title string `json:"title"`
  OnTime float64 `json:"onTime"`
  Utilization float64 `json:"utilization"`
  Acceptance float64 `json:"acceptance"`
  MarginIndex float64 `json:"marginIndex"`
  ExceptionRisk float64 `json:"exceptionRisk"`
}

type Request struct { Candidates []Candidate `json:"candidates"` }
type Scored struct { Candidate; Score float64 `json:"score"`; Why []string `json:"why"` }
type Response struct { Recommended Scored `json:"recommended"`; Ranked []Scored `json:"ranked"`; Model string `json:"model"`; Disclaimer string `json:"disclaimer"` }

func score(c Candidate) Scored {
  s := c.OnTime*.35 + c.Utilization*.20 + c.Acceptance*.20 + c.MarginIndex*100*.15 + (100-c.ExceptionRisk)*.10
  why := []string{}
  if c.OnTime >= 90 { why = append(why, "protects most delivery-window exposure") }
  if c.Utilization >= 80 { why = append(why, "keeps vehicle capacity productive") }
  if c.Acceptance >= 85 { why = append(why, "preserves stronger modeled driver acceptance") }
  if c.MarginIndex >= 1 { why = append(why, "protects the illustrative contribution index") }
  return Scored{Candidate:c, Score:s, Why:why}
}

func recommend(candidates []Candidate) Response {
  ranked := make([]Scored, 0, len(candidates))
  for _, c := range candidates { ranked = append(ranked, score(c)) }
  sort.SliceStable(ranked, func(i,j int) bool { return ranked[i].Score > ranked[j].Score })
  out := Response{Ranked:ranked, Model:"explainable-weighted-recovery-v1", Disclaimer:"Candidate proof of concept using simulated values; not a Roadie production algorithm or metric."}
  if len(ranked) > 0 { out.Recommended = ranked[0] }
  return out
}

func health(w http.ResponseWriter, _ *http.Request) {
  w.Header().Set("Content-Type", "application/json")
  _ = json.NewEncoder(w).Encode(map[string]string{"status":"healthy","service":"recovery-go"})
}

func recommendHTTP(w http.ResponseWriter, r *http.Request) {
  if r.Method != http.MethodPost { http.Error(w,"method not allowed",http.StatusMethodNotAllowed); return }
  var req Request
  if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.Candidates)==0 { http.Error(w,"invalid request",http.StatusBadRequest); return }
  w.Header().Set("Content-Type", "application/json")
  w.Header().Set("X-Correlation-ID", r.Header.Get("X-Correlation-ID"))
  _ = json.NewEncoder(w).Encode(recommend(req.Candidates))
}

func main() {
  mux := http.NewServeMux()
  mux.HandleFunc("/health", health)
  mux.HandleFunc("/recommend", recommendHTTP)
  port := os.Getenv("PORT"); if port=="" { port="8082" }
  log.Printf("recovery-go listening on :%s", port)
  log.Fatal(http.ListenAndServe(":"+port, mux))
}
