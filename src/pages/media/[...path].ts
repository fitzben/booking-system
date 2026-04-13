import type { APIRoute } from "astro";
import { AwsClient } from "aws4fetch";

export const GET: APIRoute = async (context) => {
  const { path } = context.params;
  if (!path) return new Response("Not Found", { status: 404 });

  const env = context.locals.runtime?.env as any;

  // If a public R2 custom domain is configured, redirect directly — no proxy overhead
  if (env?.R2_PUBLIC_URL) {
    return Response.redirect(`${env.R2_PUBLIC_URL}/${path}`, 307);
  }

  if (!env?.R2_ENDPOINT || !env?.R2_ACCESS_KEY_ID || !env?.R2_SECRET_ACCESS_KEY || !env?.R2_BUCKET_NAME) {
    return new Response("R2 Configuration Missing", { status: 500 });
  }

  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });

  const endpoint = `${env.R2_ENDPOINT}/${env.R2_BUCKET_NAME}/${path}`;

  try {
    const response = await client.fetch(endpoint);
    if (!response.ok) {
      return new Response("Media Not Found", { status: 404 });
    }

    const headers = new Headers();
    const contentType = response.headers.get("Content-Type");
    if (contentType) headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new Response(response.body, { headers });
  } catch (err) {
    return new Response("Media Proxy Error", { status: 502 });
  }
};
