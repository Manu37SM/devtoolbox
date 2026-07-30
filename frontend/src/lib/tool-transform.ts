// Shared transform result shape used by every tool's transform.ts, per
// CLAUDE.md "extract shared sub-problem" working-style rule — avoids each
// tool redeclaring the same { output, error } contract.
export interface TransformResult {
  output: string;
  error: { message: string; line?: number; column?: number } | null;
}
