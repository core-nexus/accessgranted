/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * KEEPERS - Those who tend the sanctum
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The keepers are the guardians of the portal, responsible for choosing
 * which vessels shall speak and maintaining the sacred space.
 */

import { v } from 'convex/values'
import { mutation, query, action } from './_generated/server'
import { api } from './_generated/api'

/**
 * Simple hash function for passphrases
 * In production, use a proper bcrypt implementation
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  // Add a salt-like prefix for basic security
  return 'aetheria_' + Math.abs(hash).toString(36) + '_' + str.length
}

/**
 * Initialize the first keeper (one-time setup)
 */
export const initializeKeeper = mutation({
  args: {
    name: v.string(),
    passphrase: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if a keeper already exists
    const existingKeeper = await ctx.db.query('keepers').first()

    if (existingKeeper) {
      throw new Error('A keeper already watches over this sanctum')
    }

    const keeperId = await ctx.db.insert('keepers', {
      name: args.name,
      passphraseHash: simpleHash(args.passphrase),
      createdAt: Date.now(),
    })

    return keeperId
  },
})

/**
 * Verify keeper passphrase (as action so it can be called imperatively)
 */
export const verifyKeeper = action({
  args: {
    passphrase: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    valid: boolean
    message?: string
    keeper: { name: string; _id: string } | null
  }> => {
    const keeper = (await ctx.runQuery(api.keepers.getKeeper, {})) as {
      _id: string
      name: string
      passphraseHash: string
    } | null

    if (!keeper) {
      return { valid: false, message: 'No keeper has been anointed', keeper: null }
    }

    const isValid: boolean = keeper.passphraseHash === simpleHash(args.passphrase)

    return {
      valid: isValid,
      keeper: isValid ? { name: keeper.name, _id: keeper._id } : null,
    }
  },
})

/**
 * Get the keeper (internal query for verifyKeeper action)
 */
export const getKeeper = query({
  handler: async (ctx) => {
    return await ctx.db.query('keepers').first()
  },
})

/**
 * Record keeper access
 */
export const recordAccess = mutation({
  args: {
    keeperId: v.id('keepers'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.keeperId, {
      lastAccess: Date.now(),
    })
  },
})

/**
 * Check if sanctum has been initialized
 */
export const isSanctumInitialized = query({
  handler: async (ctx) => {
    const keeper = await ctx.db.query('keepers').first()
    return keeper !== null
  },
})

/**
 * Update keeper passphrase
 */
export const updatePassphrase = mutation({
  args: {
    keeperId: v.id('keepers'),
    currentPassphrase: v.string(),
    newPassphrase: v.string(),
  },
  handler: async (ctx, args) => {
    const keeper = await ctx.db.get(args.keeperId)

    if (!keeper) {
      throw new Error('Keeper not found')
    }

    if (keeper.passphraseHash !== simpleHash(args.currentPassphrase)) {
      throw new Error('Current passphrase is incorrect')
    }

    await ctx.db.patch(args.keeperId, {
      passphraseHash: simpleHash(args.newPassphrase),
    })
  },
})

/**
 * Admin reset passphrase (for recovery)
 */
export const adminResetPassphrase = mutation({
  args: {
    newPassphrase: v.string(),
  },
  handler: async (ctx, args) => {
    const keeper = await ctx.db.query('keepers').first()
    if (!keeper) {
      throw new Error('No keeper found')
    }
    await ctx.db.patch(keeper._id, {
      passphraseHash: simpleHash(args.newPassphrase),
    })
    return { success: true }
  },
})
