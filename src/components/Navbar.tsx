import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  CheckSquare,
  FileText,
  Calendar,
  Award,
  Building2,
  Flame,
  BookOpen,
  Search,
  Settings,
  LogIn,
  LogOut,
  Crown,
} from 'lucide-react';
import { StudentProfile, AiUsageInfo } from '../types/student';
import { User } from 'firebase/auth';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  profile: StudentProfile;
  setProfile: (updater: React.SetStateAction<StudentProfile>) => void | Promise<void>;
  firebaseUser: User | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  aiUsage: AiUsageInfo;
  onOpenQuickAi: () => void;
  onOpenCommandPalette: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  profile,
  setProfile,
  firebaseUser,
  onSignIn,
  onSignOut,
  aiUsage,
  onOpenQuickAi,
  onOpenCommandPalette,
  onOpenSettings,
}) => {
  const [authLoading, setAuthLoading] = useState(false);

  const toggleLevel = () => {
    const nextLevel = profile.level === 'university' ? 'high_school' : 'university';
    setProfile((prev) => ({
      ...prev,
      level: nextLevel,
      institution:
        nextLevel === 'university'
          ? 'State University of Technology'
          : 'Westfield Preparatory High School',
      majorOrGrade:
        nextLevel === 'university' ? 'Computer Science & Cognitive Science' : '12th Grade (Senior)',
      term: nextLevel === 'university' ? 'Fall Semester 2026' : 'Fall Quarter 2026',
    }));
  };

  const handleSignInClick = async () => {
    setAuthLoading(true);
    try {
      await onSignIn();
    } catch (err) {
      console.error('Google sign-in failed:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: GraduationCap },
    { id: 'simplifier', label: 'AI Explainer', icon: Sparkles, badge: 'AI' },
    { id: 'assignments', label: 'Assignments', icon: CheckSquare },
    { id: 'exams', label: 'Exams', icon: FileText },
    { id: 'scholarships', label: 'Scholarships', icon: Award },
    { id: 'schedule', label: 'Schedule & Focus', icon: Calendar },
    { id: 'partnerships', label: 'Pro & Campus', icon: Building2 },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Level Switcher */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className="flex items-center gap-2.5 text-left group transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 tracking-tight text-lg">SmartStudent</span>
                  <span className="text-[10px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                    AI Hub
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate max-w-[160px] sm:max-w-[200px]">
                  {profile.institution}
                </p>
              </div>
            </button>

            <button
              onClick={toggleLevel}
              title="Switch between University & High School mode"
              className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>{profile.level === 'university' ? 'University' : 'High School'}</span>
            </button>
          </div>

          {/* Primary Nav Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`relative flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Command Palette Trigger */}
            <button
              onClick={onOpenCommandPalette}
              title="Global Search & Quick Actions (Cmd+K)"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors border border-slate-200/80"
            >
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <kbd className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-300 text-slate-500 font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Plan / AI Credits Pill */}
            <button
              onClick={() => setCurrentTab('partnerships')}
              className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                profile.isPro || aiUsage.tier === 'pro'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>
                {profile.isPro || aiUsage.tier === 'pro'
                  ? profile.proSource === 'campus'
                    ? 'Campus Pro'
                    : 'Student Pro'
                  : `Free (${aiUsage.remaining ?? 0}/${aiUsage.limit ?? 5} AI)`}
              </span>
            </button>

            {/* Quick AI Explainer Button */}
            <button
              onClick={onOpenQuickAi}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-sm shadow-indigo-500/25 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>Explain</span>
            </button>

            {/* Streak Counter */}
            <div
              title={`${profile.streakDays} consecutive study days logged!`}
              className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 border border-orange-200/60 text-orange-700 text-xs font-bold"
            >
              <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
              <span>{profile.streakDays}d</span>
            </div>

            {/* Auth Control */}
            {firebaseUser ? (
              <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200">
                <button
                  onClick={onOpenSettings}
                  title={`Signed in as ${firebaseUser.email} — Click for settings`}
                  className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {firebaseUser.photoURL ? (
                    <img
                      src={firebaseUser.photoURL}
                      alt={firebaseUser.displayName || 'Student'}
                      className="w-7 h-7 rounded-full border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                      {(firebaseUser.displayName || 'S')[0].toUpperCase()}
                    </div>
                  )}
                </button>
                <button
                  onClick={onSignOut}
                  title="Sign out"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignInClick}
                disabled={authLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{authLoading ? 'Signing in...' : 'Sign In'}</span>
              </button>
            )}

            {!firebaseUser && (
              <button
                onClick={onOpenSettings}
                title="Student Profile & Data Settings"
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Nav Scrollbar */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto py-2 -mx-4 px-4 border-t border-slate-100 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs whitespace-nowrap font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
