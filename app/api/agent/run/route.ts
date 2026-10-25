import { NextResponse } from "next/server";
import { runStockBrainAgent } from "@/lib/agent-orchestrator";

export async function POST() {
  try {
    // Manual run deliberately refreshes existing open cases.
    const result = await runStockBrainAgent({ refreshExisting: true });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to run agent." },
      { status: 500 }
    );
  }
}
