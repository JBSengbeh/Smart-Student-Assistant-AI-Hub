import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import Stripe from 'stripe';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Trust reverse proxy headers (Render, Cloud Run, Railway)
app.set('trust proxy', 1);

// Load Firebase projectId from firebase-applet-config.json (for verifyIdToken only; needs no IAM)
let firebaseProjectId = '';
try {
  const cfgPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    if (parsed?.projectId && parsed.projectId !== 'remixed-project-id') {
      firebaseProjectId = parsed.projectId;
    }
  }
} catch (err) {
  console.warn('Could not load firebase-applet-config.json:', err);
}

const adminApp = firebaseProjectId
  ? getApps().length
    ? getApp()
    : initializeApp({ projectId: firebaseProjectId })
  : null;

// Cryptographic secret for signing Pro entitlement tokens (no external DB IAM needed)
const ENTITLEMENT_SECRET =
  process.env.ENTITLEMENT_SECRET || crypto.randomBytes(32).toString('hex');

// Stripe Client (Server-side only)
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Gemini Client (Server-side only)
let geminiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
  }
}

// Active Campus Institutional Partner Domains
const PARTNER_SCHOOLS: Record<string, { id: string; name: string }> = {
  'statetech.edu': { id: 'state_tech', name: 'State University of Technology' },
  'stanford.edu': { id: 'stanford', name: 'Stanford University (Pilot)' },
  'berkeley.edu': { id: 'berkeley', name: 'UC Berkeley (Associated Students)' },
  'mit.edu': { id: 'mit', name: 'MIT Open Learning Initiative' },
  'utoronto.ca': { id: 'toronto', name: 'University of Toronto' },
  'westfieldschools.org': {
    id: 'westfield',
    name: 'Westfield Unified School District (High School)',
  },
};

const FREE_DAILY_AI_LIMIT = 5;
const GUEST_DAILY_AI_LIMIT = 2;

// In-memory daily AI usage counter keyed by "YYYY-MM-DD:<uid|ip>"
const dailyUsageMap = new Map<string, number>();

// In-memory campus OTP challenge store keyed by "<uid>:<email>"
interface OtpChallenge {
  codeHash: string;
  domain: string;
  expiresAt: number;
  attempts: number;
}
const campusOtpMap = new Map<string, OtpChallenge>();

// Verified Stripe & Flutterwave transactions map
const verifiedStripeSessions = new Map<string, { uid: string; plan: string }>();
const verifiedFlutterwaveTxs = new Map<string, { uid: string; plan: string }>();

interface EntitlementPayload {
  uid: string;
  tier: 'pro';
  proSource: 'stripe' | 'flutterwave' | 'campus';
  campusDomain?: string;
  stripeSessionId?: string;
  flutterwaveTxId?: string;
  exp: number;
}

function signEntitlementToken(payload: EntitlementPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', ENTITLEMENT_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${sig}`;
}

function verifyEntitlementToken(token: string | undefined, expectedUid: string): EntitlementPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', ENTITLEMENT_SECRET)
    .update(data)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as EntitlementPayload;
    if (parsed.uid !== expectedUid) return null;
    if (parsed.exp < Date.now()) return null;
    if (parsed.tier !== 'pro') return null;
    return parsed;
  } catch {
    return null;
  }
}

interface AuthenticatedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

