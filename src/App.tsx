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
import {
  StudentProfile,
  Assignment,
  Exam,
  SavedNote,
  Scholarship,
  ScheduleEvent,
} from './types/student';
import {
  INITIAL_UNIVERSITY_PROFILE,
  INITIAL_HIGH_SCHOOL_PROFILE,
  INITIAL_ASSIGNMENTS,
  INITIAL_EXAMS,
  INITIAL_SAVED_NOTES,
  INITIAL_SCHOLARSHIPS,
  INITIAL_SCHEDULE,
} from './data/mockData';
import {
  GraduationCap,
  Sparkles,
  CheckSquare,
  FileText,
  Award,
  Calendar,
  Building2,
  Clock,
} from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Persistence State with fallback to Initial Data
  const [profile, setProfile] = useState<StudentProfile>(() => {
    const saved = localStorage.getItem('ssa_profile');
    return saved ? JSON.parse(saved) : INITIAL_UNIVERSITY_PROFILE;
  });

  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    const saved = localStorage.getItem('ssa_assignments');
    return saved ? JSON.parse(saved) : INITIAL_ASSIGNMENTS;
  });

  const [exams, setExams] = useState<Exam[]>(() => {
    const saved = localStorage.getItem('ssa_exams');
    return saved ? JSON.parse(saved) : INITIAL_EXAMS;
  });

  const [savedNotes, setSavedNotes] = useState<SavedNote[]>(() => {
    const saved = localStorage.getItem('ssa_notes');
    return saved ? JSON.parse(saved) : INITIAL_SAVED_NOTES;
  });

  const [scholarships, setScholarships] = useState<Scholarship[]>(() => {
    const saved = localStorage.getItem('ssa_scholarships');
    return saved ? JSON.parse(saved) : INITIAL_SCHOLARSHIPS;
  });

  const [schedule, setSchedule] = useState<ScheduleEvent[]>(() => {
    const saved = localStorage.getItem('ssa_schedule');
    return saved ? JSON.parse(saved) : INITIAL_SCHEDULE;
  });

  // Active topic for AI Simplifier handoff
  const [explainerTopic, setExplainerTopic] = useState<string>('Quantum Superposition & Wave Collapse');

  // Synchronize to localStorage
  useEffect(() => {
    localStorage.setItem('ssa_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('ssa_assignments', JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    localStorage.setItem('ssa_exams', JSON.stringify(exams));
  }, [exams]);

  useEffect(() => {
    localStorage.setItem('ssa_notes', JSON.stringify(savedNotes));
  }, [savedNotes]);

  useEffect(() => {
    localStorage.setItem('ssa_scholarships', JSON.stringify(scholarships));
  }, [scholarships]);

  useEffect(() => {
    localStorage.setItem('ssa_schedule', JSON.stringify(schedule));
  }, [schedule]);

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

  const handleResetData = () => {
    localStorage.removeItem('ssa_profile');
    localStorage.removeItem('ssa_assignments');
    localStorage.removeItem('ssa_exams');
    localStorage.removeItem('ssa_notes');
    localStorage.removeItem('ssa_scholarships');
    localStorage.removeItem('ssa_schedule');

    setProfile(INITIAL_UNIVERSITY_PROFILE);
    setAssignments(INITIAL_ASSIGNMENTS);
    setExams(INITIAL_EXAMS);
    setSavedNotes(INITIAL_SAVED_NOTES);
    setScholarships(INITIAL_SCHOLARSHIPS);
    setSchedule(INITIAL_SCHEDULE);
  };

  const handleExplainTopic = (topic: string, subject: string) => {
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
        setProfile={setProfile}
        onOpenQuickAi={() => {
          setExplainerTopic('Quantum Superposition');
          setCurrentTab('simplifier');
        }}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main View Router */}
      <main className="flex-1 pb-16">
        {currentTab === 'dashboard' && (
          <DashboardView
            profile={profile}
            assignments={assignments}
            setAssignments={setAssignments}
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
            setSavedNotes={setSavedNotes}
            initialTopic={explainerTopic}
          />
        )}

        {currentTab === 'assignments' && (
          <AssignmentsView
            assignments={assignments}
            setAssignments={setAssignments}
            onExplainTopic={handleExplainTopic}
          />
        )}

        {currentTab === 'exams' && (
          <ExamsView
            exams={exams}
            setExams={setExams}
            onExplainTopic={handleExplainTopic}
          />
        )}

        {currentTab === 'scholarships' && (
          <ScholarshipsView
            scholarships={scholarships}
            setScholarships={setScholarships}
            studentLevel={profile.level}
          />
        )}

        {currentTab === 'schedule' && (
          <ScheduleView
            schedule={schedule}
            setSchedule={setSchedule}
            assignments={assignments}
            exams={exams}
          />
        )}

        {currentTab === 'partnerships' && (
          <MonetizationView profile={profile} setProfile={setProfile} />
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
              <span>University Partnerships</span>
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
              <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
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
        setProfile={setProfile}
        onResetData={handleResetData}
      />
    </div>
  );
}
