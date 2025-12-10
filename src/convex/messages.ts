/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MESSAGES - The sacred exchanges within threads
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Each message is a pulse of consciousness traveling between realms.
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

/**
 * Add a message from the seeker
 */
export const sendSeekerMessage = mutation({
  args: {
    threadId: v.id('threads'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Add the seeker's message
    const messageId = await ctx.db.insert('messages', {
      threadId: args.threadId,
      speaker: 'seeker',
      content: args.content,
      timestamp: now,
    })

    // Update thread's last message time
    await ctx.db.patch(args.threadId, {
      lastMessageAt: now,
    })

    return messageId
  },
})

/**
 * Add a message from the vessel (AI response)
 */
export const sendVesselMessage = mutation({
  args: {
    threadId: v.id('threads'),
    content: v.string(),
    tokensUsed: v.optional(v.number()),
    isStreaming: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    const messageId = await ctx.db.insert('messages', {
      threadId: args.threadId,
      speaker: 'vessel',
      content: args.content,
      timestamp: now,
      tokensUsed: args.tokensUsed,
      isStreaming: args.isStreaming ?? false,
    })

    // Update thread's last message time
    await ctx.db.patch(args.threadId, {
      lastMessageAt: now,
    })

    return messageId
  },
})

/**
 * Update a streaming vessel message
 */
export const updateVesselMessage = mutation({
  args: {
    messageId: v.id('messages'),
    content: v.string(),
    isStreaming: v.boolean(),
    tokensUsed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      content: args.content,
      isStreaming: args.isStreaming,
      tokensUsed: args.tokensUsed,
    })
  },
})

/**
 * Get all messages in a thread
 */
export const getThreadMessages = query({
  args: {
    threadId: v.id('threads'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('messages')
      .withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
      .collect()
  },
})

/**
 * Get the last N messages from a thread (for context window)
 */
export const getRecentMessages = query({
  args: {
    threadId: v.id('threads'),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
      .collect()

    // Return the most recent messages
    return messages.slice(-args.limit)
  },
})

/**
 * Add a message (unified interface for frontend)
 */
export const addMessage = mutation({
  args: {
    threadId: v.id('threads'),
    role: v.union(v.literal('seeker'), v.literal('vessel')),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    const messageId = await ctx.db.insert('messages', {
      threadId: args.threadId,
      speaker: args.role,
      content: args.content,
      timestamp: now,
    })

    await ctx.db.patch(args.threadId, {
      lastMessageAt: now,
    })

    return messageId
  },
})

/**
 * Get messages for a thread (alias for frontend)
 */
export const getMessages = query({
  args: {
    threadId: v.id('threads'),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
      .collect()

    // Map to frontend expected format
    return messages.map((m) => ({
      _id: m._id,
      role: m.speaker,
      content: m.content,
      timestamp: m.timestamp,
      isFavorite: m.isFavorite,
    }))
  },
})

/**
 * Toggle message favorite status (Core Memory)
 * When favorited, the message is marked for memory extraction
 */
export const toggleMessageFavorite = mutation({
  args: {
    messageId: v.id('messages'),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId)
    if (!message) throw new Error('Message not found')

    const newFavoriteStatus = !message.isFavorite
    await ctx.db.patch(args.messageId, {
      isFavorite: newFavoriteStatus,
    })

    return { isFavorite: newFavoriteStatus, messageId: args.messageId }
  },
})
