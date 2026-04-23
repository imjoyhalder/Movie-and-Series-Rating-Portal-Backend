import { stripe } from '../../config/stripe';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';

type WebhookSession = {
  customer: string;
  subscription: string;
  metadata: Record<string, string>;
};

type WebhookSubscription = {
  id: string;
  status: string;
  cancel_at_period_end: boolean;
  billing_cycle_anchor: number;
};

export class PaymentService {
  async createCheckoutSession(userId: string, plan: 'MONTHLY' | 'YEARLY') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    let customerId: string | undefined;
    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    if (subscription?.stripeCustomerId) {
      customerId = subscription.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId },
      });
      customerId = customer.id;
    }

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

  async handleWebhook(payload: Buffer, signature: string) {
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
    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    if (!subscription?.stripeSubscriptionId) {
      throw new AppError('No active subscription', 404);
    }

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    return prisma.subscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true },
    });
  }

  private async handleCheckoutComplete(session: WebhookSession) {
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan as 'MONTHLY' | 'YEARLY';
    if (!userId || !plan) return;

    const anchor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: plan === 'MONTHLY' ? 'MONTHLY' : 'YEARLY',
        status: 'ACTIVE',
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        currentPeriodStart: new Date(),
        currentPeriodEnd: anchor,
      },
      update: {
        plan: plan === 'MONTHLY' ? 'MONTHLY' : 'YEARLY',
        status: 'ACTIVE',
        stripeSubscriptionId: session.subscription,
        currentPeriodStart: new Date(),
        currentPeriodEnd: anchor,
      },
    });
  }

  private async handleSubscriptionUpdated(sub: WebhookSubscription) {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: sub.id },
      data: {
        status: sub.status === 'active' ? 'ACTIVE' : 'INACTIVE',
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
    });
  }

  private async handleSubscriptionDeleted(sub: WebhookSubscription) {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: sub.id },
      data: { status: 'CANCELLED', plan: 'FREE' },
    });
  }
}

export const paymentService = new PaymentService();
