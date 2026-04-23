import { SubscriptionPlan } from '@prisma/client';

export interface CreateCheckoutSessionDto {
  plan: 'MONTHLY' | 'YEARLY';
}

export interface StripeWebhookEvent {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

export { SubscriptionPlan };
