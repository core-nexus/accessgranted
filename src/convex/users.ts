import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { auth } from './auth'

/**
 * Get the current user
 */
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return null
    return await ctx.db.get(userId)
  },
})

/**
 * Check if current user is admin
 */
export const isAdmin = query({
    args: {},
    handler: async (ctx) => {
        const userId = await auth.getUserId(ctx)
        if (!userId) return false
        const user = await ctx.db.get(userId)
        return user?.isAdmin ?? false
    }
})

/**
 * Update user profile
 */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error("Unauthenticated")

    await ctx.db.patch(userId, {
        name: args.name,
        image: args.avatar,
    })
  },
})
