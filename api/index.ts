import express from 'express';
import Stripe from 'stripe';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (if service account is provided)
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount)
      });
    }
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT_JSON not found. Admin SDK not initialized.');
  }
} catch (e) {
  console.error('Failed to initialize Firebase Admin:', e);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2026-03-25.dahlia',
});

const app = express();

// --- STRIPE WEBHOOK (Must be before express.json) ---
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !endpointSecret) {
    return res.status(400).send('Webhook secret not configured');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      
      if (userId && getApps().length > 0) {
        // Upgrade user to pro in Firestore
        await getFirestore().collection('users').doc(userId).update({
          tier: 'pro',
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string
        });
        console.log(`Successfully upgraded user ${userId} to Pro`);
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      if (getApps().length > 0) {
        // Find user by stripeCustomerId and downgrade
        const usersRef = getFirestore().collection('users');
        const snapshot = await usersRef.where('stripeCustomerId', '==', subscription.customer).get();
        
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          await userDoc.ref.update({ tier: 'free' });
          console.log(`Successfully downgraded user ${userDoc.id} to Free`);
        }
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err);
    res.status(500).send('Internal Server Error');
  }
});

// --- STANDARD API ROUTES ---
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV });
});

// Create Stripe Checkout Session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { userId, email } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'MedInfo Pro',
              description: 'Unlimited medical report analysis',
            },
            unit_amount: 1900, // $19.00
            recurring: { interval: 'month' }
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/dashboard?success=true`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/pricing?canceled=true`,
      client_reference_id: userId,
      customer_email: email,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default app;
