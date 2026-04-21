/**
 * Same-origin redirect guard.
 *
 * We accept redirect targets from several places — `?redirect=…` query
 * strings, server-action responses, post-login hand-off — and feed them
 * to `redirect()` or `router.push()`. If any of those channels can be
 * controlled by an attacker (e.g. a crafted link `/auth/login?redirect=https://evil.tld`),
 * forwarding the value blindly produces an open-redirect: a phishing
 * primitive where our own domain launders a jump to the attacker's page.
 *
 * This helper enforces that the destination is a same-origin relative
 * path:
 *
 *   - Must start with a single leading `/`
 *   - Must NOT start with `//` (protocol-relative URL → different origin)
 *   - Must NOT start with `/\` (some browsers normalise to protocol-relative)
 *
 * Anything else is rejected. Callers should fall back to a known-safe
 * default when `null` is returned.
 */
export function safeRedirectPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  // Reject anything that isn't a plain relative path. `new URL(raw, base)`
  // is tempting but over-permissive — it happily resolves `javascript:`
  // and `data:` URIs. A simple prefix check is stricter and easier to
  // reason about.
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//')) return null;
  if (raw.startsWith('/\\')) return null;
  return raw;
}
