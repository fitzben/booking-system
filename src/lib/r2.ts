// R2 upload via S3-compatible API.
// Uses aws4fetch — no Node native modules, works in Cloudflare Workers/Pages Functions.
//
// Required env vars (set in .dev.vars locally, Cloudflare dashboard in production):
//   R2_ENDPOINT          https://<account_id>.r2.cloudflarestorage.com
//   R2_ACCESS_KEY_ID     R2 token key ID
//   R2_SECRET_ACCESS_KEY R2 token secret
//   R2_BUCKET_NAME       mde-booking-bucket

import { AwsClient } from "aws4fetch";

export interface Env {
  R2_ENDPOINT: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
}

/**
 * Upload an object to R2 and return its public path.
 * Returns `/media/<key>` — wire up a public URL or proxy route as needed.
 */
export async function uploadObject(
  env: Env,
  key: string,
  contentType: string,
  body: ArrayBuffer | Uint8Array,
): Promise<string> {
  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });

  const endpoint = `${env.R2_ENDPOINT}/${env.R2_BUCKET_NAME}/${key}`;

  const response = await client.fetch(endpoint, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: body as BodyInit,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`R2 upload failed (${response.status}): ${text}`);
  }

  return `/media/${key}`;
}
