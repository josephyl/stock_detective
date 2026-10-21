import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const caseId = String(body.case_id ?? "");
    const action = String(body.action ?? "");
    const actor = String(body.actor ?? "Demo user");

    if (!caseId || !["approve", "reject", "investigate"].includes(action)) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: agentCase, error } = await supabase
      .from("agent_cases")
      .select("*, discrepancies(*)")
      .eq("id", caseId)
      .single();
    if (error || !agentCase) {
      return NextResponse.json({ error: "Agent case not found." }, { status: 404 });
    }

    const status =
      action === "approve" ? "approved" : action === "reject" ? "rejected" : "investigate";

    await supabase
      .from("agent_cases")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", caseId);

    await supabase.from("agent_events").insert({
      agent_case_id: caseId,
      event_type:
        action === "approve"
          ? "human_approved"
          : action === "reject"
          ? "human_rejected"
          : "manual_investigation_requested",
      actor,
      detail: String(body.notes ?? "") || null,
    });

    if (action === "approve" && Number.isInteger(agentCase.proposed_quantity)) {
      const discrepancy = agentCase.discrepancies;
      await supabase.from("resolutions").insert({
        discrepancy_id: discrepancy.id,
        verified_quantity: agentCase.proposed_quantity,
        method: "Stock Brain proposal + human approval",
        notes: "Human approved the agent recommendation after reviewing source evidence.",
        resolved_by: actor,
      });
      await supabase
        .from("discrepancies")
        .update({ status: "resolved", updated_at: new Date().toISOString() })
        .eq("id", discrepancy.id);
      await supabase
        .from("agent_cases")
        .update({ status: "resolved", updated_at: new Date().toISOString() })
        .eq("id", caseId);
      await supabase.from("agent_events").insert({
        agent_case_id: caseId,
        event_type: "case_resolved",
        actor,
        detail: `Approved reconciled quantity: ${agentCase.proposed_quantity} units.`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to record action." },
      { status: 500 }
    );
  }
}