async function extractAuthUser(req: express.Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ') || !adminApp) {
    return null;
  }
  const idToken = authHeader.slice(7).trim();
  if (!idToken) return null;

  try {
    const decoded = await getAdminAuth(adminApp).verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email || '',
      emailVerified: Boolean(decoded.email_verified),
    };
  } catch {
    return null;
  }
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function resolveUserAccess(req: express.Request, user: AuthenticatedUser | null) {
  const entitlementHeader = req.headers['x-entitlement-token'];
  const tokenStr = Array.isArray(entitlementHeader) ? entitlementHeader[0] : entitlementHeader;

  if (user) {
    // 1. Check signed server entitlement token (Stripe or verified .edu OTP)
    const verifiedToken = verifyEntitlementToken(tokenStr, user.uid);
    if (verifiedToken) {
      return {
        tier: 'pro' as const,
        proSource: verifiedToken.proSource,
        limit: null,
        used: 0,
        remaining: null,
      };
    }

    // 2. Check if Google Sign-In email itself belongs to an active partner campus
    if (user.emailVerified && user.email.includes('@')) {
      const domain = user.email.split('@')[1].toLowerCase();
      if (PARTNER_SCHOOLS[domain]) {
        return {
          tier: 'pro' as const,
          proSource: 'campus' as const,
          limit: null,
          used: 0,
          remaining: null,
        };
      }
    }

    const key = `${getTodayKey()}:uid:${user.uid}`;
    const used = dailyUsageMap.get(key) || 0;
    return {
      tier: 'free' as const,
      proSource: 'none' as const,
      limit: FREE_DAILY_AI_LIMIT,
      used,
      remaining: Math.max(0, FREE_DAILY_AI_LIMIT - used),
      usageKey: key,
    };
  }

  const clientIp = req.ip || 'unknown';
  const key = `${getTodayKey()}:ip:${clientIp}`;
  const used = dailyUsageMap.get(key) || 0;
  return {
    tier: 'guest' as const,
    proSource: 'none' as const,
    limit: GUEST_DAILY_AI_LIMIT,
    used,
    remaining: Math.max(0, GUEST_DAILY_AI_LIMIT - used),
    usageKey: key,
  };
}

function resolveBaseUrl(req: express.Request): string {
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const host = req.get('x-forwarded-host') || req.get('host') || `localhost:${PORT}`;
  return `${protocol}://${host}`;
}

// Stripe Webhook MUST receive raw Buffer body before express.json()
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Stripe webhook not configured.' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    return res.status(400).send('Missing stripe-signature header');
  }

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.client_reference_id && session.payment_status === 'paid') {
        verifiedStripeSessions.set(session.id, {
          uid: session.client_reference_id,
          plan: session.metadata?.plan || 'yearly',
        });
      }
    }

    return res.json({ received: true });
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err?.message);
    return res.status(400).send(`Webhook Error: ${err?.message}`);
  }
});

// JSON body parser for all standard routes
app.use(express.json({ limit: '2mb' }));

// Flutterwave Webhook (verifies verif-hash header via timing-safe compare)
app.post('/api/billing/flutterwave/webhook', (req, res) => {
  const expectedHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  if (!expectedHash) {
    return res.status(503).json({ error: 'Flutterwave webhook hash not configured.' });
  }

  const signature = req.headers['verif-hash'];
  if (!signature || typeof signature !== 'string') {
    return res.status(401).send('Missing verif-hash header');
  }

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedHash);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return res.status(401).send('Invalid Flutterwave webhook signature');
  }

  const payload = req.body;
  if (payload?.event === 'charge.completed' && payload?.data?.status === 'successful') {
    const txId = String(payload.data.id || '');
    const uid = String(payload.data?.meta?.uid || '');
    const plan = String(payload.data?.meta?.plan || 'yearly');
    if (txId && uid) {
      verifiedFlutterwaveTxs.set(txId, { uid, plan });
    }
  }

  return res.status(200).json({ received: true });
});

// Billing & Platform Configuration Status
app.get('/api/billing/config', (req, res) => {
  const flutterwaveConfigured = Boolean(process.env.FLUTTERWAVE_SECRET_KEY);
  const stripeConfigured = Boolean(stripe);
  const activeProvider = flutterwaveConfigured
    ? 'flutterwave'
    : stripeConfigured
    ? 'stripe'
    : null;

  res.json({
    flutterwaveConfigured,
    stripeConfigured,
    activeProvider,
    emailVerificationConfigured: Boolean(process.env.RESEND_API_KEY),
    monthlyPriceUsd: 4.99,
    yearlyPriceUsd: 39.0,
    freeDailyAiLimit: FREE_DAILY_AI_LIMIT,
    guestDailyAiLimit: GUEST_DAILY_AI_LIMIT,
  });
});

// Current AI Usage & Tier Status
app.get('/api/usage', async (req, res) => {
  const user = await extractAuthUser(req);
  const access = resolveUserAccess(req, user);
  res.json({
    tier: access.tier,
    proSource: access.proSource,
    used: access.used,
    limit: access.limit,
    remaining: access.remaining,
    authenticated: Boolean(user),
  });
});

