import React, { useState, useEffect } from 'react';
import {
  Building2,
  Sparkles,
  Check,
  ShieldCheck,
  Users,
  GraduationCap,
  Crown,
  Mail,
  KeyRound,
  CreditCard,
  Search,
  X,
  AlertCircle,
  CheckCircle2,
  XCircle,
  LogIn,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { StudentProfile, PartnerInquiry } from '../types/student';
import { UNIVERSITY_PARTNERS } from '../data/mockData';
import { useAppSync } from '../context/AuthAndSyncContext';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';

interface MonetizationViewProps {
  profile: StudentProfile;
  setProfile: (updater: React.SetStateAction<StudentProfile>) => void | Promise<void>;
}

interface BillingConfig {
  flutterwaveConfigured: boolean;
  stripeConfigured: boolean;
  activeProvider: 'flutterwave' | 'stripe' | null;
  emailVerificationConfigured: boolean;
  monthlyPriceUsd: number;
  yearlyPriceUsd: number;
  freeDailyAiLimit: number;
  guestDailyAiLimit: number;
}

export const MonetizationView: React.FC<MonetizationViewProps> = ({ profile }) => {
  const {
    firebaseUser,
    isAdmin,
    signInWithGoogle,
    authorizedFetch,
    applyEntitlement,
    aiUsage,
  } = useAppSync();

  const [billingConfig, setBillingConfig] = useState<BillingConfig>({
    flutterwaveConfigured: false,
    stripeConfigured: false,
    activeProvider: null,
    emailVerificationConfigured: false,
    monthlyPriceUsd: 4.99,
    yearlyPriceUsd: 39.0,
    freeDailyAiLimit: 5,
    guestDailyAiLimit: 2,
  });

  // Campus .edu OTP verification state
  const [eduEmailInput, setEduEmailInput] = useState('');
  const [otpStep, setOtpStep] = useState<'email' | 'code'>('email');
  const [otpCode, setOtpCode] = useState('');
  const [campusLoading, setCampusLoading] = useState(false);
  const [claimStatus, setClaimStatus] = useState<{
    type: 'ok' | 'info' | 'err';
    text: string;
  } | null>(null);

  // Stripe checkout state
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState<{
    type: 'info' | 'err';
    text: string;
  } | null>(null);

  // Partner showcase filter
  const [partnerFilter, setPartnerFilter] = useState('');

  // Campus Pilot Inquiry Modal state
  const [isPilotModalOpen, setIsPilotModalOpen] = useState(false);
  const [institutionName, setInstitutionName] = useState('');
  const [institutionDomain, setInstitutionDomain] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [estimatedSeats, setEstimatedSeats] = useState(500);
  const [inquiryNotes, setInquiryNotes] = useState('');
  const [pilotSubmitting, setPilotSubmitting] = useState(false);
  const [pilotMessage, setPilotMessage] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  // Real-time inquiries list (admin sees all; verified non-admin sees own)
  const [inquiries, setInquiries] = useState<PartnerInquiry[]>([]);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/billing/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setBillingConfig(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified) {
      setInquiries([]);
      return;
    }

    const q = isAdmin
      ? collection(db, 'partnerInquiries')
      : query(collection(db, 'partnerInquiries'), where('requesterUid', '==', firebaseUser.uid));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: PartnerInquiry[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: data.id || d.id,
            requesterUid: data.requesterUid,
            institutionName: data.institutionName,
            domain: data.domain,
            contactName: data.contactName,
            contactRole: data.contactRole,
            contactEmail: data.contactEmail,
            estimatedSeats: data.estimatedSeats,
            notes: data.notes,
            status: data.status,
          };
        });
        setInquiries(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'partnerInquiries')
    );

    return () => unsub();
  }, [firebaseUser, isAdmin]);

  const handleSendCampusOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eduEmailInput.trim()) return;
    setClaimStatus(null);

    if (!firebaseUser) {
      try {
        await signInWithGoogle();
      } catch {
        setClaimStatus({
          type: 'err',
          text: 'Please sign in with Google first to link your verified campus pass.',
        });
        return;
      }
    }

    setCampusLoading(true);
    try {
      const res = await authorizedFetch('/api/campus/send-code', {
        method: 'POST',
        body: JSON.stringify({ email: eduEmailInput.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setClaimStatus({
          type: data.code === 'EMAIL_NOT_CONFIGURED' ? 'info' : 'err',
          text: data.error || 'Could not send campus verification code.',
        });
        return;
      }

      setOtpStep('code');
      setClaimStatus({
        type: 'info',
        text: `A 6-digit verification code has been sent to ${eduEmailInput.trim()} (${data.institutionName}). Check your inbox and enter it below.`,
      });
    } catch {
      setClaimStatus({
        type: 'err',
        text: 'Network error while sending campus verification email.',
      });
    } finally {
      setCampusLoading(false);
    }
  };

  const handleVerifyCampusOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) return;
    setCampusLoading(true);
    setClaimStatus(null);

    try {
      const res = await authorizedFetch('/api/campus/verify-code', {
        method: 'POST',
        body: JSON.stringify({
          email: eduEmailInput.trim(),
          code: otpCode.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.verified) {
        setClaimStatus({
          type: 'err',
          text: data.error || 'Invalid verification code.',
        });
        return;
      }

      await applyEntitlement({
        proSource: 'campus',
        entitlementToken: data.entitlementToken,
        campusDomain: data.campusDomain,
        institutionName: data.institutionName,
        partnerId: data.partnerId,
      });

      setOtpStep('email');
      setOtpCode('');
      setClaimStatus({
        type: 'ok',
        text: `Verified! ${data.institutionName} sponsors full Student Pro access for your account.`,
      });
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch {
        // ignore confetti failure
      }
    } catch {
      setClaimStatus({
        type: 'err',
        text: 'Unable to verify code right now. Please try again.',
      });
    } finally {
      setCampusLoading(false);
    }
  };

  const handleStartStripeCheckout = async () => {
    setCheckoutNotice(null);

    if (!firebaseUser) {
      try {
        await signInWithGoogle();
      } catch {
        setCheckoutNotice({
          type: 'err',
          text: 'Please sign in with Google before starting Student Pro checkout.',
        });
      }
      return;
    }

    setCheckoutLoading(true);
    try {
      const res = await authorizedFetch('/api/billing/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ billingCycle }),
      });
      const data = await res.json();

      if (res.status === 503 || data.code === 'BILLING_NOT_CONFIGURED' || data.code === 'STRIPE_NOT_CONFIGURED') {
        setCheckoutNotice({
          type: 'info',
          text:
            data.error ||
            'Flutterwave checkout is waiting on FLUTTERWAVE_SECRET_KEY in server environment settings.',
        });
        return;
      }

      if (!res.ok || !data.url) {
        setCheckoutNotice({
          type: 'err',
          text: data.error || 'Could not start payment checkout session.',
        });
        return;
      }

      window.location.assign(data.url);
    } catch {
      setCheckoutNotice({
        type: 'err',
        text: 'Network error contacting billing service.',
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleSubmitPilotInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setPilotMessage(null);

    if (!firebaseUser || !firebaseUser.emailVerified) {
      setPilotMessage({
        type: 'err',
        text: 'Please sign in with Google before submitting a campus pilot inquiry.',
      });
      return;
    }

    const cleanInst = institutionName.trim().slice(0, 150);
    const cleanDomain = institutionDomain.trim().toLowerCase().replace(/^@/, '').slice(0, 120);
    const cleanName = contactName.trim().slice(0, 100);
    const cleanRole = contactRole.trim().slice(0, 100);
    const cleanEmail = contactEmail.trim().slice(0, 254);
    const cleanSeats = Math.min(500000, Math.max(1, Number(estimatedSeats) || 100));
    const cleanNotes = inquiryNotes.trim().slice(0, 2000);

    if (cleanInst.length < 2 || cleanDomain.length < 3 || cleanName.length < 2 || cleanRole.length < 2 || cleanEmail.length < 5) {
      setPilotMessage({
        type: 'err',
        text: 'Please fill out all required institution and contact fields.',
      });
      return;
    }

    setPilotSubmitting(true);
    const inquiryId = `inq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    try {
      await setDoc(doc(db, 'partnerInquiries', inquiryId), {
        id: inquiryId,
        requesterUid: firebaseUser.uid,
        institutionName: cleanInst,
        domain: cleanDomain,
        contactName: cleanName,
        contactRole: cleanRole,
        contactEmail: cleanEmail,
        estimatedSeats: cleanSeats,
        ...(cleanNotes ? { notes: cleanNotes } : {}),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setPilotMessage({
        type: 'ok',
        text: 'Campus pilot inquiry saved! Our university relations team will review your domain request.',
      });
      setInstitutionName('');
      setInstitutionDomain('');
      setContactName('');
      setContactRole('');
      setContactEmail('');
      setInquiryNotes('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `partnerInquiries/${inquiryId}`);
    } finally {
      setPilotSubmitting(false);
    }
  };

  const handleUpdateInquiryStatus = async (inquiryId: string, status: 'approved' | 'declined') => {
    setActionBusyId(inquiryId);
    try {
      await updateDoc(doc(db, 'partnerInquiries', inquiryId), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `partnerInquiries/${inquiryId}`);
    } finally {
      setActionBusyId(null);
    }
  };

  const filteredPartners = UNIVERSITY_PARTNERS.filter(
    (p) =>
      p.name.toLowerCase().includes(partnerFilter.toLowerCase()) ||
      p.domain.toLowerCase().includes(partnerFilter.toLowerCase())
  );

  const isProActive = profile.isPro || aiUsage.tier === 'pro';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Top Hero */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
          <Building2 className="w-3.5 h-3.5 text-indigo-600" />
          <span>Billing, Campus Licensing & Pro Access</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Campus Partnerships & Student Pro
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Unlock unlimited Gemini AI Simplifications, Study Schedule Optimization, and Scholarship
          Essay Mentoring—sponsored by partner schools or via affordable student plans.
        </p>
      </div>

      {/* Campus .EDU Verification Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-xs mb-3 text-indigo-200">
            <GraduationCap className="w-4 h-4 text-amber-300" />
            <span>Campus Institutional Licensing Verification</span>
          </div>

          {isProActive && profile.proSource === 'campus' ? (
            <div className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-300" />
                <span>Campus Pro Active — {profile.institution}</span>
              </h2>
              <p className="text-xs sm:text-sm text-indigo-100">
                Your verified institutional credential
                {profile.campusDomain ? ` (@${profile.campusDomain})` : ''} grants unlimited AI study
                tools at $0 cost to you.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-xl sm:text-2xl font-bold">
                Does your school provide free Pro access?
              </h2>
              <p className="text-xs sm:text-sm text-indigo-200 mt-2">
                Sign in with an active partner Google Workspace email (auto-verified instantly) or
                verify a secondary <code className="text-amber-200">.edu</code> email with a
                6-digit one-time code.
              </p>

              {otpStep === 'email' ? (
                <form
                  onSubmit={handleSendCampusOtp}
                  className="mt-5 flex flex-col sm:flex-row gap-2 max-w-lg"
                >
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={eduEmailInput}
                      onChange={(e) => setEduEmailInput(e.target.value)}
                      placeholder="e.g. yourname@statetech.edu or @stanford.edu"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={campusLoading}
                    className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 text-xs font-bold shadow-md transition-all whitespace-nowrap"
                  >
                    {campusLoading ? 'Sending Code...' : 'Send Verification Code'}
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={handleVerifyCampusOtp}
                  className="mt-5 flex flex-col sm:flex-row gap-2 max-w-lg"
                >
                  <div className="relative flex-1">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Enter 6-digit code from your .edu inbox"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono font-bold tracking-widest"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={campusLoading}
                    className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-60 text-slate-950 text-xs font-bold shadow-md transition-all whitespace-nowrap"
                  >
                    {campusLoading ? 'Verifying...' : 'Verify & Unlock'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep('email');
                      setOtpCode('');
                      setClaimStatus(null);
                    }}
                    className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
                  >
                    Change Email
                  </button>
                </form>
              )}

              {claimStatus && (
                <div
                  className={`mt-3 p-3 rounded-xl text-xs font-semibold border ${
                    claimStatus.type === 'ok'
                      ? 'bg-emerald-500/20 border-emerald-300/40 text-emerald-100'
                      : claimStatus.type === 'info'
                      ? 'bg-white/10 border-white/20 text-indigo-100'
                      : 'bg-rose-500/20 border-rose-300/40 text-rose-100'
                  }`}
                >
                  {claimStatus.text}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Two Revenue Engines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Engine 1: University Partnerships */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              1. University & District Partnerships
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
              Universities and high schools license Smart Student Assistant directly so every
              enrolled student receives unlimited AI study tools and scholarship support.
            </p>

            <div className="mt-6 space-y-3">
              {[
                {
                  title: 'Campus-wide SSO & Verification',
                  desc: 'Instant verification via Google Workspace for Education or .edu OTP codes',
                },
                {
                  title: 'Subsidized Seat Licensing',
                  desc: '$3 - $5/student per academic year, billed annually to department budgets',
                },
                {
                  title: 'Advising & Retention Impact',
                  desc: 'Improves STEM course mastery, exam readiness, and scholarship completion',
                },
                {
                  title: 'Rapid Campus Pilot Onboarding',
                  desc: 'Submit your institution domain below to activate a department pilot',
                },
              ].map((perk, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">{perk.title}: </span>
                    <span className="text-slate-500">{perk.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
            <span className="font-bold text-slate-900">
              Are you a faculty member or student rep?{' '}
            </span>
            <span className="text-slate-600">
              Submit an institutional pilot request for your department or campus student union.
            </span>
            <button
              onClick={() => {
                setPilotMessage(null);
                setContactEmail(firebaseUser?.email || '');
                setContactName(firebaseUser?.displayName || '');
                setIsPilotModalOpen(true);
              }}
              className="mt-3 w-full py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-200 rounded-xl transition-colors"
            >
              Request Campus Pilot Kit
            </button>
          </div>
        </div>

        {/* Engine 2: Student Pro Individual Plan (Stripe Checkout) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs flex flex-col justify-between space-y-6 relative overflow-hidden">
          <div className="absolute top-4 right-4 flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
              Student Budget Friendly
            </span>
          </div>

          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">2. Student Pro Study Tools</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
              Free accounts include {billingConfig.freeDailyAiLimit} daily AI study sessions (
              {billingConfig.guestDailyAiLimit}/day as guest). Upgrade for unlimited AI access.
            </p>

            {/* Price display */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">
                  {billingCycle === 'yearly'
                    ? `$${(billingConfig.yearlyPriceUsd / 12).toFixed(2)}`
                    : `$${billingConfig.monthlyPriceUsd.toFixed(2)}`}
                </span>
                <span className="text-xs text-slate-500 font-medium">/ month</span>
              </div>
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-2.5 py-1 rounded ${
                    billingCycle === 'monthly'
                      ? 'bg-white shadow-xs text-slate-900'
                      : 'text-slate-600'
                  }`}
                >
                  Monthly ($4.99)
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-2.5 py-1 rounded ${
                    billingCycle === 'yearly'
                      ? 'bg-white shadow-xs text-slate-900'
                      : 'text-slate-600'
                  }`}
                >
                  Yearly ($39 • Save 35%)
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {[
                {
                  title: 'Unlimited AI Concept Simplifications',
                  desc: 'ELI5, Feynman Technique, flashcards, and everyday analogies for every subject',
                },
                {
                  title: 'AI Scholarship Essay Mentor',
                  desc: 'Tailored narrative hooks, outline strategy, and reviewer tips without daily caps',
                },
                {
                  title: 'AI Schedule Optimizer',
                  desc: 'Adaptive time-blocked daily study plans built from your assignments & exams',
                },
                {
                  title: 'Cloud Sync Across Devices',
                  desc: 'Your assignments, notes, scholarships, and Pro pass saved to your Google account',
                },
              ].map((perk, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs">
                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">{perk.title}: </span>
                    <span className="text-slate-500">{perk.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {checkoutNotice && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold border flex items-start gap-2 ${
                  checkoutNotice.type === 'info'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{checkoutNotice.text}</span>
              </div>
            )}

            {isProActive ? (
              <div className="w-full py-3 px-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
                <Crown className="w-4 h-4 text-emerald-600" />
                <span>
                  {profile.proSource === 'campus'
                    ? `Campus Pro Active (${profile.institution})`
                    : profile.proSource === 'flutterwave'
                    ? 'Student Pro Active via Flutterwave'
                    : 'Student Pro Active via Stripe'}
                </span>
              </div>
            ) : (
              <button
                onClick={handleStartStripeCheckout}
                disabled={checkoutLoading}
                className="w-full py-3 px-4 rounded-2xl text-xs font-bold transition-all shadow-md bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white hover:opacity-95 shadow-indigo-600/25 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {checkoutLoading
                    ? 'Opening Checkout...'
                    : !firebaseUser
                    ? 'Sign In & Upgrade to Student Pro'
                    : billingCycle === 'yearly'
                    ? 'Upgrade to Student Pro ($39/yr)'
                    : 'Upgrade to Student Pro ($4.99/mo)'}
                </span>
              </button>
            )}

            <p className="text-[10px] text-center text-slate-400">
              {billingConfig.flutterwaveConfigured
                ? 'Secure Card, Bank Transfer & Mobile Money checkout powered by Flutterwave'
                : billingConfig.stripeConfigured
                ? 'Secure card checkout powered by Stripe • Cancel anytime'
                : 'Live Flutterwave Checkout ready as soon as FLUTTERWAVE_SECRET_KEY is configured'}
            </p>
          </div>
        </div>
      </div>

      {/* User's Own Pilot Inquiries or Admin Console */}
      {firebaseUser && (isAdmin || inquiries.length > 0) && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>
                  {isAdmin ? 'Admin Console: Campus Pilot Inquiries' : 'Your Campus Pilot Requests'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAdmin
                  ? 'Review, approve, or decline institutional pilot requests submitted by schools.'
                  : 'Track the status of your submitted institutional pilot requests.'}
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {inquiries.length} {inquiries.length === 1 ? 'Inquiry' : 'Inquiries'}
            </span>
          </div>

          {inquiries.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No campus pilot inquiries submitted yet.
            </div>
          ) : (
            <div className="space-y-3">
              {inquiries.map((inq) => (
                <div
                  key={inq.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{inq.institutionName}</span>
                      <span className="text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        @{inq.domain}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          inq.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inq.status === 'declined'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inq.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      Contact: <span className="font-semibold">{inq.contactName}</span> ({inq.contactRole}) •{' '}
                      {inq.contactEmail} • Est. {inq.estimatedSeats.toLocaleString()} seats
                    </div>
                    {inq.notes && <p className="text-xs text-slate-500 italic">"{inq.notes}"</p>}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        disabled={actionBusyId === inq.id || inq.status === 'approved'}
                        onClick={() => handleUpdateInquiryStatus(inq.id, 'approved')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        disabled={actionBusyId === inq.id || inq.status === 'declined'}
                        onClick={() => handleUpdateInquiryStatus(inq.id, 'declined')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Participating Institutions Showcase */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Active Partner Campuses & High School Districts</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Students from these institutions receive automatic Pro access when signing in with
              their campus domain.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={partnerFilter}
              onChange={(e) => setPartnerFilter(e.target.value)}
              placeholder="Filter campuses or @domain..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPartners.map((partner) => (
            <div
              key={partner.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="text-xs font-bold text-slate-900">{partner.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase shrink-0">
                  {partner.status}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">@{partner.domain}</div>
              <div className="text-xs text-indigo-700 font-semibold mt-2">
                {partner.studentsEnrolled.toLocaleString()} students enrolled
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Campus Pilot Inquiry Modal */}
      {isPilotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Request Campus Pilot Kit</h3>
                <p className="text-xs text-slate-500">
                  Register your school or department for subsidized student Pro access.
                </p>
              </div>
              <button
                onClick={() => setIsPilotModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!firebaseUser ? (
              <div className="py-6 text-center space-y-4">
                <p className="text-xs text-slate-600">
                  Please sign in with Google so we can attach your pilot request to your verified
                  account and show live approval updates.
                </p>
                <button
                  onClick={signInWithGoogle}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In with Google</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitPilotInquiry} className="space-y-3.5">
                {pilotMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold border ${
                      pilotMessage.type === 'ok'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {pilotMessage.text}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Institution Name *
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={150}
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      placeholder="e.g. Pacific State University"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Campus Email Domain *
                    </label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      maxLength={120}
                      value={institutionDomain}
                      onChange={(e) => setInstitutionDomain(e.target.value)}
                      placeholder="e.g. pacificstate.edu"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={100}
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Dr. Jordan Patel"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Role / Department *
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={100}
                      value={contactRole}
                      onChange={(e) => setContactRole(e.target.value)}
                      placeholder="Dean of Student Success"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Official Email *
                    </label>
                    <input
                      type="email"
                      required
                      maxLength={254}
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="j.patel@pacificstate.edu"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Estimated Student Seats *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={500000}
                      value={estimatedSeats}
                      onChange={(e) => setEstimatedSeats(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notes / Pilot Goals (Optional)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={2000}
                    value={inquiryNotes}
                    onChange={(e) => setInquiryNotes(e.target.value)}
                    placeholder="Target semester, freshman retention program, or LMS details..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPilotModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={pilotSubmitting}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white"
                  >
                    {pilotSubmitting ? 'Submitting...' : 'Submit Pilot Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
