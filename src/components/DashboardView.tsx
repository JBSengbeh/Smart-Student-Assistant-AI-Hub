import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  CheckSquare,
  FileText,
  Award,
  Calendar,
  Flame,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Building2,
  ChevronRight,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  StudentProfile,
  Assignment,
  Exam,
  SavedNote,
  Scholarship,
  ScheduleEvent,
} from '../types/student';

interface DashboardViewProps {
  profile: StudentProfile;
  assignments: Assignment[];
  setAssignments: React.Dispatch<React.SetStateAction<Assignment[]>>;
  exams: Exam[];
  scholarships: Scholarship[];
  schedule: ScheduleEvent[];
  savedNotes: SavedNote[];
  setCurrentTab: (tab: string) => void;
  onExplainTopic: (topic: string, subject: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  assignments,
  setAssignments,
  exams,
  scholarships,
  schedule,
  savedNotes,
  setCurrentTab,
  onExplainTopic,
}) => {
  const [quickTopic, setQuickTopic] = useState('');

  // Calculations
  const urgentAssignments = assignments.filter(
    (a) => (a.status === 'todo' || a.status === 'in_progress') && (a.priority === 'urgent' || a.priority === 'high')
  );

  const pendingAssignments = assignments.filter((a) => a.status === 'todo' || a.status === 'in_progress');

  const nextExam = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const totalScholarshipsTracked = scholarships.reduce((sum, s) => sum + s.amount, 0);

  const handleMarkAssignmentDone = (id: string) => {
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (e) {}
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'submitted' } : a))
    );
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickTopic.trim()) {
      onExplainTopic(quickTopic.trim(), 'General Academic');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/20 text-indigo-200">
              <Flame className="w-4 h-4 text-orange-400 fill-orange-400 animate-bounce" />
              <span>{profile.streakDays}-Day Study Streak Active</span>
              <span className="text-white/40">•</span>
              <span>{profile.term}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {profile.name}!
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 max-w-xl">
              {profile.majorOrGrade} at <span className="font-semibold text-white">{profile.institution}</span>.
              Target GPA: <span className="font-bold text-amber-300">{profile.targetGpa.toFixed(2)}</span> (Current: {profile.currentGpa.toFixed(2)})
            </p>
          </div>

          {/* Quick AI Explainer Search Box */}
          <div className="w-full md:max-w-md bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quick AI Topic Explainer</span>
            </span>
            <form onSubmit={handleQuickSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Confusing topic? (e.g. Eigenvalues, Raft, Krebs)..."
                value={quickTopic}
                onChange={(e) => setQuickTopic(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white text-slate-900 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 rounded-xl text-xs font-bold shrink-0 transition-transform active:scale-95 shadow-sm"
              >
                Explain
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Next Exam */}
        <div
          onClick={() => setCurrentTab('exams')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Next Exam</span>
            <FileText className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 truncate">
            {nextExam ? nextExam.courseCode : 'None scheduled'}
          </div>
          <div className="text-xs text-indigo-600 font-medium mt-1 truncate">
            {nextExam ? `${nextExam.title}` : 'All caught up!'}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            {nextExam ? `Date: ${nextExam.date}` : 'No upcoming tests'}
          </div>
        </div>

        {/* Urgent Assignments */}
        <div
          onClick={() => setCurrentTab('assignments')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Pending Tasks</span>
            <CheckSquare className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900">
            {pendingAssignments.length} Assignments
          </div>
          <div className="text-xs text-rose-600 font-semibold mt-1">
            {urgentAssignments.length} High Priority
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            ~{pendingAssignments.reduce((acc, curr) => acc + (curr.estimatedHours || 0), 0)} hrs total work
          </div>
        </div>

        {/* Scholarships Value */}
        <div
          onClick={() => setCurrentTab('scholarships')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Scholarship Pipeline</span>
            <Award className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-600">
            ${totalScholarshipsTracked.toLocaleString()}
          </div>
          <div className="text-xs text-slate-600 font-medium mt-1">
            {scholarships.length} Grants Tracked
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            $15,000 awarded to date
          </div>
        </div>

        {/* Focus & Streak */}
        <div
          onClick={() => setCurrentTab('schedule')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Focus & Timetable</span>
            <Clock className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900">
            Focus Station
          </div>
          <div className="text-xs text-indigo-600 font-medium mt-1">
            Pomodoro & Lo-Fi Audio
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            AI Schedule Optimizer
          </div>
        </div>
      </div>

      {/* Main 2-Column Dashboard Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Deadlines & Today's Schedule */}
        <div className="lg:col-span-7 space-y-6">
          {/* Priority Deadlines */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-600" />
                <span>Upcoming Priority Deadlines</span>
              </h2>
              <button
                onClick={() => setCurrentTab('assignments')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>View All ({assignments.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {pendingAssignments.slice(0, 4).map((a) => (
                <div
                  key={a.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => handleMarkAssignmentDone(a.id)}
                      title="Click to mark as submitted"
                      className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors shrink-0"
                    >
                      <Circle className="w-4 h-4" />
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded uppercase">
                          {a.courseCode}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            a.priority === 'urgent'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {a.priority}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 mt-1 truncate group-hover:text-indigo-600 transition-colors">
                        {a.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Due: {a.dueDate} • ~{a.estimatedHours}h estimated
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onExplainTopic(a.title, a.course)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1 border border-indigo-200/60"
                      title="Explain topic simply with AI"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span className="hidden sm:inline">Explain</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Schedule Overview */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <span>Today's Classes & Study Blocks</span>
              </h2>
              <button
                onClick={() => setCurrentTab('schedule')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>Full Timetable</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {schedule.slice(0, 3).map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="font-mono text-indigo-700 font-bold w-24">
                      {ev.startTime} - {ev.endTime}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{ev.title}</div>
                      {ev.location && (
                        <div className="text-[11px] text-slate-500">📍 {ev.location}</div>
                      )}
                    </div>
                  </div>
                  <span className="capitalize text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {ev.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI Simplifier Showcase & Exam Readiness */}
        <div className="lg:col-span-5 space-y-6">
          {/* AI Concept Explainer Promo Card */}
          <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-2xl border border-indigo-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-2 text-indigo-700">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span className="text-xs font-extrabold uppercase tracking-wider">
                Special AI Feature
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Explain Difficult Topics in Simple Language
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Transform dense mathematical proofs, algorithms, or medical cycles into intuitive ELI5
              explanations, everyday real-world analogies, or Feynman breakdowns.
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {['Quantum Superposition', 'CAP Theorem', 'Central Limit Theorem', 'Krebs Cycle'].map(
                (topic) => (
                  <button
                    key={topic}
                    onClick={() => onExplainTopic(topic, 'General')}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white font-medium transition-colors"
                  >
                    {topic}
                  </button>
                )
              )}
            </div>

            <button
              onClick={() => setCurrentTab('simplifier')}
              className="mt-4 w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Open AI Explainer Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Exam Readiness Tracker */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Next Exam Readiness</span>
              </h3>
              <button
                onClick={() => setCurrentTab('exams')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                View
              </button>
            </div>

            {nextExam && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{nextExam.courseCode}</span>
                  <span className="text-xs font-bold text-rose-600">in 5 days</span>
                </div>
                <div className="text-xs font-medium text-slate-700 mt-0.5">{nextExam.title}</div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span>Syllabus Topics Mastered</span>
                    <span className="font-semibold text-indigo-600">
                      {nextExam.checklist.filter((c) => c.completed).length} / {nextExam.checklist.length}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full"
                      style={{
                        width: `${Math.round(
                          (nextExam.checklist.filter((c) => c.completed).length / nextExam.checklist.length) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Campus Partnership Status */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  {profile.institution}
                </div>
                <div className="text-[11px] text-emerald-600 font-medium">
                  {profile.isPro ? 'Campus Institutional Pass Active' : 'Free Student Tier'}
                </div>
              </div>
            </div>

            <button
              onClick={() => setCurrentTab('partnerships')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200"
            >
              Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
