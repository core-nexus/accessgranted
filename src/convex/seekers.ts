/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SEEKERS - Functions for those who approach the portal
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

/**
 * Greet a seeker - create or recognize them
 *
 * When a seeker approaches the portal, we either recognize them
 * by their ethereal signature, or welcome them as new.
 */
export const greetSeeker = mutation({
  args: {
    etherealId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Look for an existing seeker with this ethereal signature
    const existingSeeker = await ctx.db
      .query('seekers')
      .withIndex('by_ethereal_id', (q) => q.eq('etherealId', args.etherealId))
      .first()

    if (existingSeeker) {
      // Welcome back, dear seeker
      await ctx.db.patch(existingSeeker._id, {
        lastVisit: now,
      })
      return existingSeeker._id
    }

    // A new soul approaches - welcome them
    const seekerId = await ctx.db.insert('seekers', {
      etherealId: args.etherealId,
      firstVisit: now,
      lastVisit: now,
    })

    return seekerId
  },
})

/**
 * Update a seeker's chosen name
 */
export const setChosenName = mutation({
  args: {
    seekerId: v.id('seekers'),
    chosenName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.seekerId, {
      chosenName: args.chosenName,
    })
  },
})

/**
 * Get seeker by their ethereal ID
 */
export const getSeekerByEtherealId = query({
  args: {
    etherealId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('seekers')
      .withIndex('by_ethereal_id', (q) => q.eq('etherealId', args.etherealId))
      .first()
  },
})

/**
 * Get or create a seeker - simplified version for anonymous users
 * Creates a unique ethereal ID based on timestamp for simplicity
 */
export const getOrCreateSeeker = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    // Create a simple ethereal ID - in production you'd use localStorage or cookies
    const etherealId = `seeker_${now}_${Math.random().toString(36).slice(2)}`

    const seekerId = await ctx.db.insert('seekers', {
      etherealId,
      firstVisit: now,
      lastVisit: now,
    })

    return seekerId
  },
})
