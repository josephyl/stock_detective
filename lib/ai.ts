import "server-only";
import OpenAI from "openai";

type ExplainInput = {
  productName: string;
  sku: string;
  discrepancyType: string;
  summary: string;
  details: unknown;
};

export async function explainDiscrepancy(input: ExplainInput) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  if (!apiKey || !model) {
    return deterministicExplanation(input);
  }

  const client = new OpenAI({ apiKey });

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "You are an inventory reliability assistant for a small retailer. Explain evidence conservatively. Never claim a cause is certain unless the data proves it. Never invent a stock quantity. Recommend one or two concrete verification steps. Keep the answer under 120 words.",
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
  });

  return response.output_text || deterministicExplanation(input);
}

function deterministicExplanation(input: ExplainInput) {
  const details = input.details as {
    sources?: Array<{ source: string; quantity: number; updated_at: string }>;
    stale_sources?: string[];
  };

  const sources = details.sources ?? [];
  const stale = details.stale_sources ?? [];

  const sourceText = sources
    .map((s) => `${s.source}: ${s.quantity}`)
    .join(", ");

  const staleText = stale.length
    ? ` ${stale.join(", ")} also appears stale relative to the configured freshness threshold.`
    : "";

  return `The current sources do not provide a fully consistent inventory picture for ${input.productName} (${input.sku}). ${sourceText}.${staleText} Check recent stock movements and the most recent successful sync, then verify physically if the records still cannot be reconciled.`;
}
