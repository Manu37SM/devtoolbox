

export interface TransformResult {
  output: string;
  error: { message: string; line?: number; column?: number } | null;
}
