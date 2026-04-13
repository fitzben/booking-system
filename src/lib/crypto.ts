/** SHA-256 a plain-text string, return lowercase hex digest.
 *  Uses the Web Crypto API — available globally in Cloudflare Workers. */
export async function sha256hex(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
