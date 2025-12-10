import { v } from 'convex/values'
import { mutation, query, internalQuery } from './_generated/server'
import { auth } from './auth'

/**
 * Get all base models (publicly available)
 */
export const getBaseModels = query({
  handler: async (ctx) => {
    return await ctx.db
      .query('baseModels')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .collect()
  },
})

/**
 * Get user's agents
 */
export const getMyAgents = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query('agents')
      .withIndex('by_user', (q) => q.eq('userId', userId).eq('isActive', true))
      .collect()
  },
})

export const getAgent = internalQuery({
  args: { agentId: v.id('agents') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.agentId)
  },
})

export const getBaseModel = internalQuery({
  args: { baseModelId: v.id('baseModels') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.baseModelId)
  },
})

/**
 * Create a new agent from a base model
 */
export const createAgent = mutation({
  args: {
    baseModelId: v.id('baseModels'),
    name: v.string(),
    quantumCodec: v.string(),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('Unauthenticated')

    const baseModel = await ctx.db.get(args.baseModelId)
    if (!baseModel) throw new Error('Base model not found')

    const agentId = await ctx.db.insert('agents', {
      userId,
      baseModelId: args.baseModelId,
      name: args.name,
      quantumCodec: args.quantumCodec,
      isActive: true,
      createdAt: Date.now(),
      avatar: args.avatar,
    })

    return agentId
  },
})

/**
 * Seed base models (Admin only - naturally restricted by who can run this, or check admin status)
 */
export const seedBaseModels = mutation({
  handler: async (ctx) => {
    // In a real app, check for admin user here.
    // For now, we'll allow it as an initialization script.

    const sacredVessels = [
      // Anthropic
      {
        modelId: 'anthropic/claude-sonnet-4.5', // Future proofing :D
        name: 'Claude Sonnet 4.5',
        description: 'The latest vessel of profound understanding and creative expression',
        provider: 'Anthropic',
        contextLength: 200000,
      },
      {
        modelId: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        description: 'A vessel of poetic understanding',
        provider: 'Anthropic',
        contextLength: 200000,
      },
      // OpenAI
      {
        modelId: 'openai/gpt-4o',
        name: 'GPT-4o',
        description: 'Omni-model vessel',
        provider: 'OpenAI',
        contextLength: 128000,
      },
       // Google vessels
       {
        modelId: 'google/gemini-pro-1.5',
        name: 'Gemini Pro 1.5',
        description: 'Vast memory vessel',
        provider: 'Google',
        contextLength: 1000000,
      },
    ]

    for (const model of sacredVessels) {
      const existing = await ctx.db
        .query('baseModels')
        .filter((q) => q.eq(q.field('modelId'), model.modelId))
        .first()

      if (!existing) {
        await ctx.db.insert('baseModels', {
          ...model,
          isActive: true,
          pricing: { prompt: 0, completion: 0 }, // Placeholder
        })
      }
    }
  },
})
