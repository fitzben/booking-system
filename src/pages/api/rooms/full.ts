import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';

export const GET: APIRoute = async ({ locals }) => {
  const db = getDB(locals);

  const { results: rooms } = await db
    .prepare('SELECT * FROM rooms ORDER BY id')
    .all();

  if (!rooms.length) return Response.json([]);

  const roomIds = (rooms as any[]).map((r) => r.id);
  const placeholders = roomIds.map(() => '?').join(',');

  const { results: allTiers } = await db
    .prepare(
      `SELECT * FROM room_pricing
       WHERE room_id IN (${placeholders})
       ORDER BY room_id, hours ASC`,
    )
    .bind(...roomIds)
    .all();

  const { results: allMedia } = await db
    .prepare(
      `SELECT * FROM room_media
       WHERE room_id IN (${placeholders})
       ORDER BY room_id, is_cover DESC, sort_order ASC`,
    )
    .bind(...roomIds)
    .all();

  const tiersByRoom: Record<number, any[]> = {};
  const mediaByRoom: Record<number, any[]> = {};

  for (const tier of allTiers as any[]) {
    if (!tiersByRoom[tier.room_id]) tiersByRoom[tier.room_id] = [];
    tiersByRoom[tier.room_id].push(tier);
  }

  for (const media of allMedia as any[]) {
    if (!mediaByRoom[media.room_id]) mediaByRoom[media.room_id] = [];
    mediaByRoom[media.room_id].push(media);
  }

  const result = (rooms as any[]).map((room) => {
    let facilities = room.facilities;
    let equipment_highlights = room.equipment_highlights;
    let images = room.images;

    try { if (typeof facilities === 'string') facilities = JSON.parse(facilities); } catch { facilities = []; }
    try { if (typeof equipment_highlights === 'string') equipment_highlights = JSON.parse(equipment_highlights); } catch { equipment_highlights = []; }
    try { if (typeof images === 'string') images = JSON.parse(images); } catch { images = []; }

    return {
      ...room,
      facilities: facilities ?? [],
      equipment_highlights: equipment_highlights ?? [],
      images: images ?? [],
      tiers: tiersByRoom[room.id] ?? [],
      media: mediaByRoom[room.id] ?? [],
    };
  });

  return Response.json(result);
};
