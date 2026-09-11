export interface CandidateEvidence { title?: number; artist?: number; album?: number; duration?: number; track?: number; year?: number; group?: number }
export interface ScoreContext { contradiction?: boolean; runnerUp?: number }
const WEIGHTS: Required<CandidateEvidence> = { title: 25, artist: 25, album: 20, duration: 10, track: 10, year: 5, group: 5 };
export function scoreCandidate(evidence: CandidateEvidence, context: ScoreContext = {}): { score: number; autoAccept: boolean; contributions: Record<string, number> } {
  const contributions = Object.fromEntries(Object.entries(WEIGHTS).map(([key, weight]) => [key, Math.round(weight * Math.max(0, Math.min(1, evidence[key as keyof CandidateEvidence] ?? 0)))]));
  const score = Object.values(contributions).reduce((sum, value) => sum + value, 0);
  const ambiguous = context.runnerUp !== undefined && score - context.runnerUp < 8;
  return { score, contributions, autoAccept: score >= 85 && !context.contradiction && !ambiguous };
}
