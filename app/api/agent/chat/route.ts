import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    const question = String(message ?? "").trim();
    if (!question) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const [{ data: cases }, { data: discrepancies }] = await Promise.all([
      supabase
        .from("agent_cases")
        .select("finding,likely_cause,business_impact,recommended_action,agent_confidence,status,proposed_quantity,discrepancies(discrepancy_type,severity,canonical_products(name,sku))")
        .order("updated_at", { ascending: false })
        .limit(20),
      supabase
        .from("discrepancies")
        .select("discrepancy_type,severity,summary,confidence_score,status,canonical_products(name,sku)")
        .eq("status", "open")
        .limit(30),
    ]);

    const context = { cases: cases ?? [], open_discrepancies: discrepancies ?? [] };
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL;

    if (!apiKey || !model) {
      const open = discrepancies ?? [];
      const top = open.slice(0, 3).map((d: any) => {
        const p = d.canonical_products as any;
        return `${p?.name ?? "Product"} (${p?.sku ?? "SKU"}): ${d.summary}`;
      });
      return NextResponse.json({
        answer:
          open.length === 0
            ? "There are no open inventory exceptions right now."
            : `There are ${open.length} open exception(s). Highest-priority current evidence includes: ${top.join(" | ")}. Open Stock Brain for the recommended actions and approval steps.`,
        mode: "deterministic",
      });
    }

    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model,
      input: [
        {
          role: "system",
          content:
            "You are Stock Brain, an inventory operations agent. Answer only from the supplied StockTrust data. Never invent quantities, shipment states or causes. If the data cannot answer the question, say so and recommend the appropriate verification step. You may explain, summarise and recommend, but you may not claim to have changed inventory or placed an order. Keep answers concise.",
        },
        {
          role: "user",
          content: JSON.stringify({ question, context }),
        },
      ],
    });

    return NextResponse.json({
      answer: response.output_text || "I could not produce an answer from the available evidence.",
      mode: "ai",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to answer." },
      { status: 500 }
    );
  }
}
