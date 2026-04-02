import Stripe from "stripe";
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, subscriptions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

export const SUBSCRIPTION_PLANS = {
  basic: { priceId: process.env.STRIPE_PRICE_BASIC || "", name: "Basic", price: 29, features: ["50 monthly credits", "Standard support"] },
  pro: { priceId: process.env.STRIPE_PRICE_PRO || "", name: "Pro", price: 99, features: ["500 monthly credits", "Priority support", "API access"] },
  enterprise: { priceId: process.env.STRIPE_PRICE_ENTERPRISE || "", name: "Enterprise", price: 299, features: ["Unlimited credits", "Dedicated support", "Custom integration"] },
};

export const paymentRouter = router({
  getSubscription: protectedProcedure.query(async ({ ctx }: any) => {
    const db = await getDb();
    if (!db || !ctx.user) return null;
    const [userSub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, ctx.user.id)).limit(1);
    if (!userSub) return null;
    try {
      const sub = await stripe.subscriptions.retrieve(userSub.stripeSubscriptionId);
      return { id: sub.id, status: sub.status, currentPeriodEnd: new Date(sub.current_period_end * 1000), plan: userSub.planName, cancelAtPeriodEnd: sub.cancel_at_period_end };
    } catch (error) { console.error("Error fetching subscription:", error); return null; }
  }),

  createCheckoutSession: protectedProcedure.input(z.object({ planKey: z.enum(["basic", "pro", "enterprise"]), successUrl: z.string().url(), cancelUrl: z.string().url() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db || !ctx.user) throw new Error("Database not available or user not authenticated");
    const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
    if (!user) throw new Error("User not found");
    const plan = SUBSCRIPTION_PLANS[input.planKey as keyof typeof SUBSCRIPTION_PLANS];
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ email: user.email || undefined, name: user.name || undefined });
      stripeCustomerId = customer.id;
      await db.update(users).set({ stripeCustomerId }).where(eq(users.id, user.id));
    }
    const session = await stripe.checkout.sessions.create({ customer: stripeCustomerId, line_items: [{ price: plan.priceId, quantity: 1 }], mode: "subscription", success_url: input.successUrl, cancel_url: input.cancelUrl, metadata: { userId: String(ctx.user.id), planKey: input.planKey } });
    return { sessionId: session.id, url: session.url };
  }),

  getPlans: publicProcedure.query(() => Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({ key, name: plan.name, price: plan.price, features: plan.features }))),

  cancelSubscription: protectedProcedure.mutation(async ({ ctx }: any) => {
    const db = await getDb();
    if (!db || !ctx.user) throw new Error("Database not available or user not authenticated");
    const [userSub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, ctx.user.id)).limit(1);
    if (!userSub) throw new Error("No active subscription");
    await stripe.subscriptions.update(userSub.stripeSubscriptionId, { cancel_at_period_end: true });
    return { success: true };
  }),

  updateSubscription: protectedProcedure.input(z.object({ planKey: z.enum(["basic", "pro", "enterprise"]) })).mutation(async ({ ctx, input }: any) => {
    const db = await getDb();
    if (!db || !ctx.user) throw new Error("Database not available or user not authenticated");
    const [userSub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, ctx.user.id)).limit(1);
    if (!userSub) throw new Error("No active subscription");
    const plan = SUBSCRIPTION_PLANS[input.planKey as keyof typeof SUBSCRIPTION_PLANS];
    const sub = await stripe.subscriptions.retrieve(userSub.stripeSubscriptionId);
    await stripe.subscriptions.update(userSub.stripeSubscriptionId, { items: [{ id: sub.items.data[0].id, price: plan.priceId }], proration_behavior: "create_prorations" });
    await db.update(subscriptions).set({ planName: input.planKey }).where(eq(subscriptions.id, userSub.id));
    return { success: true };
  }),
});
