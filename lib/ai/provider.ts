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
export type ModelPurpose =
  | 'tutor'
  | 'fast'
  | 'reflect'
  | 'story-generate'
  | 'story-review'
  | 'help'
  | 'feedback'
  | 'explanation'
  | 'contextualize';
export type AiUsageContext = { sessionId?: string; chapterNumber?: number };
export type ModelRequest = {
  purpose: ModelPurpose;
  instructions: string;
  input: string;
  schema: z.ZodType;
  maxOutputTokens?: number;
  timeoutMs?: number;
  reasoningEffort?: 'low' | 'medium' | 'high';
  tools?: ToolDefinition[];
  conversation?: unknown[];
  results?: { call_id: string; output: string }[];
};
export type AiCall = {
  chapter_job_id?: string;
  purpose: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_estimate: number;
  latency_ms: number;
  ok: boolean;
  usage_known?: boolean;
  session_id?: string | null;
  chapter_number?: number | null;
  pricing_version?: string;
  environment?: string;
};
export type UniverseResearch = {
  interest: string;
  brief: string;
  sources: { title: string; url: string }[];
  researchedAt: string;
};
export interface AiProvider {
  usage?: AiUsageContext;
  respond(request: ModelRequest): Promise<ProviderReply>;
  moderate(text: string): Promise<boolean>;
  /** Public interest only; no learner data is submitted to web search. */
  research?(interest: string): Promise<UniverseResearch>;
}
export { estimateCost } from './pricing';
