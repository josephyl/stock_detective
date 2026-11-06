import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { message, discrepancy_id } = await request.json();
    const question = String(message ?? "").trim();
    const discrepancyId = String(discrepancy_id ?? "").trim();

    if (!question) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const supabase = createAdminClient();

    let caseQuery = supabase
      .from("agent_cases")
      .select("finding,likely_cause,business_impact,recommended_action,agent_confidence,status,proposed_quantity,discrepancy_id,discrepancies(discrepancy_type,severity,summary,confidence_score,details,canonical_products(name,sku))")
      .order("updated_at", { ascending: false })
      .limit(discrepancyId ? 1 : 20);

    if (discrepancyId) caseQuery = caseQuery.eq("discrepancy_id", discrepancyId);

    let discrepancyQuery = supabase
      .from("discrepancies")
      .select("id,discrepancy_type,severity,summary,confidence_score,status,details,canonical_products(name,sku)")
      .limit(discrepancyId ? 1 : 30);

    if (discrepancyId) {
      discrepancyQuery = discrepancyQuery.eq("id", discrepancyId);
    } else {
      discrepancyQuery = discrepancyQuery.eq("status", "open");
    }

    const [{ data: cases }, { data: discrepancies }] = await Promise.all([
      caseQuery,
      discrepancyQuery,
    ]);

    const context = {
      scope: discrepancyId ? "single_case" : "open_inventory",
      cases: cases ?? [],
      discrepancies: discrepancies ?? [],
    };

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL;

    if (!apiKey || !model) {
      const current = discrepancies?.[0] as any;
      const product = current?.canonical_products;
      return NextResponse.json({
        answer: current
          ? `${product?.name ?? "This product"}: ${current.summary}. Evidence trust is ${current.confidence_score}%. Review the source evidence and complete the recommended verification step before changing inventory.`
          : "There is not enough case evidence available to answer that question.",
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
            "You are Detective Agent, an inventory operations assistant. Answer only from the supplied StockDetective case data. Never invent quantities, shipment states, causes, dates, or evidence. Explain what the evidence supports, what remains uncertain, and what verification would resolve the uncertainty. Do not claim to have changed inventory or placed an order. Keep answers concise and case-specific.",
        },
        {
          role: "user",
          content: JSON.stringify({ question, context }),
        },
      ],
    });

    return NextResponse.json({
      answer: response.output_text || "I could not produce an answer from the available case evidence.",
      mode: "ai",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to answer." },
      { status: 500 }
    );
  }
}
