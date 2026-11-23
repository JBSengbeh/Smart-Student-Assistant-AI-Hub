import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckSquare,
  FileText,
  Award,
  Sparkles,
  Calendar,
  X,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { Assignment, Exam, SavedNote, Scholarship } from '../types/student';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  assignments: Assignment[];
  exams: Exam[];
  scholarships: Scholarship[];
  notes: SavedNote[];
  onNavigate: (tab: string) => void;
  onExplain: (topic: string, subject: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  assignments,
  exams,
  scholarships,
  notes,
  onNavigate,
  onExplain,
}) => {
  const [query, setQuery] = useState('');

  // Keyboard shortcut listener (Cmd+K / Ctrl+K / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle or open handled by parent
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase();

  const matchingAssignments = assignments
    .filter((a) => a.title.toLowerCase().includes(q) || a.courseCode.toLowerCase().includes(q))
    .slice(0, 3);

  const matchingExams = exams
    .filter((e) => e.title.toLowerCase().includes(q) || e.courseCode.toLowerCase().includes(q))
    .slice(0, 3);

  const matchingScholarships = scholarships
    .filter((s) => s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
    .slice(0, 3);

  const matchingNotes = notes
    .filter((n) => n.title.toLowerCase().includes(q) || n.topic.toLowerCase().includes(q))
    .slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Search Input Bar */}
        <div className="relative border-b border-slate-100 p-4 flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-600 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a task, exam, scholarship, note, or topic to explain..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                onExplain(query.trim(), 'General');
                onClose();
              }
            }}
            className="w-full text-sm bg-transparent outline-none placeholder:text-slate-400 font-medium text-slate-800"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4 text-xs">
          {query.trim() && (
            <button
              onClick={() => {
                onExplain(query.trim(), 'General');
                onClose();
              }}
              className="w-full text-left p-3 rounded-xl bg-indigo-50 border border-indigo-200/80 hover:bg-indigo-100/80 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-indigo-900">
                  Ask AI to Explain "{query}" in Simple Language
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
            </button>
          )}

          {/* Quick Nav Options */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
              Quick Navigation
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {[
                { label: 'AI Explainer', tab: 'simplifier', icon: Sparkles },
                { label: 'Assignments', tab: 'assignments', icon: CheckSquare },
                { label: 'Exams & Tests', tab: 'exams', icon: FileText },
                { label: 'Scholarships', tab: 'scholarships', icon: Award },
                { label: 'Focus Station', tab: 'schedule', icon: Calendar },
                { label: 'Campus & Pro', tab: 'partnerships', icon: BookOpen },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.tab}
                    onClick={() => {
                      onNavigate(item.tab);
                      onClose();
                    }}
                    className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 flex items-center gap-2 text-left font-medium"
                  >
                    <Icon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assignments */}
          {matchingAssignments.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
                Assignments
              </div>
              <div className="space-y-1">
                {matchingAssignments.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      onNavigate('assignments');
                      onClose();
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between group"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{a.title}</span>
                      <span className="text-[11px] text-slate-500 ml-2">({a.courseCode})</span>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                      Due {a.dueDate}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Exams */}
          {matchingExams.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
                Exams
              </div>
              <div className="space-y-1">
                {matchingExams.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => {
                      onNavigate('exams');
                      onClose();
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{e.title}</span>
                      <span className="text-[11px] text-slate-500 ml-2">({e.courseCode})</span>
                    </div>
                    <span className="text-[10px] font-bold text-rose-600">
                      {e.date}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Scholarships */}
          {matchingScholarships.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
                Scholarships
              </div>
              <div className="space-y-1">
                {matchingScholarships.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      onNavigate('scholarships');
                      onClose();
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{s.title}</span>
                      <span className="text-[11px] text-slate-500 ml-2">({s.category})</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600">
                      ${s.amount.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-50 border-t border-slate-100 p-2.5 text-[11px] text-slate-500 flex items-center justify-between px-4">
          <span>Tip: Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">Enter</kbd> to explain query with AI</span>
          <span><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
};
