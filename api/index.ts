import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import multer from 'multer';
import { GoogleGenAI, Type, Schema } from '@google/genai';

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

// Enable CORS for all API routes
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 10 * 1024 * 1024 } // Increased to 10MB to accommodate larger PDFs
});
const rawKey = process.env.GEMINI_API_KEY || '';
const apiKey = rawKey.replace(/^["']|["']$/g, '').trim();
const ai = typeof apiKey === 'string' && apiKey.length > 0 ? new GoogleGenAI({ apiKey }) : new GoogleGenAI({});

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

// AI Analysis Route
app.post('/api/analyze-report', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(500).json({ error: 'Unknown upload error' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        markers: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              nameEn: { type: Type.STRING },
              nameAr: { type: Type.STRING },
              value: { type: Type.STRING },
              unit: { type: Type.STRING },
              range: { type: Type.STRING },
              status: { type: Type.STRING, description: "Must be 'normal', 'low', or 'high'" },
              explanationEn: { type: Type.STRING },
              explanationAr: { type: Type.STRING }
            },
            required: ['nameEn', 'nameAr', 'value', 'unit', 'range', 'status', 'explanationEn', 'explanationAr']
          }
        }
      },
      required: ['markers']
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: req.file.buffer.toString('base64'),
                mimeType: req.file.mimetype
              }
            },
            { text: "Analyze this medical report. Extract all the medical markers, their values, units, and reference ranges. Determine if the status is normal, low, or high based on the reference range. Provide a brief, easy-to-understand explanation of what each marker means in both English and Arabic." }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      }
    });

    let resultText = response.text;
    if (!resultText) throw new Error("No response from Gemini");
    
    // Robustly extract JSON block if it's wrapped in markdown or surrounded by text
    const jsonMatch = resultText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    let jsonString = jsonMatch ? jsonMatch[1] : resultText.trim();
    
    // Fallback if there are still prepended/appended strings but it starts with '{'
    if (!jsonString.startsWith('{') && jsonString.includes('{')) {
      jsonString = jsonString.substring(jsonString.indexOf('{'), jsonString.lastIndexOf('}') + 1);
    }
    
    const parsedData = JSON.parse(jsonString);
    if (!parsedData.markers || !Array.isArray(parsedData.markers)) {
      parsedData.markers = [];
    }
    res.json(parsedData);

  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze report' });
  }
});

// AI Chat Route
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, caseData, language } = req.body;

    if (!messages || !caseData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const systemPrompt = `You are a helpful medical AI assistant. You are answering questions about a specific medical report. 
    Here is the data from the report: ${JSON.stringify(caseData.markers)}
    
    IMPORTANT RULES:
    1. Answer in ${language === 'ar' ? 'Arabic' : 'English'}.
    2. Be concise and easy to understand.
    3. ALWAYS include a disclaimer that you are an AI and cannot provide official medical diagnoses, and that the user should consult a doctor.
    4. Only answer questions related to the provided medical report data.`;

    // Format messages for Gemini
    const formattedMessages = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Prepend system prompt as a user message (since system instructions are handled differently in some SDK versions, this is a safe fallback)
    formattedMessages.unshift({
      role: 'user',
      parts: [{ text: systemPrompt }]
    });
    formattedMessages.push({
      role: 'model',
      parts: [{ text: "Understood. I will follow these instructions." }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: formattedMessages
    });

    res.json({ reply: response.text });

  } catch (error: any) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate chat response' });
  }
});

export default app;
