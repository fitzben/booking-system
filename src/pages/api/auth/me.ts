import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth';

export const GET: APIRoute = async (context) => {
  const user = await getAuthUser(context);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json({ username: user.username, role: user.role });
};
