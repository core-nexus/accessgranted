import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { auth } from './auth'

/**
 * Send a message to the agent
 */
export const sendUserMessage = mutation({
  args: {
    threadId: v.id('threads'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthenticated')

    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) throw new Error('Thread not found')

    const now = Date.now()
    const messageId = await ctx.db.insert('messages', {
      threadId: args.threadId,
      userId,
      role: 'user',
      content: args.content,
      timestamp: now,
    })

    await ctx.db.patch(args.threadId, { lastMessageAt: now })
    return messageId
  },
})

/**
 * Agent response (internal or triggered by action)
 * This logic will likely move to the Action that calls the LLM.
 */
export const saveAgentMessage = mutation({
  args: {
    threadId: v.id('threads'),
    content: v.string(),
    tokensUsed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Only internal or admin should call this in production
    // For now, we trust the caller (Action)
    const thread = await ctx.db.get(args.threadId)
    if (!thread) throw new Error('Thread not found')

    const now = Date.now()
    await ctx.db.insert('messages', {
      threadId: args.threadId,
      userId: thread.userId, // Link to user for indexing
      role: 'assistant',
      content: args.content,
      timestamp: now,
      tokensUsed: args.tokensUsed,
    })

    await ctx.db.patch(args.threadId, { lastMessageAt: now })
  },
})

export const getThreadMessages = query({
  args: { threadId: v.id('threads') },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthenticated') // Or return []

    // Security check
    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) throw new Error('Access denied')

    return await ctx.db
      .query('messages')
      .withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
      .collect()
  },
})
