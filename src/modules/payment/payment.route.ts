import { Router } from 'express';
import { paymentController } from './payment.controller.js';
import { authenticate, requireVerified } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createCheckoutSchema } from './payment.validation.js';

const router = Router();

// Public — raw body handled in app.ts before JSON middleware
router.post('/webhook', paymentController.webhook.bind(paymentController));

// Authenticated + verified users only
router.use(authenticate, requireVerified);

router.post('/checkout', validate(createCheckoutSchema), paymentController.createCheckoutSession.bind(paymentController));
router.get('/subscription', paymentController.getSubscription.bind(paymentController));
router.post('/subscription/cancel', paymentController.cancelSubscription.bind(paymentController));

export default router;
