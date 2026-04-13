import type { APIRoute } from "astro";
import { getDB, getRoomPricing, setRoomPricing } from "../../../../lib/db";
import { checkAuth } from "../../../../lib/auth";

export const GET: APIRoute = async (context) => {
  const id = Number(context.params.id);
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const db = getDB(context.locals);
  const tiers = await getRoomPricing(db, id);
  return Response.json(tiers);
};

export const PUT: APIRoute = async (context) => {
  const unauth = await checkAuth(context);
  if (unauth) return unauth;

  const id = Number(context.params.id);
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { tiers, overtime_rate } = body;

  if (!Array.isArray(tiers)) {
    return Response.json({ error: "tiers harus berupa array" }, { status: 400 });
  }

  for (const tier of tiers) {
    if (
      typeof tier !== "object" ||
      tier === null ||
      typeof tier.hours !== "number" ||
      typeof tier.price !== "number" ||
      tier.hours <= 0 ||
      tier.price < 0
    ) {
      return Response.json(
        { error: "Setiap tier harus memiliki hours (> 0) dan price (>= 0)" },
        { status: 400 },
      );
    }
  }

  const db = getDB(context.locals);

  const room = await db.prepare("SELECT id FROM rooms WHERE id = ?").bind(id).first();
  if (!room) return Response.json({ error: "Not found" }, { status: 404 });

  // Update overtime_rate on room if provided
  if (overtime_rate !== undefined) {
    await db
      .prepare("UPDATE rooms SET overtime_rate = ? WHERE id = ?")
      .bind(Number(overtime_rate), id)
      .run();
  }

  await setRoomPricing(db, id, tiers as { hours: number; price: number; sort_order: number }[]);

  const updated = await getRoomPricing(db, id);
  return Response.json(updated);
};