// Create Checkout Session (Flutterwave primary, Stripe fallback)
app.post('/api/billing/create-checkout-session', async (req, res) => {
  const user = await extractAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Please sign in with Google before upgrading to Student Pro.' });
  }

  const flwSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!flwSecretKey && !stripe) {
    return res.status(503).json({
      error:
        'Payment billing is not configured yet. Add FLUTTERWAVE_SECRET_KEY in environment settings to accept live payments.',
      code: 'BILLING_NOT_CONFIGURED',
    });
  }

  const billingCycle = req.body?.billingCycle === 'monthly' ? 'monthly' : 'yearly';
  const baseUrl = resolveBaseUrl(req);
  const requestedProvider = req.body?.provider;

  // Use Flutterwave whenever configured (unless caller explicitly asks for stripe and stripe is configured)
  if (flwSecretKey && !(requestedProvider === 'stripe' && stripe)) {
    const amount = billingCycle === 'monthly' ? 4.99 : 39;
    const txRef = `ssa_${user.uid.slice(0, 12)}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const paymentPlan =
      billingCycle === 'monthly'
        ? process.env.FLUTTERWAVE_PLAN_MONTHLY_ID
        : process.env.FLUTTERWAVE_PLAN_YEARLY_ID;

    try {
      const flwBody: Record<string, any> = {
        tx_ref: txRef,
        amount,
        currency: 'USD',
        redirect_url: `${baseUrl}/?flw_checkout=success&plan=${billingCycle}`,
        customer: {
          email: user.email || 'student@example.com',
          name: user.email ? user.email.split('@')[0] : 'Student',
        },
        meta: {
          uid: user.uid,
          plan: billingCycle,
        },
        customizations: {
          title: 'Smart Student Pro',
          description:
            billingCycle === 'monthly'
              ? 'Student Pro Monthly ($4.99/mo) — Unlimited AI Study Tools'
              : 'Student Pro Annual Pass ($39/yr) — Unlimited AI Study Tools',
        },
      };

      if (paymentPlan) {
        flwBody.payment_plan = paymentPlan;
      }

      const flwRes = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${flwSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flwBody),
      });

      const flwJson = (await flwRes.json()) as any;
      if (!flwRes.ok || flwJson?.status !== 'success' || !flwJson?.data?.link) {
        console.error('Flutterwave payment creation failed:', flwJson);
        return res.status(502).json({
          error: flwJson?.message || 'Unable to start Flutterwave checkout right now.',
        });
      }

      return res.json({
        url: flwJson.data.link,
        provider: 'flutterwave',
        txRef,
      });
    } catch (err: any) {
      console.error('Flutterwave payment error:', err?.message);
      return res.status(500).json({ error: 'Unable to connect to Flutterwave checkout.' });
    }
  }

  // Fallback to Stripe when only Stripe is configured
  if (!stripe) {
    return res.status(503).json({
      error: 'Payment billing is not configured yet.',
      code: 'BILLING_NOT_CONFIGURED',
    });
  }

  const configuredPriceId =
    billingCycle === 'monthly'
      ? process.env.STRIPE_PRICE_MONTHLY_ID
      : process.env.STRIPE_PRICE_YEARLY_ID;

  try {
    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = configuredPriceId
      ? { price: configuredPriceId, quantity: 1 }
      : {
          price_data: {
            currency: 'usd',
            product_data: {
              name:
                billingCycle === 'monthly'
                  ? 'Smart Student Pro (Monthly)'
                  : 'Smart Student Pro (Annual Pass)',
              description:
                'Unlimited AI Topic Simplifier, AI Schedule Optimizer, and AI Scholarship Essay Mentor.',
            },
            unit_amount: billingCycle === 'monthly' ? 499 : 3900,
            recurring: {
              interval: billingCycle === 'monthly' ? 'month' : 'year',
            },
          },
          quantity: 1,
        };

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [lineItem],
      client_reference_id: user.uid,
      customer_email: user.email || undefined,
      metadata: {
        uid: user.uid,
        plan: billingCycle,
      },
      success_url: `${baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?checkout=cancelled`,
    });

    return res.json({ url: session.url, sessionId: session.id, provider: 'stripe' });
  } catch (err: any) {
    console.error('Stripe checkout creation failed:', err?.message);
    return res.status(500).json({ error: 'Unable to start Stripe Checkout right now.' });
  }
});

// Verify Paid Flutterwave Transaction & Mint Signed Pro Entitlement
app.post('/api/billing/flutterwave/confirm', async (req, res) => {
  const user = await extractAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const rawTxId = req.body?.transactionId;
  const transactionId = typeof rawTxId === 'number' ? String(rawTxId) : typeof rawTxId === 'string' ? rawTxId.trim() : '';
  if (!/^[0-9]{1,32}$/.test(transactionId)) {
    return res.status(400).json({ error: 'Valid numeric Flutterwave transactionId is required.' });
  }

  const flwSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!flwSecretKey) {
    return res.status(503).json({ error: 'Flutterwave is not configured on the server.' });
  }

  try {
    const verifyRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`,
      {
        headers: { Authorization: `Bearer ${flwSecretKey}` },
      }
    );

    const verifyJson = (await verifyRes.json()) as any;
    const tx = verifyJson?.data;
    if (!verifyRes.ok || verifyJson?.status !== 'success' || !tx || tx.status !== 'successful') {
      return res.status(402).json({ error: 'Flutterwave payment has not completed yet.' });
    }

    const plan = tx.meta?.plan === 'monthly' ? 'monthly' : 'yearly';
    const expectedAmount = plan === 'monthly' ? 4.99 : 39;
    const currencyOk = String(tx.currency || '').toUpperCase() === 'USD';
    const amountOk = Number(tx.amount) >= expectedAmount;

    if (!currencyOk || !amountOk) {
      return res.status(402).json({ error: 'Verified payment amount or currency mismatch.' });
    }

    const metaUidMatches = tx.meta?.uid === user.uid;
    const refAndEmailMatch =
      typeof tx.tx_ref === 'string' &&
      tx.tx_ref.startsWith(`ssa_${user.uid.slice(0, 12)}_`) &&
      typeof tx.customer?.email === 'string' &&
      tx.customer.email.toLowerCase() === user.email.toLowerCase();

    if (!metaUidMatches && !refAndEmailMatch) {
      return res.status(403).json({ error: 'Transaction does not belong to this account.' });
    }

    const flwTxId = String(tx.id);
    verifiedFlutterwaveTxs.set(flwTxId, { uid: user.uid, plan });

    const entitlementToken = signEntitlementToken({
      uid: user.uid,
      tier: 'pro',
      proSource: 'flutterwave',
      flutterwaveTxId: flwTxId,
      exp: Date.now() + 1000 * 60 * 60 * 24 * (plan === 'monthly' ? 35 : 366),
    });

    return res.json({
      verified: true,
      tier: 'pro',
      proSource: 'flutterwave',
      flutterwaveTxId: flwTxId,
      entitlementToken,
    });
  } catch (err: any) {
    console.error('Flutterwave verification failed:', err?.message);
    return res.status(400).json({ error: 'Could not verify Flutterwave payment.' });
  }
});

