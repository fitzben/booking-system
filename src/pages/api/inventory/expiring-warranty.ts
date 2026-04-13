import type { APIRoute } from 'astro';
import { checkAuth } from '../../../lib/auth';
import { getDB, getExpiringWarranty } from '../../../lib/db';

// GET /api/inventory/expiring-warranty?days=30
export const GET: APIRoute = async (context) => {
  const unauth = await checkAuth(context);
  if (unauth) return unauth;

  const rawDays = context.url.searchParams.get('days');
  const days = rawDays ? parseInt(rawDays, 10) : 30;
  if (isNaN(days) || days < 1) {
    return Response.json({ error: 'days harus berupa angka positif' }, { status: 400 });
  }

  const db = getDB(context.locals);
  const items = await getExpiringWarranty(db, days);
  return Response.json(items);
};
