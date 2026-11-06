import { runStockBrainAgent, type AgentProgressEvent } from "@/lib/agent-orchestrator";

export const dynamic = "force-dynamic";

export async function POST() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AgentProgressEvent | { stage: "error"; title: string; detail: string }) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        await runStockBrainAgent({
          refreshExisting: true,
          onProgress: async (event) => send(event),
        });
      } catch (error) {
        send({
          stage: "error",
          title: "Investigation stopped",
          detail: error instanceof Error ? error.message : "Unable to run Detective Agent.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
