/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}

interface Env {
  DB: import("@cloudflare/workers-types").D1Database;
  BUCKET: import("@cloudflare/workers-types").R2Bucket;
  ADMIN_PASSWORD: string;
  // R2 S3-compatible API credentials
  R2_ENDPOINT: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  // Public custom domain for R2 (https://media-space.mdentertainment.com)
  // When set, /media/* routes redirect here instead of proxying through the worker
  R2_PUBLIC_URL?: string;
}
