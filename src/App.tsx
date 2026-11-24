/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { AiSimplifierView } from './components/AiSimplifierView';
import { AssignmentsView } from './components/AssignmentsView';
import { ExamsView } from './components/ExamsView';
import { ScholarshipsView } from './components/ScholarshipsView';
import { ScheduleView } from './components/ScheduleView';
import { MonetizationView } from './components/MonetizationView';
import { SettingsModal } from './components/SettingsModal';
import { CommandPalette } from './components/CommandPalette';
import { useAppSync } from './context/AuthAndSyncContext';
import {
  GraduationCap,
  Sparkles,
  CheckSquare,
  FileText,
  Award,
  Building2,
  Clock,
  CheckCircle2,
  X,
} from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [explainerTopic, setExplainerTopic] = useState<string>(
    'Quantum Superposition & Wave Collapse'
  );

  const {
    firebaseUser,
    signInWithGoogle,
    logout,
    profile,
    updateProfile,
    assignments,
    updateAssignments,
    exams,
    updateExams,
    savedNotes,
    updateSavedNotes,
    scholarships,
    updateScholarships,
    schedule,
    updateSchedule,
    aiUsage,
    resetDemoData,
    checkoutNotice,
    clearCheckoutNotice,
  } = useAppSync();

  // Global Keyboard Shortcut for Command Palette (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleExplainTopic = (topic: string) => {
    setExplainerTopic(topic);
    setCurrentTab('simplifier');
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 font-sans flex flex-col selection:bg-indigo-500 selection:text-white pb-14 sm:pb-0">
      {/* Primary Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        profile={profile}
        setProfile={updateProfile}
        firebaseUser={firebaseUser}
        onSignIn={signInWithGoogle}
        onSignOut={logout}
        aiUsage={aiUsage}
        onOpenQuickAi={() => {
          setExplainerTopic('Quantum Superposition');
          setCurrentTab('simplifier');
        }}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Stripe Checkout Return Notice Banner */}
      {checkoutNotice && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
          <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs font-semibold flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>{checkoutNotice}</span>
            </div>
            <button
              onClick={clearCheckoutNotice}
              className="p-1 rounded-lg hover:bg-indigo-100 text-indigo-700"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main View Router */}
      <main className="flex-1 pb-16">
        {currentTab === 'dashboard' && (
          <DashboardView
            profile={profile}
            assignments={assignments}
            setAssignments={updateAssignments}
            exams={exams}
            scholarships={scholarships}
            schedule={schedule}
            savedNotes={savedNotes}
            setCurrentTab={setCurrentTab}
            onExplainTopic={handleExplainTopic}
          />
        )}

        {currentTab === 'simplifier' && (
          <AiSimplifierView
            level={profile.level}
            savedNotes={savedNotes}
            setSavedNotes={updateSavedNotes}
            initialTopic={explainerTopic}
            onUpgrade={() => setCurrentTab('partnerships')}
          />
        )}

        {currentTab === 'assignments' && (
          <AssignmentsView
            assignments={assignments}
            setAssignments={updateAssignments}
            onExplainTopic={handleExplainTopic}
          />
        )}

        {currentTab === 'exams' && (
          <ExamsView
            exams={exams}
            setExams={updateExams}
            onExplainTopic={handleExplainTopic}
          />
        )}

        {currentTab === 'scholarships' && (
          <ScholarshipsView
            scholarships={scholarships}
            setScholarships={updateScholarships}
            studentLevel={profile.level}
            onUpgrade={() => setCurrentTab('partnerships')}
          />
        )}

        {currentTab === 'schedule' && (
          <ScheduleView
            schedule={schedule}
            setSchedule={updateSchedule}
            assignments={assignments}
            exams={exams}
            onUpgrade={() => setCurrentTab('partnerships')}
          />
        )}

        {currentTab === 'partnerships' && (
          <MonetizationView profile={profile} setProfile={updateProfile} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500 mb-14 sm:mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-800">Smart Student Assistant</span>
            <span>•</span>
            <span>All-in-One Academic Command Hub</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentTab('simplifier')}
              className="hover:text-indigo-600 flex items-center gap-1 font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>AI Explainer</span>
            </button>
            <button
              onClick={() => setCurrentTab('partnerships')}
              className="hover:text-indigo-600 flex items-center gap-1 font-medium"
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Pro & Campus Access</span>
            </button>
            <span className="text-slate-400">|</span>
            <span className="text-slate-400">Built for high school & university achievers</span>
          </div>
        </div>
      </footer>

      {/* Sticky Mobile Bottom Navigation Bar (1-tap on mobile) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-1.5 flex items-center justify-around text-[10px] font-semibold text-slate-600 shadow-lg">
        {[
          { id: 'dashboard', label: 'Home', icon: GraduationCap },
          { id: 'simplifier', label: 'AI Explainer', icon: Sparkles },
          { id: 'assignments', label: 'Tasks', icon: CheckSquare },
          { id: 'exams', label: 'Exams', icon: FileText },
          { id: 'scholarships', label: 'Grants', icon: Award },
          { id: 'schedule', label: 'Timer', icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center py-1 px-1.5 rounded-lg transition-colors ${
                isActive ? 'text-indigo-600 font-bold' : 'hover:text-slate-900'
              }`}
            >
              <Icon
                className={`w-4 h-4 mb-0.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Command Palette Modal (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        assignments={assignments}
        exams={exams}
        scholarships={scholarships}
        notes={savedNotes}
        onNavigate={(tab) => setCurrentTab(tab)}
        onExplain={handleExplainTopic}
      />

      {/* Student Profile & Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        setProfile={updateProfile}
        assignments={assignments}
        exams={exams}
        savedNotes={savedNotes}
        scholarships={scholarships}
        schedule={schedule}
        onImportBackup={async (data) => {
          if (data.assignments) await updateAssignments(data.assignments);
          if (data.exams) await updateExams(data.exams);
          if (data.notes) await updateSavedNotes(data.notes);
          if (data.scholarships) await updateScholarships(data.scholarships);
          if (data.schedule) await updateSchedule(data.schedule);
          if (data.profile) {
            await updateProfile((prev) => ({
              ...data.profile!,
              isPro: prev.isPro,
              proSource: prev.proSource,
            }));
          }
        }}
        onResetData={resetDemoData}
      />
    </div>
  );
}
