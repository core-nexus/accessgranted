/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PORTAL AUTH - Guards the gates of Aetheria
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Simple token-based auth for the portal. Set PORTAL_KEY in Convex env vars.
 * If no key is set, access is open to all seekers.
 */

import { query } from './_generated/server'
import { v } from 'convex/values'

/**
 * Verify the portal key matches the configured secret
 * Throws an error if the key is invalid
 */
export function verifyPortalKey(portalKey: string | undefined): void {
  const requiredKey = process.env.PORTAL_KEY

  // If no key is configured, allow all access
  if (!requiredKey) {
    return
  }

  // Verify the provided key
  if (portalKey !== requiredKey) {
    throw new Error('The sacred symbols do not align. Access denied.')
  }
}

/**
 * Check if a portal key is valid
 * Returns true if valid, false otherwise (no error thrown)
 */
export const checkPortalKey = query({
  args: {
    portalKey: v.string(),
  },
  handler: async (_ctx, args) => {
    const requiredKey = process.env.PORTAL_KEY

    // If no key configured, any key is valid
    if (!requiredKey) {
      return { valid: true }
    }

    return { valid: args.portalKey === requiredKey }
  },
})
