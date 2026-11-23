import React, { useState } from 'react';
import {
  FileText,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Circle,
  Plus,
  Sparkles,
  Trash2,
  Edit3,
  AlertTriangle,
  Award,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Exam, ExamChecklistItem } from '../types/student';

interface ExamsViewProps {
  exams: Exam[];
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>;
  onExplainTopic: (topic: string, subject: string) => void;
}

export const ExamsView: React.FC<ExamsViewProps> = ({ exams, setExams, onExplainTopic }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [expandedExamId, setExpandedExamId] = useState<string | null>(exams[0]?.id || null);
  const [newTopicInput, setNewTopicInput] = useState<Record<string, string>>({});

  // Form state
  const [formCourse, setFormCourse] = useState('Algorithms & Complexity');
  const [formCourseCode, setFormCourseCode] = useState('CS 320');
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('10:00 AM - 12:00 PM');
  const [formLocation, setFormLocation] = useState('Hall B, Room 102');
  const [formFormat, setFormFormat] = useState<'in_person' | 'online' | 'take_home'>('in_person');
  const [formWeight, setFormWeight] = useState(30);
  const [formConfidence, setFormConfidence] = useState(3);
  const [formNotes, setFormNotes] = useState('');

  const calculateDaysRemaining = (dateStr: string) => {
    const examDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = examDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const toggleChecklistItem = (examId: string, itemId: string) => {
    setExams((prev) =>
      prev.map((exam) => {
        if (exam.id !== examId) return exam;
        return {
          ...exam,
          checklist: exam.checklist.map((item) =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
          ),
        };
      })
    );
  };

  const addChecklistItem = (examId: string) => {
    const text = newTopicInput[examId];
    if (!text || !text.trim()) return;

    setExams((prev) =>
      prev.map((exam) => {
        if (exam.id !== examId) return exam;
        const newItem: ExamChecklistItem = {
          id: `c-${Date.now()}`,
          topic: text.trim(),
          completed: false,
        };
        return {
          ...exam,
          checklist: [...exam.checklist, newItem],
        };
      })
    );

    setNewTopicInput((prev) => ({ ...prev, [examId]: '' }));
  };

  const deleteChecklistItem = (examId: string, itemId: string) => {
    setExams((prev) =>
      prev.map((exam) => {
        if (exam.id !== examId) return exam;
        return {
          ...exam,
          checklist: exam.checklist.filter((item) => item.id !== itemId),
        };
      })
    );
  };

  const handleDeleteExam = (id: string) => {
    setExams((prev) => prev.filter((e) => e.id !== id));
  };

  const openCreateModal = () => {
    setEditingExam(null);
    setFormCourse('Modern Physics');
    setFormCourseCode('PHYS 210');
    setFormTitle('Final Exam: Quantum & Electromagnetism');
    setFormDate(new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0]);
    setFormTime('09:00 AM - 12:00 PM');
    setFormLocation('Science Complex Hall 1');
    setFormFormat('in_person');
    setFormWeight(35);
    setFormConfidence(3);
    setFormNotes('Formula sheet provided by instructor.');
    setIsModalOpen(true);
  };

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingExam) {
      setExams((prev) =>
        prev.map((exam) =>
          exam.id === editingExam.id
            ? {
                ...exam,
                course: formCourse,
                courseCode: formCourseCode,
                title: formTitle,
                date: formDate,
                time: formTime,
                location: formLocation,
                format: formFormat,
                weightPercentage: Number(formWeight),
                confidenceLevel: Number(formConfidence),
                studyNotesSummary: formNotes,
              }
            : exam
        )
      );
    } else {
      const newExam: Exam = {
        id: `exam-${Date.now()}`,
        course: formCourse,
        courseCode: formCourseCode,
        title: formTitle,
        date: formDate,
        time: formTime,
        location: formLocation,
        format: formFormat,
        weightPercentage: Number(formWeight),
        confidenceLevel: Number(formConfidence),
        color: 'indigo',
        checklist: [
          { id: 't1', topic: 'Review textbook chapter summaries', completed: false },
          { id: 't2', topic: 'Solve practice midterm questions', completed: false },
          { id: 't3', topic: 'Prepare 1-page condensed review sheet', completed: false },
        ],
        studyNotesSummary: formNotes,
      };
      setExams((prev) => [newExam, ...prev]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            <span>Exams & Test Readiness Command</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Live countdown timers, syllabus mastery checklists, and 1-click AI concept explanations.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-500/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Exam</span>
        </button>
      </div>

      {/* Exam Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {exams.map((exam) => {
          const daysLeft = calculateDaysRemaining(exam.date);
          const completedCount = exam.checklist.filter((c) => c.completed).length;
          const totalCount = exam.checklist.length;
          const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
          const isUrgent = daysLeft >= 0 && daysLeft <= 5;
          const isExpanded = expandedExamId === exam.id;

          return (
            <div
              key={exam.id}
              className={`bg-white rounded-2xl border transition-all ${
                isUrgent ? 'border-amber-300 shadow-amber-500/10 shadow-md ring-1 ring-amber-300' : 'border-slate-200 shadow-xs'
              } p-6 flex flex-col justify-between`}
            >
              <div>
                {/* Header row: Course, Countdown Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {exam.courseCode}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1.5">{exam.title}</h3>
                    <p className="text-xs text-slate-500">{exam.course}</p>
                  </div>

                  {/* Countdown Badge */}
                  <div
                    className={`px-3 py-1.5 rounded-xl text-center shrink-0 border ${
                      daysLeft <= 2
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : daysLeft <= 7
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}
                  >
                    <div className="text-lg font-extrabold leading-none">
                      {daysLeft < 0 ? 'Passed' : daysLeft === 0 ? 'Today!' : `${daysLeft}d`}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mt-0.5">
                      {daysLeft < 0 ? 'Archived' : daysLeft === 0 ? 'Exam Day' : 'Remaining'}
                    </div>
                  </div>
                </div>

                {/* Exam Meta: Date, Time, Location, Weight */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{exam.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{exam.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{exam.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                    <Award className="w-3.5 h-3.5" />
                    <span>{exam.weightPercentage}% of Grade</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Format:</span>
                    <span className="capitalize font-medium">{exam.format.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Confidence:</span>
                    <span className="font-bold text-amber-600">{'★'.repeat(exam.confidenceLevel)}{'☆'.repeat(5 - exam.confidenceLevel)}</span>
                  </div>
                </div>

                {/* Syllabus Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">Syllabus Mastery Checklist</span>
                    <span className="text-indigo-600">
                      {completedCount} / {totalCount} topics ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Expandable Syllabus Checklist */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setExpandedExamId(isExpanded ? null : exam.id)}
                      className="text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1"
                    >
                      <span>{isExpanded ? 'Hide Checklist' : 'Show Topic Breakdown'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-2 space-y-2 border-t border-slate-100 pt-3">
                      {exam.checklist.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100/80 transition-colors text-xs"
                        >
                          <div
                            onClick={() => toggleChecklistItem(exam.id, item.id)}
                            className="flex items-center gap-2 flex-1 cursor-pointer select-none"
                          >
                            {item.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <span
                              className={`leading-snug ${
                                item.completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'
                              }`}
                            >
                              {item.topic}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* 1-Click Explain with AI */}
                            <button
                              onClick={() => onExplainTopic(item.topic, exam.course)}
                              title="Explain this topic with AI"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200/50"
                            >
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              <span>Explain</span>
                            </button>
                            <button
                              onClick={() => deleteChecklistItem(exam.id, item.id)}
                              className="p-1 text-slate-300 hover:text-rose-500 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add new checklist topic input */}
                      <div className="flex items-center gap-2 mt-2 pt-1">
                        <input
                          type="text"
                          placeholder="Add syllabus topic / chapter..."
                          value={newTopicInput[exam.id] || ''}
                          onChange={(e) =>
                            setNewTopicInput((prev) => ({ ...prev, [exam.id]: e.target.value }))
                          }
                          onKeyDown={(e) => e.key === 'Enter' && addChecklistItem(exam.id)}
                          className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => addChecklistItem(exam.id)}
                          className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                        >
                          Add Topic
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {exam.studyNotesSummary && (
                  <div className="mt-3 p-2.5 bg-amber-50/60 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                    <span className="font-bold">Exam Note: </span>
                    {exam.studyNotesSummary}
                  </div>
                )}
              </div>

              {/* Bottom Card Controls */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => onExplainTopic(`${exam.course} Final Review: High-Yield Concepts`, exam.course)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Generate Full Exam Cram Sheet</span>
                </button>
                <button
                  onClick={() => handleDeleteExam(exam.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  title="Delete Exam"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Exam Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Upcoming Exam</h3>
            <form onSubmit={handleSaveExam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Midterm 2, Final Exam, AP Calculus Exam"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Course Code</label>
                  <input
                    type="text"
                    value={formCourseCode}
                    onChange={(e) => setFormCourseCode(e.target.value)}
                    placeholder="e.g. CS 320"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Course Name</label>
                  <input
                    type="text"
                    value={formCourse}
                    onChange={(e) => setFormCourse(e.target.value)}
                    placeholder="e.g. Algorithms"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
                  <input
                    type="text"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    placeholder="e.g. 10:00 AM - 12:00 PM"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Weight (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formWeight}
                    onChange={(e) => setFormWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Format</label>
                  <select
                    value={formFormat}
                    onChange={(e) => setFormFormat(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="in_person">In Person</option>
                    <option value="online">Online</option>
                    <option value="take_home">Take Home</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Confidence (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formConfidence}
                    onChange={(e) => setFormConfidence(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. Turing Hall 302 or Online Canvas"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Exam Notes / Cheat Sheet Allowed
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. 1 cheat sheet front and back allowed, bring graphing calculator"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Save Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
