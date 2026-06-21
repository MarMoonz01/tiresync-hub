// Shared Claude wrapper: makes the Anthropic call AND logs every call into
// public.agent_usage_log for per-store cost tracking. Route ALL agent Claude
// calls through callClaude() so logging happens in exactly one place.
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.1";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// USD per 1M tokens. Source: Claude API pricing (cached 2026-06-04).
// Keep in sync with whatever model the agents actually call.
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-opus-4-8": { input: 5.0, output: 25.0 },
  "claude-fable-5": { input: 10.0, output: 50.0 },
};

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

export interface CallClaudeArgs {
  db: SupabaseClient;
  storeId: string;
  agentName: string;
  maxTokens: number;
  messages: { role: "user" | "assistant"; content: string }[];
  model?: string;
  system?: string;
}

/**
 * Call Claude and record the spend in agent_usage_log. Returns the raw Anthropic
 * Message so callers keep their existing content/usage handling. Logging never
 * throws — a logging failure must not break the agent.
 */
export async function callClaude(args: CallClaudeArgs) {
  const model = args.model ?? DEFAULT_MODEL;
  const anthropic = new Anthropic({ apiKey: Deno.env.get("CLAUDE_API_KEY")! });

  const response = await anthropic.messages.create({
    model,
    max_tokens: args.maxTokens,
    ...(args.system ? { system: args.system } : {}),
    messages: args.messages,
  });

  const inTok = response.usage?.input_tokens ?? 0;
  const outTok = response.usage?.output_tokens ?? 0;
  const price = PRICING[model] ?? PRICING[DEFAULT_MODEL];
  const costUsd = (inTok / 1e6) * price.input + (outTok / 1e6) * price.output;

  try {
    await args.db.from("agent_usage_log").insert({
      store_id: args.storeId,
      agent_name: args.agentName,
      tokens: inTok + outTok,
      cost_usd: Number(costUsd.toFixed(6)),
    });
  } catch (e) {
    console.error("agent_usage_log insert failed:", e);
  }

  return response;
}
