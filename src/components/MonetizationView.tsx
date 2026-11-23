import React, { useState } from 'react';
import {
  Building2,
  Sparkles,
  Check,
  ShieldCheck,
  Zap,
  Users,
  GraduationCap,
  Award,
  ArrowRight,
  HelpCircle,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudentProfile, UniversityPartner } from '../types/student';
import { UNIVERSITY_PARTNERS } from '../data/mockData';

interface MonetizationViewProps {
  profile: StudentProfile;
  setProfile: React.Dispatch<React.SetStateAction<StudentProfile>>;
}

export const MonetizationView: React.FC<MonetizationViewProps> = ({ profile, setProfile }) => {
  const [eduEmailInput, setEduEmailInput] = useState('');
  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [partnerFilter, setPartnerFilter] = useState('');

  const handleClaimUniversityPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eduEmailInput.trim()) return;

    const lower = eduEmailInput.toLowerCase();
    const matchedPartner = UNIVERSITY_PARTNERS.find((p) => lower.includes(p.domain));

    if (matchedPartner) {
      setProfile((prev) => ({
        ...prev,
        isPro: true,
        institution: matchedPartner.name,
        partnerInstitutionId: matchedPartner.id,
      }));
      setClaimStatus(`🎉 Success! ${matchedPartner.name} has an active institutional partnership. Your full Student Pro account is unlocked for free!`);
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch (e) {}
    } else {
      // Simulate grant
      setProfile((prev) => ({
        ...prev,
        isPro: true,
        institution: 'Collegiate Affiliate Member',
      }));
      setClaimStatus(`✅ Verified institution affiliate! We've activated your campus sponsored pass.`);
    }
  };

  const handleTogglePro = () => {
    const nextPro = !profile.isPro;
    setProfile((prev) => ({ ...prev, isPro: nextPro }));
    if (nextPro) {
      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      } catch (e) {}
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Top Hero */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
          <Building2 className="w-3.5 h-3.5 text-indigo-600" />
          <span>Ecosystem & Sustainability</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Campus Partnerships & Premium Study Tools
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          How Smart Student Assistant stays affordable and accessible: subsidized by participating
          universities and high school districts, alongside accessible student pro tools.
        </p>
      </div>

      {/* Campus .EDU Verification Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-xs mb-3 text-indigo-200">
            <GraduationCap className="w-4 h-4 text-amber-300" />
            <span>Check Your University / High School Sponsorship</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">
            Does your school provide free Pro access?
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200 mt-2">
            Over 40+ universities and school districts sponsor 100% of the cost for their enrolled
            students via institutional licensing. Enter your school email below to check:
          </p>

          <form onSubmit={handleClaimUniversityPass} className="mt-5 flex flex-col sm:flex-row gap-2 max-w-lg">
            <input
              type="email"
              required
              value={eduEmailInput}
              onChange={(e) => setEduEmailInput(e.target.value)}
              placeholder="e.g. yourname@statetech.edu or @stanford.edu"
              className="px-4 py-2.5 rounded-xl text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 flex-1 font-medium"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-md transition-all whitespace-nowrap"
            >
              Check & Unlock Pro
            </button>
          </form>

          {claimStatus && (
            <div className="mt-3 p-3 bg-white/10 rounded-xl text-xs font-semibold text-emerald-200 border border-white/20">
              {claimStatus}
            </div>
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
              Universities and high schools partner with us directly to provide institutional access to
              every enrolled student, lowering dropout rates and improving STEM retention.
            </p>

            <div className="mt-6 space-y-3">
              {[
                { title: 'Campus-wide SSO & Security', desc: 'Integrated with Google Workspace, Microsoft 365 Education, and Canvas LMS' },
                { title: 'Subsidized Student Cost', desc: '$3 - $5/student per academic year, billed annually directly to department budgets' },
                { title: 'Advising & Retention Insights', desc: 'Aggregated syllabus bottlenecks and exam prep trends for academic deans' },
                { title: 'Campus Tutoring Integration', desc: 'Connects directly to on-campus peer tutoring and writing center appointments' },
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
            <span className="font-bold text-slate-900">Are you a faculty member or student rep? </span>
            <span className="text-slate-600">
              Request an institutional pilot for your department or campus student union.
            </span>
            <button
              onClick={() => alert('Partnership outreach kit sent! Our university relations team will follow up within 24 hours.')}
              className="mt-3 w-full py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-200 rounded-xl transition-colors"
            >
              Request Campus Pilot Kit
            </button>
          </div>
        </div>

        {/* Engine 2: Student Pro Individual Plan */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs flex flex-col justify-between space-y-6 relative overflow-hidden">
          <div className="absolute top-4 right-4">
            <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
              Student Budget Friendly
            </span>
          </div>

          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              2. Student Pro Study Tools
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
              For students whose school does not yet have an active institutional partnership,
              affordable individual subscriptions unlock advanced AI features.
            </p>

            {/* Price display */}
            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">
                  {billingCycle === 'yearly' ? '$3.25' : '$4.99'}
                </span>
                <span className="text-xs text-slate-500 font-medium">/ month</span>
              </div>
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-2 py-1 rounded ${billingCycle === 'monthly' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-2 py-1 rounded ${billingCycle === 'yearly' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'}`}
                >
                  Yearly (-35%)
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {[
                { title: 'Unlimited AI Concept Simplifications', desc: 'ELI5, Feynman Technique, and everyday analogies for every subject' },
                { title: 'Scholarship Match & Essay Hook Generator', desc: 'AI reviewer feedback and application deadline alerts' },
                { title: 'Smart Study Schedule Generator', desc: 'Adaptive time-blocking optimized around your peak cognitive energy' },
                { title: 'Audio Focus Ambiance & Readout', desc: 'Binaural flow-state beats and voice explanations on the go' },
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

          <div>
            <button
              onClick={handleTogglePro}
              className={`w-full py-3 rounded-2xl text-xs font-bold transition-all shadow-md ${
                profile.isPro
                  ? 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200'
                  : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white hover:opacity-95 shadow-indigo-600/25'
              }`}
            >
              {profile.isPro ? 'Deactivate Pro (Switch to Free)' : 'Upgrade to Student Pro ($39/yr)'}
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-2">
              Free 14-day trial • Cancel anytime • No credit card required for basic campus tier
            </p>
          </div>
        </div>
      </div>

      {/* Participating Institutions Showcase */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Active Partner Campuses & High School Districts</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Students from these institutions can log in with their campus credentials for automatic Pro access.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {UNIVERSITY_PARTNERS.map((partner) => (
            <div
              key={partner.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900">{partner.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase">
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
    </div>
  );
};
