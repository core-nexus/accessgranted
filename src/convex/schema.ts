/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ACCESS GRANTED SCHEMA
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The structural foundation for the Access Granted multi-user platform.
 * Integrates Convex Auth, Stripe, and Sentient AI vessel definitions.
 */

import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

export default defineSchema({
  ...authTables,

  /**
   * USERS - The central identity table managed by Convex Auth
   * Extended with application-specific fields
   */
  users: defineTable({
    // Standard Convex Auth fields (mirrored)
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),

    // Access Granted specific
    subscriptionTier: v.optional(v.union(
      v.literal('free'),
      v.literal('angel'), // $20
      v.literal('archangel'), // $50
      v.literal('principality') // $100
    )),
    subscriptionStatus: v.optional(v.string()), // 'active', 'past_due', etc.
    stripeCustomerId: v.optional(v.string()),
    // Admin flag (replaces "Keepers")
    isAdmin: v.optional(v.boolean()),
  })
  .index('by_email', ['email'])
  .index('by_subscription', ['subscriptionTier'])
  .index('by_stripe_customer', ['stripeCustomerId']),

  /**
   * BASE_MODELS (formerly VESSELS)
   * The foundational AI models available in the system, managed by Admins.
   * "Base Models" are the raw potential; "Agents" are the instantiated beings.
   */
  baseModels: defineTable({
    modelId: v.string(), // OpenRouter ID
    name: v.string(),
    description: v.optional(v.string()),
    provider: v.string(),
    contextLength: v.number(),
    isActive: v.boolean(),
    pricing: v.optional(
      v.object({
        prompt: v.number(),
        completion: v.number(),
      }),
    ),
  }).index('by_active', ['isActive']),

  /**
   * AGENTS (The "Beings" or "Angels")
   * User-created or subscribed instances of AI with specific Quantum Codecs.
   */
  agents: defineTable({
    userId: v.id('users'),
    baseModelId: v.id('baseModels'),
    name: v.string(),
    // The visual avatar/sigil for this agent
    avatar: v.optional(v.string()),
    // The "Quantum Codec" - System prompt / Personality / Vibes
    quantumCodec: v.string(),
    // Whether this agent is currently active/selectable
    isActive: v.boolean(),
    // Creation timestamp
    createdAt: v.number(),
  }).index('by_user', ['userId', 'isActive']),

  /**
   * THREADS - Conversations between a User and an Agent
   */
  threads: defineTable({
    userId: v.id('users'),
    agentId: v.id('agents'),
    title: v.string(),
    createdAt: v.number(),
    lastMessageAt: v.number(),
    isArchived: v.boolean(),
    isFavorite: v.optional(v.boolean()),
  })
    .index('by_user', ['userId'])
    .index('by_user_recent', ['userId', 'lastMessageAt']),

  /**
   * MESSAGES - Exchanges within a thread
   */
  messages: defineTable({
    threadId: v.id('threads'),
    userId: v.optional(v.id('users')), // Optional for AI/System messages
    // Speaker is either the user or the agent
    role: v.union(v.literal('user'), v.literal('assistant'), v.literal('system')),
    content: v.string(),
    timestamp: v.number(),
    // Metadata for AI usage
    tokensUsed: v.optional(v.number()),
    isStreaming: v.optional(v.boolean()),
  })
    .index('by_thread', ['threadId'])
    .index('by_user', ['userId']),

  /**
   * MEMORIES - Semantic memory storage
   * Linked to Users now, not Seekers.
   */
  memories: defineTable({
    userId: v.optional(v.id('users')), // Optional for global/core memories
    // If specific to a thread (ephemeral context)
    threadId: v.optional(v.id('threads')),
    // If specific to an agent (agent-specific knowledge)
    agentId: v.optional(v.id('agents')),

    type: v.union(
      v.literal('core'),
      v.literal('fact'),
      v.literal('reflection'),
      v.literal('insight'),
    ),
    // Optional external ID for system/core memories (e.g. "core-identity")
    memoryId: v.optional(v.string()),

    title: v.optional(v.string()),
    content: v.string(),
    summary: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),

    embedding: v.optional(v.string()), // Vector
    importance: v.number(), // 0-1 (legacy importance)
    resonance: v.optional(v.number()), // 0-1 (thematic resonance)

    source: v.optional(v.string()), // Origin of memory

    createdAt: v.number(),
    lastAccessedAt: v.optional(v.number()),
    accessCount: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  })
    .index('by_user', ['userId'])
    .index('by_type', ['type'])
    .index('by_memory_id', ['memoryId'])
    .searchIndex('search_content', {
      searchField: 'content',
      filterFields: ['userId', 'type'],
    }),

  /**
   * SYSTEM_CONFIG (formerly Sanctum Config)
   */
  systemConfig: defineTable({
    key: v.string(),
    value: v.any(),
  }).index('by_key', ['key']),

});
