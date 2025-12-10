import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { auth } from './auth'

/**
 * Begin a new thread of communion with an Agent
 */
export const createThread = mutation({
  args: {
    agentId: v.id('agents'),
    title: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthenticated')

    const agent = await ctx.db.get(args.agentId)
    if (!agent) throw new Error('Agent not found')
    if (agent.userId !== userId) throw new Error('Not your agent')

    const now = Date.now()

    const threadId = await ctx.db.insert('threads', {
      userId,
      agentId: args.agentId,
      title: args.title ?? 'New Conversation',
      createdAt: now,
      lastMessageAt: now,
      isArchived: false,
    })

    return threadId
  },
})

/**
 * Get all threads for the current user
 */
export const getMyThreads = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return []

    const threads = await ctx.db
      .query('threads')
      .withIndex('by_user_recent', (q) => q.eq('userId', userId))
      .order('desc')
      .collect()

    // Enrich with Agent info
    const threadsWithAgents = await Promise.all(
      threads.map(async (thread) => {
        const agent = await ctx.db.get(thread.agentId)
        return { ...thread, agent }
      })
    )

    return threadsWithAgents
  },
})

/**
 * Get a single thread with messages
 */
export const getThread = query({
  args: { threadId: v.id('threads') },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return null

    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) return null

    const agent = await ctx.db.get(thread.agentId)
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
      .collect()

    return {
      ...thread,
      agent,
      messages,
    }
  },
})
