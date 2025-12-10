"use node";

import { action, internalAction } from "./_generated/server";
// import Stripe from 'stripe';
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Initialize Stripe with secret key from environment variables
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: '2025-01-27',
// });

export const createCheckoutSession = action({
  args: { priceId: v.string() },
  handler: async (ctx, args) => {
    // TODO: Implement checkout session creation
    return { sessionUrl: "TODO" };
  },
});

export const handleStripeWebhook = internalAction({
  args: { signature: v.string(), payload: v.string() },
  handler: async (ctx, args) => {
    // TODO: Verify signature and handle event
    console.log("Stripe webhook received");
  },
});