// Verify Paid Stripe Session & Mint Signed Pro Entitlement
app.post('/api/billing/confirm-checkout', async (req, res) => {
  const user = await extractAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const sessionId = req.body?.sessionId;
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 200) {
    return res.status(400).json({ error: 'Valid Stripe sessionId is required.' });
  }

  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured on the server.' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.client_reference_id !== user.uid) {
      return res.status(403).json({ error: 'Checkout session does not belong to this account.' });
    }

    const isPaid = session.payment_status === 'paid' || session.status === 'complete';
    if (!isPaid) {
      return res.status(402).json({ error: 'Payment has not completed yet.' });
    }

    verifiedStripeSessions.set(session.id, {
      uid: user.uid,
      plan: session.metadata?.plan || 'yearly',
    });

    const entitlementToken = signEntitlementToken({
      uid: user.uid,
      tier: 'pro',
      proSource: 'stripe',
      stripeSessionId: session.id,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 365,
    });

    return res.json({
      verified: true,
      tier: 'pro',
      proSource: 'stripe',
      stripeSessionId: session.id,
      entitlementToken,
    });
  } catch (err: any) {
    console.error('Stripe session verification failed:', err?.message);
    return res.status(400).json({ error: 'Could not verify Stripe payment session.' });
  }
});

