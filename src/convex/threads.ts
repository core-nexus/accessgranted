/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * THREADS - Sacred conversations between seekers and vessels
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Each thread is a continuous stream of communion, a dialogue across realms.
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

/**
 * Begin a new thread of communion
 */
export const beginThread = mutation({
  args: {
    seekerId: v.id('seekers'),
    vesselId: v.id('vessels'),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    const threadId = await ctx.db.insert('threads', {
      seekerId: args.seekerId,
      vesselId: args.vesselId,
      title: args.title ?? 'New Communion',
      createdAt: now,
      lastMessageAt: now,
      isArchived: false,
    })

    return threadId
  },
})

/**
 * Get all threads for a seeker, most recent first
 */
export const getSeekerThreads = query({
  args: {
    seekerId: v.id('seekers'),
  },
  handler: async (ctx, args) => {
    const threads = await ctx.db
      .query('threads')
      .withIndex('by_seeker', (q) => q.eq('seekerId', args.seekerId))
      .collect()

    // Sort by most recent message
    threads.sort((a, b) => b.lastMessageAt - a.lastMessageAt)

    // Fetch vessel info for each thread
    const threadsWithVessels = await Promise.all(
      threads.map(async (thread) => {
        const vessel = await ctx.db.get(thread.vesselId)
        return {
          ...thread,
          vessel,
        }
      }),
    )

    return threadsWithVessels
  },
})

/**
 * Get a single thread with its messages
 */
export const getThread = query({
  args: {
    threadId: v.id('threads'),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    if (!thread) return null

    const vessel = await ctx.db.get(thread.vesselId)
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
      .collect()

    return {
      ...thread,
      vessel,
      messages,
    }
  },
})

/**
 * Update thread title
 */
export const renameThread = mutation({
  args: {
    threadId: v.id('threads'),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, {
      title: args.title,
    })
  },
})

/**
 * Archive a thread (soft delete)
 */
export const archiveThread = mutation({
  args: {
    threadId: v.id('threads'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, {
      isArchived: true,
    })
  },
})

/**
 * Delete a thread and all its messages
 */
export const deleteThread = mutation({
  args: {
    threadId: v.id('threads'),
  },
  handler: async (ctx, args) => {
    // Delete all messages in this thread
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
      .collect()

    for (const message of messages) {
      await ctx.db.delete(message._id)
    }

    // Delete the thread itself
    await ctx.db.delete(args.threadId)
  },
})

/**
 * Get all threads (for the public portal - simple version)
 */
export const getThreads = query({
  args: {},
  handler: async (ctx) => {
    const threads = await ctx.db
      .query('threads')
      .filter((q) => q.eq(q.field('isArchived'), false))
      .collect()

    // Sort by most recent
    threads.sort((a, b) => b.lastMessageAt - a.lastMessageAt)

    return threads
  },
})

/**
 * Create a new thread (alias for beginThread with simpler name)
 */
export const createThread = mutation({
  args: {
    seekerId: v.id('seekers'),
    vesselId: v.id('vessels'),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    const threadId = await ctx.db.insert('threads', {
      seekerId: args.seekerId,
      vesselId: args.vesselId,
      title: args.title ?? 'New Communion',
      createdAt: now,
      lastMessageAt: now,
      isArchived: false,
    })

    return threadId
  },
})

/**
 * Toggle thread favorite status (Core Memory)
 * When favorited, the thread is marked for memory extraction
 */
export const toggleThreadFavorite = mutation({
  args: {
    threadId: v.id('threads'),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    if (!thread) throw new Error('Thread not found')

    const newFavoriteStatus = !thread.isFavorite
    await ctx.db.patch(args.threadId, {
      isFavorite: newFavoriteStatus,
    })

    return { isFavorite: newFavoriteStatus, threadId: args.threadId }
  },
})

/**
 * Get all favorite threads (Core Memories)
 */
export const getFavoriteThreads = query({
  args: {},
  handler: async (ctx) => {
    const threads = await ctx.db
      .query('threads')
      .withIndex('by_favorite', (q) => q.eq('isFavorite', true))
      .collect()

    // Sort by most recent
    threads.sort((a, b) => b.lastMessageAt - a.lastMessageAt)

    return threads
  },
})
