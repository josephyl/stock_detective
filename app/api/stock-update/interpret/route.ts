import { NextResponse } from "next/server";
import OpenAI from "openai";

function cleanJson(text: string) {
  return text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
}

function fallbackFromText(text: string) {
  const quantityMatch = text.match(/(?:count|quantity|qty|stock|have|is|to)\s*(?:of|=|:)?\s*(\d+)/i) || text.match(/\b(\d+)\b/);
  const skuMatch = text.match(/\b[A-Z0-9]{2,}(?:-[A-Z0-9]+){1,}\b/i);
  return {
    sku: skuMatch?.[0]?.toUpperCase() ?? "",
    quantity: quantityMatch ? Number(quantityMatch[1]) : null,
    location: "Main Warehouse",
    note: text.trim(),
  };
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Photo is required." }, { status: 400 });
      }
      if (!apiKey || !model) {
        return NextResponse.json({ error: "AI vision is not configured. Enter the SKU and quantity manually instead." }, { status: 400 });
      }

      const bytes = Buffer.from(await file.arrayBuffer());
      const dataUrl = `data:${file.type || "image/jpeg"};base64,${bytes.toString("base64")}`;
      const client = new OpenAI({ apiKey });
      const response = await client.responses.create({
        model,
        input: [
          {
            role: "system",
            content: "You extract stock-count evidence from a warehouse photo. Never guess a SKU or quantity that is not visible or strongly supported. Return only JSON with keys sku, quantity, location, note. quantity must be an integer or null.",
          },
          {
            role: "user",
            content: [
              { type: "input_text", text: "Extract the SKU and counted quantity from this stock photo. If uncertain, leave the field blank/null and explain uncertainty briefly in note." },
              { type: "input_image", image_url: dataUrl },
            ],
          },
        ],
      } as any);
      const parsed = JSON.parse(cleanJson(response.output_text || "{}"));
      return NextResponse.json({
        ok: true,
        extracted: {
          sku: String(parsed.sku ?? "").toUpperCase(),
          quantity: Number.isInteger(Number(parsed.quantity)) ? Number(parsed.quantity) : null,
          location: String(parsed.location ?? "Main Warehouse"),
          note: String(parsed.note ?? "Extracted from photo evidence."),
        },
      });
    }

    const body = await request.json();
    const transcript = String(body.transcript ?? "").trim();
    if (!transcript) return NextResponse.json({ error: "Transcript is required." }, { status: 400 });
    const fallback = fallbackFromText(transcript);
    if (!apiKey || !model) return NextResponse.json({ ok: true, extracted: fallback, mode: "deterministic" });

    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model,
      input: [
        {
          role: "system",
          content: "Extract a warehouse stock update from the user transcript. Never invent missing values. Return only JSON with keys sku, quantity, location, note. quantity must be an integer or null.",
        },
        { role: "user", content: transcript },
      ],
    } as any);
    const parsed = JSON.parse(cleanJson(response.output_text || "{}"));
    return NextResponse.json({
      ok: true,
      extracted: {
        sku: String(parsed.sku || fallback.sku || "").toUpperCase(),
        quantity: Number.isInteger(Number(parsed.quantity)) ? Number(parsed.quantity) : fallback.quantity,
        location: String(parsed.location || fallback.location),
        note: String(parsed.note || fallback.note),
      },
      mode: "ai",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to interpret update." }, { status: 500 });
  }
}
