import { defineMiddleware } from "astro:middleware";

// Polyfill MessageChannel for React 19 SSR compatibility on Cloudflare Workers
if (typeof MessageChannel === "undefined") {
  // @ts-ignore
  globalThis.MessageChannel = class {
    constructor() {
      // @ts-ignore
      this.port1 = { onmessage: null, postMessage: () => {} };
      // @ts-ignore
      this.port2 = { onmessage: null, postMessage: () => {} };
    }
  };
}

export const onRequest = defineMiddleware(async (context, next) => {
  // Pass-through middleware, the polyfill is handled at the top level
  return next();
});
