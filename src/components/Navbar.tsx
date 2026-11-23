import React from 'react';
import {
  GraduationCap,
  Sparkles,
  CheckSquare,
  FileText,
  Calendar,
  Award,
  Clock,
  Building2,
  Flame,
  BookOpen,
  Search,
  Settings,
} from 'lucide-react';
import { StudentProfile } from '../types/student';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  profile: StudentProfile;
  setProfile: React.Dispatch<React.SetStateAction<StudentProfile>>;
  onOpenQuickAi: () => void;
  onOpenCommandPalette: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  profile,
  setProfile,
  onOpenQuickAi,
  onOpenCommandPalette,
  onOpenSettings,
}) => {
  const toggleLevel = () => {
    const nextLevel = profile.level === 'university' ? 'high_school' : 'university';
    setProfile((prev) => ({
      ...prev,
      level: nextLevel,
      institution:
        nextLevel === 'university'
          ? 'State University of Technology'
          : 'Westfield Preparatory High School',
      majorOrGrade: nextLevel === 'university' ? 'Computer Science & Cognitive Science' : '12th Grade (Senior)',
      term: nextLevel === 'university' ? 'Fall Semester 2026' : 'Fall Quarter 2026',
    }));
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: GraduationCap },
    { id: 'simplifier', label: 'AI Explainer', icon: Sparkles, badge: 'Special' },
    { id: 'assignments', label: 'Assignments', icon: CheckSquare },
    { id: 'exams', label: 'Exams', icon: FileText },
    { id: 'scholarships', label: 'Scholarships', icon: Award },
    { id: 'schedule', label: 'Schedule & Focus', icon: Calendar },
    { id: 'partnerships', label: 'Campus & Pro', icon: Building2 },
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
                <p className="text-xs text-slate-500 truncate max-w-[180px] sm:max-w-[240px]">
                  {profile.institution}
                </p>
              </div>
            </button>

            {/* University vs High School Quick Switcher */}
            <button
              onClick={toggleLevel}
              title="Click to toggle between University & High School student mode"
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>{profile.level === 'university' ? 'University Mode' : 'High School Mode'}</span>
              <span className="text-[10px] text-slate-400">Switch</span>
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
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white animate-pulse">
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
              className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors border border-slate-200/80"
            >
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-400">Search...</span>
              <kbd className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-300 text-slate-500 font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Quick AI Explainer Button */}
            <button
              onClick={onOpenQuickAi}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-sm shadow-indigo-500/25 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span className="hidden sm:inline">Explain</span> Topic
            </button>

            {/* Streak Counter */}
            <div
              title={`${profile.streakDays} consecutive study days logged!`}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200/60 text-orange-700 text-xs font-bold"
            >
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span>{profile.streakDays}d</span>
            </div>

            {/* Settings Trigger */}
            <button
              onClick={onOpenSettings}
              title="Student Profile & Data Settings"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
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
