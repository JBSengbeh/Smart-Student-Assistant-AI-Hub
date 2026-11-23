import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Plus,
  CheckCircle2,
  Brain,
  Coffee,
  RotateCw,
  Flame,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { ScheduleEvent, Assignment, Exam } from '../types/student';
import { soundFx } from '../utils/soundEffects';

interface ScheduleViewProps {
  schedule: ScheduleEvent[];
  setSchedule: React.Dispatch<React.SetStateAction<ScheduleEvent[]>>;
  assignments: Assignment[];
  exams: Exam[];
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  schedule,
  setSchedule,
  assignments,
  exams,
}) => {
  // Pomodoro Timer State
  const [timerMode, setTimerMode] = useState<'focus' | 'short_break' | 'long_break'>('focus');
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [sessionsCompleted, setSessionsCompleted] = useState<number>(3);
  const [ambientSound, setAmbientSound] = useState<'none' | 'rain' | 'binaural' | 'whitenoise'>('none');

  // AI Schedule Optimizer State
  const [availableHours, setAvailableHours] = useState<number>(4);
  const [studyStyle, setStudyStyle] = useState<'balanced' | 'pomodoro' | 'deep_work' | 'sprint'>('balanced');
  const [generatedPlan, setGeneratedPlan] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'timer' | 'ai_planner' | 'timetable'>('timer');

  // New Event Form State
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventDay, setEventDay] = useState<ScheduleEvent['day']>('Monday');
  const [eventStart, setEventStart] = useState('14:00');
  const [eventEnd, setEventEnd] = useState('15:30');
  const [eventTitle, setEventTitle] = useState('');
  const [eventCourse, setEventCourse] = useState('CS 445');
  const [eventType, setEventType] = useState<ScheduleEvent['type']>('study');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer Tick Effect
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            soundFx.playChime();
            soundFx.stopAmbient();
            setAmbientSound('none');
            if (timerMode === 'focus') {
              setSessionsCompleted((s) => s + 1);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timerMode]);

  // Mode change
  const handleModeChange = (mode: 'focus' | 'short_break' | 'long_break') => {
    setIsRunning(false);
    setTimerMode(mode);
    if (mode === 'focus') setTimeLeft(25 * 60);
    if (mode === 'short_break') setTimeLeft(5 * 60);
    if (mode === 'long_break') setTimeLeft(15 * 60);
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (timerMode === 'focus') setTimeLeft(25 * 60);
    if (timerMode === 'short_break') setTimeLeft(5 * 60);
    if (timerMode === 'long_break') setTimeLeft(15 * 60);
  };

  const toggleSound = (sound: 'rain' | 'binaural' | 'whitenoise') => {
    if (ambientSound === sound) {
      soundFx.stopAmbient();
      setAmbientSound('none');
    } else {
      soundFx.startAmbient(sound);
      setAmbientSound(sound);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate AI Schedule
  const handleGenerateSchedule = async () => {
    setIsAiLoading(true);
    try {
      const pendingTasks = assignments
        .filter((a) => a.status === 'todo' || a.status === 'in_progress')
        .map((a) => ({
          title: a.title,
          course: a.courseCode || a.course,
          priority: a.priority,
          estimatedHours: a.estimatedHours,
          dueDate: a.dueDate,
        }));

      const upcomingExams = exams.map((e) => ({
        title: e.title,
        course: e.courseCode,
        date: e.date,
        weight: e.weightPercentage,
      }));

      const res = await fetch('/api/ai/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: { assignments: pendingTasks, exams: upcomingExams },
          availableHours,
          studyStyle,
        }),
      });

      const data = await res.json();
      setGeneratedPlan(data.schedule || 'Unable to generate schedule.');
    } catch (e) {
      console.error(e);
      setGeneratedPlan(
        `### ${availableHours}-Hour Optimized Study Plan\n\n- **Block 1 (50 min):** High-priority assignment problem set\n- **Break (10 min):** Hydration and walk\n- **Block 2 (50 min):** Active recall on exam syllabus checklist\n- **Block 3 (40 min):** Wrap up notes and review`
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    const newEvent: ScheduleEvent = {
      id: `ev-${Date.now()}`,
      day: eventDay,
      startTime: eventStart,
      endTime: eventEnd,
      title: eventTitle,
      course: eventCourse,
      type: eventType,
      color: eventType === 'study' ? 'indigo' : eventType === 'lab' ? 'emerald' : 'blue',
    };

    setSchedule((prev) => [...prev, newEvent]);
    setIsEventModalOpen(false);
    setEventTitle('');
  };

  const DAYS: ScheduleEvent['day'][] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner & Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" />
            <span>Study Schedules & Focus Station</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Visual weekly timetable, Pomodoro study timer with ambient audio, and AI day optimizer.
          </p>
        </div>

        {/* View switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('timer')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'timer'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Focus Timer</span>
          </button>
          <button
            onClick={() => setActiveTab('ai_planner')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'ai_planner'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>AI Schedule Optimizer</span>
          </button>
          <button
            onClick={() => setActiveTab('timetable')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'timetable'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Weekly Classes</span>
          </button>
        </div>
      </div>

      {activeTab === 'timer' && (
        /* Pomodoro Timer Station */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Timer Display */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs flex flex-col items-center justify-center text-center relative overflow-hidden">
            {/* Background blur circle */}
            <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-indigo-50 blur-3xl pointer-events-none" />

            {/* Presets: Focus vs Break */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl mb-8">
              <button
                onClick={() => handleModeChange('focus')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  timerMode === 'focus'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Focus Block (25m)
              </button>
              <button
                onClick={() => handleModeChange('short_break')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  timerMode === 'short_break'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Short Break (5m)
              </button>
              <button
                onClick={() => handleModeChange('long_break')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  timerMode === 'long_break'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Long Break (15m)
              </button>
            </div>

            {/* Huge Digits */}
            <div className="font-mono text-7xl sm:text-9xl font-black text-slate-900 tracking-tighter my-4 select-none">
              {formatTime(timeLeft)}
            </div>

            <p className="text-xs sm:text-sm font-semibold text-slate-500 mb-8 max-w-sm">
              {timerMode === 'focus'
                ? 'Deep, distraction-free study zone. Close extra tabs and dive into one task.'
                : 'Step away from screens, hydrate, and stretch your spine.'}
            </p>

            {/* Timer Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`px-8 py-3.5 rounded-2xl text-sm font-bold text-white shadow-lg transition-all flex items-center gap-2.5 active:scale-95 ${
                  isRunning
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-5 h-5" />
                    <span>Pause Timer</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-white" />
                    <span>Start Session</span>
                  </>
                )}
              </button>

              <button
                onClick={resetTimer}
                title="Reset timer"
                className="p-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            {/* Ambient Audio Sounds (synthesized with Web Audio API) */}
            <div className="mt-10 pt-6 border-t border-slate-100 w-full max-w-md">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-center gap-1.5">
                <Volume2 className="w-4 h-4 text-indigo-600" />
                <span>Ambient Focus Sounds</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  { id: 'rain', label: '🌧️ Gentle Rain' },
                  { id: 'binaural', label: '🧠 Alpha Beats (10Hz)' },
                  { id: 'whitenoise', label: '📻 White Noise' },
                ].map((s) => {
                  const isActive = ambientSound === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleSound(s.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        isActive
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
                {ambientSound !== 'none' && (
                  <button
                    onClick={() => {
                      soundFx.stopAmbient();
                      setAmbientSound('none');
                    }}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold"
                    title="Mute ambient sound"
                  >
                    <VolumeX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Today's Focus Queue & Stats */}
          <div className="lg:col-span-4 space-y-6">
            {/* Sessions count card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Today's Focus Log</h3>
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{sessionsCompleted}</span>
                <span className="text-xs text-slate-500 font-semibold">Pomodoro blocks completed</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                That's ~{sessionsCompleted * 25} minutes of pure flow state achieved today!
              </p>
            </div>

            {/* Pending high priority tasks */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                <span>Recommended Focus Queue</span>
                <span className="text-[10px] text-indigo-600 font-bold uppercase">Up Next</span>
              </h3>
              <div className="space-y-2.5">
                {assignments.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-slate-800 line-clamp-1">{a.title}</div>
                      <div className="text-[11px] text-slate-500">
                        {a.courseCode} • Due {a.dueDate}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                      {a.estimatedHours}h
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ai_planner' && (
        /* AI Schedule Optimizer */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Smart Day Planner</span>
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Optimize Today's Study Window
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Tell AI how much time you have. It balances your urgent assignments, upcoming exam
                checklists, and optimal cognitive rest breaks.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Available Study Hours Today
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="0.5"
                  value={availableHours}
                  onChange={(e) => setAvailableHours(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <span className="text-sm font-bold text-indigo-700 w-16 text-right">
                  {availableHours} hrs
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Study Rhythm Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'balanced', label: 'Balanced Flow', desc: '50m focus / 10m break' },
                  { id: 'pomodoro', label: 'Classic Pomodoro', desc: '25m focus / 5m break' },
                  { id: 'deep_work', label: 'Deep Work Sprint', desc: '90m uninterrupted' },
                  { id: 'sprint', label: 'Exam Cram Sprint', desc: 'Rapid active recall' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStudyStyle(s.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      studyStyle === s.id
                        ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">{s.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800">Tasks Included in Optimization:</div>
              <p>• {assignments.filter((a) => a.status === 'todo').length} pending assignments</p>
              <p>• {exams.length} upcoming exams with mastery checklists</p>
            </div>

            <button
              onClick={handleGenerateSchedule}
              disabled={isAiLoading}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md flex items-center justify-center gap-2"
            >
              {isAiLoading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Optimal Schedule...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate Time-Blocked Schedule</span>
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-600" />
                <span>Optimized Timetable Output</span>
              </h3>

              {generatedPlan ? (
                <div className="prose prose-sm max-w-none text-slate-800 text-xs leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {generatedPlan}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400">
                  <Clock className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No schedule generated yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Select your available hours and click "Generate Time-Blocked Schedule"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'timetable' && (
        /* Weekly Timetable View */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-800">Weekly Classes & Recitations</span>
            <button
              onClick={() => setIsEventModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Class / Event</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {DAYS.map((day) => {
              const dayEvents = schedule.filter((e) => e.day === day);
              return (
                <div
                  key={day}
                  className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col min-h-[350px] shadow-xs"
                >
                  <div className="text-xs font-bold text-slate-800 pb-2 mb-2 border-b border-slate-100 flex items-center justify-between">
                    <span>{day.slice(0, 3)}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {dayEvents.length}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1">
                    {dayEvents.length === 0 ? (
                      <div className="text-[11px] text-slate-400 py-6 text-center italic">
                        No events
                      </div>
                    ) : (
                      dayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs hover:border-indigo-300 transition-colors"
                        >
                          <div className="text-[10px] font-bold text-indigo-700">
                            {ev.startTime} - {ev.endTime}
                          </div>
                          <div className="font-bold text-slate-900 mt-0.5 leading-snug line-clamp-1">
                            {ev.title}
                          </div>
                          {ev.location && (
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                              📍 {ev.location}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Class / Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Add Class or Study Session</h3>
            <form onSubmit={handleAddEvent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Distributed Systems Lecture"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Day</label>
                  <select
                    value={eventDay}
                    onChange={(e) => setEventDay(e.target.value as any)}
                    className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Course Code</label>
                  <input
                    type="text"
                    value={eventCourse}
                    onChange={(e) => setEventCourse(e.target.value)}
                    placeholder="e.g. CS 445"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={eventEnd}
                    onChange={(e) => setEventEnd(e.target.value)}
                    className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Add Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
