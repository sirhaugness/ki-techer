import type { z } from 'zod';

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};
export type ToolCall = { id: string; name: string; arguments: unknown };
export type ProviderReply = {
  value?: unknown;
  calls: ToolCall[];
  conversation?: unknown[];
};
export type ModelPurpose = 'tutor' | 'fast' | 'reflect';
export type ModelRequest = {
  purpose: ModelPurpose;
  instructions: string;
  input: string;
  schema: z.ZodType;
  maxOutputTokens?: number;
  timeoutMs?: number;
  tools?: ToolDefinition[];
  conversation?: unknown[];
  results?: { call_id: string; output: string }[];
};
export type AiCall = {
  purpose: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_estimate: number;
  latency_ms: number;
  ok: boolean;
};
export type UniverseResearch = {
  interest: string;
  brief: string;
  sources: { title: string; url: string }[];
  researchedAt: string;
};
export interface AiProvider {
  respond(request: ModelRequest): Promise<ProviderReply>;
  moderate(text: string): Promise<boolean>;
  /** Public interest only; no learner data is submitted to web search. */
  research?(interest: string): Promise<UniverseResearch>;
}
// Deliberately conservative estimate, not an invoice. Pricing varies by model.
export function estimateCost(input: number, output: number): number {
  return (input * 100 + output * 400) / 1_000_000;
}