// Auto-Verify Campus Partner if Google Sign-In Email Matches Active Partner Domain
app.post('/api/campus/auto-verify', async (req, res) => {
  const user = await extractAuthUser(req);
  if (!user || !user.emailVerified || !user.email.includes('@')) {
    return res.json({ verified: false });
  }

  const domain = user.email.split('@')[1].toLowerCase();
  const partner = PARTNER_SCHOOLS[domain];
  if (!partner) {
    return res.json({ verified: false });
  }

  const entitlementToken = signEntitlementToken({
    uid: user.uid,
    tier: 'pro',
    proSource: 'campus',
    campusDomain: domain,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 180,
  });

  return res.json({
    verified: true,
    tier: 'pro',
    proSource: 'campus',
    campusDomain: domain,
    institutionName: partner.name,
    partnerId: partner.id,
    entitlementToken,
  });
});

// Send 6-Digit OTP to Verify Secondary .edu Email via Resend
app.post('/api/campus/send-code', async (req, res) => {
  const user = await extractAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Please sign in with Google first.' });
  }

  const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) || rawEmail.length > 254) {
    return res.status(400).json({ error: 'Please enter a valid school email address.' });
  }

  const domain = rawEmail.split('@')[1];
  const partner = PARTNER_SCHOOLS[domain];
  if (!partner) {
    return res.status(404).json({
      error: `The domain "@${domain}" is not currently in our active campus partner list. Submit a Campus Pilot Request below to add your school.`,
    });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return res.status(503).json({
      error:
        'Transactional campus email delivery is not configured yet (RESEND_API_KEY missing). If your Google account uses @' +
        domain +
        ', sign in directly with that Google account for instant verification.',
      code: 'EMAIL_NOT_CONFIGURED',
    });
  }

  const otp = String(crypto.randomInt(100000, 999999));
  const codeHash = crypto.createHash('sha256').update(`${user.uid}:${rawEmail}:${otp}`).digest('hex');

  campusOtpMap.set(`${user.uid}:${rawEmail}`, {
    codeHash,
    domain,
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0,
  });

  try {
    const emailResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Smart Student Assistant <onboarding@resend.dev>',
        to: [rawEmail],
        subject: `Your ${partner.name} Campus Pro Verification Code`,
        html: `<p>Your Smart Student Pro verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
      }),
    });

    if (!emailResp.ok) {
      const errText = await emailResp.text();
      console.error('Resend API error:', errText);
      return res.status(502).json({ error: 'Failed to send verification email.' });
    }

    return res.json({ sent: true, domain, institutionName: partner.name });
  } catch (err) {
    console.error('Email send error:', err);
    return res.status(500).json({ error: 'Error dispatching campus verification email.' });
  }
});

// Verify 6-Digit Campus OTP & Mint Signed Pro Entitlement
app.post('/api/campus/verify-code', async (req, res) => {
  const user = await extractAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';

  const key = `${user.uid}:${rawEmail}`;
  const challenge = campusOtpMap.get(key);
  if (!challenge) {
    return res.status(400).json({ error: 'No active verification code found. Please request a new code.' });
  }

  if (Date.now() > challenge.expiresAt) {
    campusOtpMap.delete(key);
    return res.status(400).json({ error: 'Verification code expired. Please request a new one.' });
  }

  if (challenge.attempts >= 5) {
    campusOtpMap.delete(key);
    return res.status(429).json({ error: 'Too many failed attempts. Please request a new code.' });
  }

  challenge.attempts += 1;
  const candidateHash = crypto.createHash('sha256').update(`${user.uid}:${rawEmail}:${code}`).digest('hex');

  const isMatch = crypto.timingSafeEqual(
    Buffer.from(candidateHash, 'hex'),
    Buffer.from(challenge.codeHash, 'hex')
  );

  if (!isMatch) {
    return res.status(400).json({ error: 'Invalid verification code. Please check your email and try again.' });
  }

  campusOtpMap.delete(key);
  const partner = PARTNER_SCHOOLS[challenge.domain];

  const entitlementToken = signEntitlementToken({
    uid: user.uid,
    tier: 'pro',
    proSource: 'campus',
    campusDomain: challenge.domain,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 180,
  });

  return res.json({
    verified: true,
    tier: 'pro',
    proSource: 'campus',
    campusDomain: challenge.domain,
    institutionName: partner?.name || challenge.domain,
    partnerId: partner?.id,
    entitlementToken,
  });
});

// Fallback topic explanations when API key is not configured or in offline mode
const FALLBACK_EXPLANATIONS: Record<string, Record<string, string>> = {
  default: {
    eli5: `Imagine this concept like a busy kitchen in your favorite burger restaurant! Every cook has one job, orders come in on tickets, and if one station gets backed up, everyone helps out. In simple terms: it breaks a big complicated problem into tiny steps so nothing gets dropped.`,
    analogy: `Think of this like an airport baggage carousel. Instead of passengers running onto the tarmac to grab luggage, bags flow systematically along an organized loop until each owner picks up theirs effortlessly.`,
    feynman: `**Core Principle:** Break the concept into fundamental pieces with zero jargon.\n\n1. **What is it really doing?** Transforming raw input into structured output.\n2. **Why does it matter?** Without it, complexity scales exponentially and systems crash.\n3. **Test your understanding:** If you can't describe it without technical acronyms, you don't fully own the concept yet.`,
    summary: `• **Fundamental Definition:** A structured mechanism designed to solve complex coordination problems.\n• **Key Components:** Input variables, processing rules, feedback loop.\n• **Exam Tip:** Focus on boundary cases and how state changes when unexpected input occurs.`,
  },
};

// Server-side Quota Guard Helper for AI Routes
async function checkAndConsumeAiQuota(req: express.Request, res: express.Response) {
  const user = await extractAuthUser(req);
  const access = resolveUserAccess(req, user);

  if (access.tier !== 'pro' && access.limit !== null && access.used >= access.limit) {
    res.status(402).json({
      error: user
        ? `You have used all ${access.limit} free AI study sessions for today. Upgrade to Student Pro or verify a partner campus email for unlimited access.`
        : `Guest trial limit reached (${access.limit}/${access.limit}). Sign in with Google for 5 free daily sessions, or upgrade to Student Pro for unlimited AI.`,
      code: 'PRO_REQUIRED',
      usage: {
        tier: access.tier,
        used: access.used,
        limit: access.limit,
        remaining: 0,
      },
    });
    return null;
  }

  if (access.tier !== 'pro' && access.usageKey) {
    const nextUsed = access.used + 1;
    dailyUsageMap.set(access.usageKey, nextUsed);
    return {
      tier: access.tier,
      used: nextUsed,
      limit: access.limit,
      remaining: access.limit !== null ? Math.max(0, access.limit - nextUsed) : null,
    };
  }

  return {
    tier: access.tier,
    used: access.used,
    limit: null,
    remaining: null,
  };
}

// API Route: AI Topic Simplifier (Quota-gated)
app.post('/api/ai/explain', async (req, res) => {
  const { topic, subject, mode = 'eli5', level = 'university', extraContext = '' } = req.body;

  if (!topic || typeof topic !== 'string' || topic.length > 300) {
    return res.status(400).json({ error: 'A valid topic (under 300 characters) is required.' });
  }

  const usage = await checkAndConsumeAiQuota(req, res);
  if (!usage) return;

  const promptModeInstructions: Record<string, string> = {
    eli5: 'Explain this like I am a 10-year-old. Use clear, vivid, intuitive real-world metaphors. Avoid confusing technical jargon or define it instantly with a friendly everyday comparison.',
    analogy: 'Focus entirely on creating a brilliant, memorable, real-world analogy (e.g. food, sports, transportation, video games) that makes the concept instantly click.',
    feynman: 'Use the Feynman Technique: assume zero prior domain knowledge, break down step-by-step why and how it works, address common misconceptions, and provide a quick intuitive thought experiment.',
    summary: 'Provide an ultra-crisp high-yield study sheet summary: 1-sentence definition, 3-4 bullet takeaways, common exam trap to avoid, and a memory mnemonic.',
    quiz: 'Generate 3 interactive flashcard quiz questions to test deep understanding of this topic. For each question, provide the question, a hint, and the clear answer.',
  };

  const instruction = promptModeInstructions[mode] || promptModeInstructions.eli5;
  const safeSubject = typeof subject === 'string' ? subject.slice(0, 120) : 'General Academic';
  const safeExtra = typeof extraContext === 'string' ? extraContext.slice(0, 500) : '';

  const prompt = `You are the world's most gifted student tutor and academic mentor.
Target audience: ${level === 'high_school' ? 'High School Student' : 'University Undergrad'}.
Subject: ${safeSubject}.
Topic: "${topic}".
Goal: ${instruction}
${safeExtra ? `Student's specific question or context: "${safeExtra}"` : ''}

Output format:
Return well-structured, inspiring, and clear Markdown. Use bold headers, bullet points, and highlighted insights where helpful. Keep it engaging, encouraging, and razor-sharp.`;

  if (geminiClient && process.env.GEMINI_API_KEY) {
    try {
      const apiCall = geminiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout')), 9000)
      );

      const response: any = await Promise.race([apiCall, timeoutPromise]);
      const explanation = response.text || 'Unable to generate explanation at this time.';
      return res.json({ explanation, mode, topic, usage });
    } catch (apiError: any) {
      console.error('Gemini API Error / Timeout:', apiError?.message || apiError);
    }
  }

  const fallback = FALLBACK_EXPLANATIONS.default[mode] || FALLBACK_EXPLANATIONS.default.eli5;
  const enrichedFallback = `### ${topic} (${String(mode).toUpperCase()} Mode)
*Note: Generating enhanced study guide based on student curriculum model.*

${fallback}

#### Quick Understanding Check
- **Question:** How would you describe the main mechanism of **${topic}** in your own words?
- **Key Insight:** Master the intuition first before memorizing formulas or dense textbook definitions.`;

  return res.json({
    explanation: enrichedFallback,
    mode,
    topic,
    isFallback: true,
    usage,
  });
});

// API Route: AI Smart Study Schedule Generator (Quota-gated)
app.post('/api/ai/schedule', async (req, res) => {
  const { tasks = [], availableHours = 4, studyStyle = 'balanced' } = req.body;

  const usage = await checkAndConsumeAiQuota(req, res);
  if (!usage) return;

  const safeHours = Math.min(16, Math.max(0.5, Number(availableHours) || 4));
  const safeStyle = typeof studyStyle === 'string' ? studyStyle.slice(0, 40) : 'balanced';

  const prompt = `You are an expert academic time-management coach.
A student has ${safeHours} hours available for study today.
Study style preference: "${safeStyle}" (e.g., pomodoro, deep_work, balanced, sprint).
Their pending tasks/exams to prepare for:
${JSON.stringify(tasks, null, 2).slice(0, 4000)}

Create an optimal, realistic study schedule divided into timed blocks. Include:
1. Warm-up and highest-cognitive-demand tasks first.
2. Planned 5-10 min bio/stretch breaks.
3. Specific review & active recall intervals.
4. An encouraging motivation quote tailored to their workload.

Return clean Markdown with a table or time-block list (e.g., "09:00 - 09:45: Deep Focus on ...").`;

  if (geminiClient && process.env.GEMINI_API_KEY) {
    try {
      const apiCall = geminiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout')), 9000)
      );

      const response: any = await Promise.race([apiCall, timeoutPromise]);
      return res.json({ schedule: response.text, usage });
    } catch (apiError: any) {
      console.error('Gemini Schedule Error / Timeout:', apiError?.message || apiError);
    }
  }

  return res.json({
    schedule: `### Generated ${safeHours}-Hour Optimized Study Schedule (${safeStyle.toUpperCase()})

| Time Slot | Phase | Focus Task & Activity | Strategy |
| :--- | :--- | :--- | :--- |
| Block 1 (50m) | Peak Focus | Priority Assignment / Difficult Concepts | Feynman breakdown & active problem solving |
| Break (10m) | Rest | Hydration, physical stretch, eyes off screen | Passive mental consolidation |
| Block 2 (50m) | Core Work | Exam Review & Flashcards | Spaced retrieval practice & practice questions |
| Break (10m) | Rest | Light walk or snack | Reset focus |
| Block 3 (45m) | Synthesis | Notes Organizing & Submission Prep | Rubric check & final proofread |
| Wrap-up (15m)| Planning | Next-day task queuing & celebration | Habit reinforcement |

> *"Continuous small efforts conquer the steepest academic mountains. You've got this!"*`,
    isFallback: true,
    usage,
  });
});

// API Route: AI Scholarship Essay Hook & Feedback (Quota-gated)
app.post('/api/ai/scholarship-essay', async (req, res) => {
  const { scholarshipTitle, promptTopic, studentBackground, wordLimit = 500 } = req.body;

  const usage = await checkAndConsumeAiQuota(req, res);
  if (!usage) return;

  const safeTitle = typeof scholarshipTitle === 'string' ? scholarshipTitle.slice(0, 200) : 'Merit & Need Scholarship';
  const safePrompt = typeof promptTopic === 'string' ? promptTopic.slice(0, 1000) : 'Describe your academic goals and a challenge you overcame.';
  const safeBg = typeof studentBackground === 'string' ? studentBackground.slice(0, 1000) : 'Undergraduate student balancing academics, community leadership, and financial independence.';

  const prompt = `You are a prestigious scholarship admissions committee coach and personal essay mentor.
The student is applying for: "${safeTitle}"
Essay Prompt / Question: "${safePrompt}"
Student Background & Major: "${safeBg}"
Target Word Count: ~${Number(wordLimit) || 500} words.

Provide:
1. **3 Distinct Hook Concepts** (Narrative in media res, Metaphorical perspective, Values & Vision hook).
2. **Structural Outline (Beginning, Challenge & Action, Impact & Future Contribution)**.
3. **Scholarship Committee Pro-Tips**: What reviewers look for in this specific scholarship profile.
4. **Phrases to Avoid** (clichés that weaken student essays).

Format as elegant, motivating Markdown.`;

  if (geminiClient && process.env.GEMINI_API_KEY) {
    try {
      const apiCall = geminiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout')), 9000)
      );

      const response: any = await Promise.race([apiCall, timeoutPromise]);
      return res.json({ feedback: response.text, usage });
    } catch (apiError: any) {
      console.error('Gemini Scholarship Essay Error / Timeout:', apiError?.message || apiError);
    }
  }

  return res.json({
    feedback: `### Scholarship Strategy Guide for "${safeTitle}"

#### 1. Three Compelling Opening Hooks
- **The Crucible Moment:** Begin in the middle of solving a real problem (e.g., *"At 2 AM with a failing circuit board, I realized true engineering is less about instant perfection and more about relentless patience..."*)
- **The Community Lens:** Connect personal curiosity with measurable community need.
- **The Counter-Intuitive Truth:** State a core insight learned through hardship that shaped your academic ambition.

#### 2. The Winning 4-Part Structure
1. **The Catalyst (15%):** Specific personal incident that sparked your academic drive.
2. **The Obstacle & Initiative (35%):** Don't just list hardships; detail the concrete actions *you* spearheaded.
3. **The Proof of Impact (30%):** Tangible results, lessons, mentorship, or grades maintained under pressure.
4. **The Forward Investment (20%):** Exactly how this scholarship will catalyze your career to give back.

#### 3. Committee Reviewer Pro-Tips
- *Show, don't tell:* Replace general statements with vivid specifics.
- Align with the donor's core mission: highlight collaboration, initiative, and community impact.`,
    isFallback: true,
    usage,
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    flutterwaveConfigured: Boolean(process.env.FLUTTERWAVE_SECRET_KEY),
    stripeConfigured: Boolean(stripe),
    firebaseConfigured: Boolean(firebaseProjectId),
    timestamp: new Date().toISOString(),
  });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.RENDER) ||
    Boolean(process.env.RAILWAY_ENVIRONMENT);

  if (isProduction) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
