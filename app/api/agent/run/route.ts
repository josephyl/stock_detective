import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assessDiscrepancy } from "@/lib/stock-brain";

export async function POST() {
  try {
    const supabase = createAdminClient();
    const { data: discrepancies, error } = await supabase
      .from("discrepancies")
      .select("*")
      .eq("status", "open");

    if (error) throw error;

    let created = 0;
    let updated = 0;

    for (const discrepancy of discrepancies ?? []) {
      const assessment = await assessDiscrepancy(discrepancy);

      const { data: existing } = await supabase
        .from("agent_cases")
        .select("id")
        .eq("discrepancy_id", discrepancy.id)
        .maybeSingle();

      const payload = {
        discrepancy_id: discrepancy.id,
        finding: assessment.finding,
        likely_cause: assessment.likelyCause,
        business_impact: assessment.businessImpact,
        recommended_action: assessment.recommendedAction,
        agent_confidence: assessment.confidence,
        requires_human_approval: assessment.requiresHumanApproval,
        proposed_quantity: assessment.proposedQuantity,
        reasoning: assessment.reasoning,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error: updateError } = await supabase
          .from("agent_cases")
          .update(payload)
          .eq("id", existing.id);
        if (updateError) throw updateError;
        await supabase.from("agent_events").insert({
          agent_case_id: existing.id,
          event_type: "assessment_refreshed",
          detail: "Stock Brain refreshed its assessment from current evidence.",
        });
        updated++;
      } else {
        const { data: createdCase, error: createError } = await supabase
          .from("agent_cases")
          .insert(payload)
          .select("id")
          .single();
        if (createError) throw createError;
        await supabase.from("agent_events").insert([
          {
            agent_case_id: createdCase.id,
            event_type: "exception_detected",
            detail: "An open inventory or fulfilment exception triggered Stock Brain.",
          },
          {
            agent_case_id: createdCase.id,
            event_type: "recommendation_created",
            detail: assessment.recommendedAction,
          },
        ]);
        created++;
      }
    }

    return NextResponse.json({ ok: true, created, updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to run agent." },
      { status: 500 }
    );
  }
}
