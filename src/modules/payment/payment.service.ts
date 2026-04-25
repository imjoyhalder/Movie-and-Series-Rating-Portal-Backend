import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { stripe } from '../../config/stripe.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { findOrThrow } from '../../utils/db.js';

// Local types to avoid Stripe v22 namespace issues
type WebhookSession = {
  customer: string;
  subscription: string;
  metadata: Record<string, string>;
};

type WebhookSubscription = {
  id: string;
  status: string;
  cancel_at_period_end: boolean;
};

const PLAN_DURATION_MS: Record<'MONTHLY' | 'YEARLY', number> = {
  MONTHLY: 30 * 24 * 60 * 60 * 1000,
  YEARLY: 365 * 24 * 60 * 60 * 1000,
};

export class PaymentService {
  async createCheckoutSession(userId: string, plan: 'MONTHLY' | 'YEARLY') {
    const user = await findOrThrow(
      prisma.user.findUnique({ where: { id: userId } }),
      'User not found',
    );

    const existingSub = await prisma.subscription.findUnique({ where: { userId } });
    const customerId =
      existingSub?.stripeCustomerId ??
      (
        await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: { userId },
        })
      ).id;

    const priceId =
      plan === 'MONTHLY' ? env.STRIPE_MONTHLY_PRICE_ID : env.STRIPE_YEARLY_PRICE_ID;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/subscription/cancel`,
      metadata: { userId, plan },
    });

    return { sessionId: session.id, url: session.url };
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    let event: ReturnType<typeof stripe.webhooks.constructEvent>;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw new AppError('Webhook signature verification failed', 400);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object as unknown as WebhookSession);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as unknown as WebhookSubscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as unknown as WebhookSubscription);
        break;
    }
  }

  async getSubscription(userId: string) {
    return prisma.subscription.findUnique({ where: { userId } });
  }

  async cancelSubscription(userId: string) {
    const subscription = await findOrThrow(
      prisma.subscription.findUnique({ where: { userId } }),
      'No active subscription found',
    );

    if (!subscription.stripeSubscriptionId) {
      throw new AppError('No Stripe subscription linked to this account', 404);
    }

    // Mark cancel-at-period-end in Stripe — the webhook reconciles final DB state
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    return prisma.subscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true },
    });
  }

  // ── Webhook handlers ──────────────────────────────────────────────────────

  private async handleCheckoutComplete(session: WebhookSession): Promise<void> {
    const { userId, plan } = session.metadata ?? {};
    if (!userId || !plan) return;

    const typedPlan = plan as 'MONTHLY' | 'YEARLY';
    const now = new Date();
    const periodEnd = new Date(now.getTime() + PLAN_DURATION_MS[typedPlan]);

    // Atomic upsert: if the DB write fails after Stripe confirms payment,
    // Stripe will retry the webhook and the transaction prevents partial state.
    await prisma.$transaction(async (tx) => {
      await tx.subscription.upsert({
        where: { userId },
        create: {
          userId,
          plan: typedPlan as SubscriptionPlan,
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
        update: {
          plan: typedPlan as SubscriptionPlan,
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
      });
    });
  }

  private async handleSubscriptionUpdated(sub: WebhookSubscription): Promise<void> {
    const status =
      sub.status === 'active'
        ? SubscriptionStatus.ACTIVE
        : sub.status === 'canceled'
          ? SubscriptionStatus.CANCELLED
          : SubscriptionStatus.INACTIVE;

    await prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { status, cancelAtPeriodEnd: sub.cancel_at_period_end },
      });
    });
  }

  private async handleSubscriptionDeleted(sub: WebhookSubscription): Promise<void> {
    // Fully cancelled — downgrade to FREE plan atomically
    await prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: {
          status: SubscriptionStatus.CANCELLED,
          plan: SubscriptionPlan.FREE,
          cancelAtPeriodEnd: false,
        },
      });
    });
  }
}

export const paymentService = new PaymentService();
