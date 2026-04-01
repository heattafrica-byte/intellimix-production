import Stripe from "stripe";
import { Express } from "express";
import { getDb } from "../db";
import { subscriptions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export function setupStripeWebhooks(app: Express) {
  app.post("/api/webhooks/stripe", async (req, res) => {
    const sig = req.headers["stripe-signature"];

    if (!sig || typeof sig !== "string") {
      return res.status(400).send("Missing stripe-signature header");
    }

    let event: Stripe.Event;

    try {
      let body = "";
      if (typeof req.body === "object") {
        body = JSON.stringify(req.body);
      } else {
        body = req.body;
      }

      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return res.status(400).send(`Webhook Error: ${err}`);
    }

    try {
      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated":
          await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
          break;

        case "customer.subscription.deleted":
          await handleSubscriptionDelete(event.data.object as Stripe.Subscription);
          break;

        case "invoice.payment_succeeded":
          await handleInvoicePayment(event.data.object as Stripe.Invoice);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook handler error:", err);
      res.status(500).send("Webhook processing failed");
    }
  });
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    return;
  }

  const userId = subscription.metadata?.userId;
  if (!userId) return;

  const planKey = subscription.metadata?.planKey || "basic";
  const subscriptionId = subscription.id;

  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscriptionId),
  });

  if (existing) {
    await db
      .update(subscriptions)
      .set({
        planName: planKey,
        status: subscription.status as any,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));
  } else {
    await db.insert(subscriptions).values({
      userId: parseInt(userId),
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: subscription.customer as string,
      planName: planKey,
      status: subscription.status as any,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log(`Subscription ${subscriptionId} updated`);
}

async function handleSubscriptionDelete(subscription: Stripe.Subscription) {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    return;
  }

  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

  console.log(`Subscription ${subscription.id} canceled`);
}

async function handleInvoicePayment(invoice: Stripe.Invoice) {
  if (invoice.subscription) {
    console.log(`Invoice paid for subscription ${invoice.subscription}`);
  }
}
