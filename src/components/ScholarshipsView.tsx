import React, { useState } from 'react';
import {
  Award,
  DollarSign,
  Plus,
  Search,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Filter,
  FileText,
  RotateCw,
  Copy,
  Check,
  Building,
  Target,
  Trash2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Scholarship, ScholarshipStatus, StudentLevel } from '../types/student';

interface ScholarshipsViewProps {
  scholarships: Scholarship[];
  setScholarships: React.Dispatch<React.SetStateAction<Scholarship[]>>;
  studentLevel: StudentLevel;
}

export const ScholarshipsView: React.FC<ScholarshipsViewProps> = ({
  scholarships,
  setScholarships,
  studentLevel,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // AI Essay brainstormer state
  const [activeScholarshipForAi, setActiveScholarshipForAi] = useState<Scholarship | null>(null);
  const [essayBackground, setEssayBackground] = useState(
    'Undergraduate in Computer Science, first-generation student, mentored high school robotics club, passionate about accessible tech.'
  );
  const [aiFeedback, setAiFeedback] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [copiedAi, setCopiedAi] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formProvider, setFormProvider] = useState('');
  const [formAmount, setFormAmount] = useState(5000);
  const [formDeadline, setFormDeadline] = useState('');
  const [formCategory, setFormCategory] = useState<Scholarship['category']>('STEM');
  const [formEligibility, setFormEligibility] = useState<'all' | 'university' | 'high_school'>('all');
  const [formMinGpa, setFormMinGpa] = useState<number>(3.0);
  const [formPrompt, setFormPrompt] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const filteredScholarships = scholarships.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || s.status === selectedStatus;
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Calculate metrics
  const totalAwarded = scholarships
    .filter((s) => s.status === 'awarded')
    .reduce((sum, s) => sum + s.amount, 0);

  const totalInPipeline = scholarships
    .filter((s) => s.status === 'discovered' || s.status === 'drafting' || s.status === 'submitted')
    .reduce((sum, s) => sum + s.amount, 0);

  const activeCount = scholarships.filter(
    (s) => s.status === 'drafting' || s.status === 'submitted'
  ).length;

  const handleStatusChange = (id: string, newStatus: ScholarshipStatus) => {
    if (newStatus === 'awarded') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    }
    setScholarships((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    );
  };

  const handleDelete = (id: string) => {
    setScholarships((prev) => prev.filter((s) => s.id !== id));
  };

  const handleOpenAiModal = (s: Scholarship) => {
    setActiveScholarshipForAi(s);
    setAiFeedback('');
    setIsAiModalOpen(true);
  };

  const handleGenerateEssaySupport = async () => {
    if (!activeScholarshipForAi) return;
    setIsAiLoading(true);
    setCopiedAi(false);

    try {
      const res = await fetch('/api/ai/scholarship-essay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scholarshipTitle: activeScholarshipForAi.title,
          promptTopic: activeScholarshipForAi.essayPrompt || 'Describe your leadership and academic ambitions.',
          studentBackground: essayBackground,
        }),
      });

      const data = await res.json();
      setAiFeedback(data.feedback || 'Unable to generate essay guide.');
    } catch (err) {
      console.error(err);
      setAiFeedback(
        `### Scholarship Strategy Guide for "${activeScholarshipForAi.title}"\n\n1. **Opening Hook:** Start with a decisive turning point in your academic journey.\n2. **Demonstrate Impact:** Give specific metrics of projects or people mentored.\n3. **Forward Vision:** Clearly state how this $${activeScholarshipForAi.amount.toLocaleString()} enables your next breakthrough.`
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveScholarship = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const newSch: Scholarship = {
      id: `sch-${Date.now()}`,
      title: formTitle,
      provider: formProvider || 'Collegiate Foundation',
      amount: Number(formAmount),
      deadline: formDeadline || new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
      eligibilityLevel: formEligibility,
      minGpa: formMinGpa,
      status: 'discovered',
      category: formCategory,
      requirements: ['Application Form', 'Transcript', 'Personal Essay'],
      essayPrompt: formPrompt,
      notes: formNotes,
    };

    setScholarships((prev) => [newSch, ...prev]);
    setIsAddModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-600" />
            <span>Scholarships & Grants Command</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Discover merit and need-based funding, track application stages, and draft winning essays with AI.
          </p>
        </div>

        <button
          onClick={() => {
            setFormTitle('');
            setFormProvider('');
            setFormAmount(5000);
            setFormDeadline(new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0]);
            setFormPrompt('');
            setFormNotes('');
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-500/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Track New Scholarship</span>
        </button>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-md shadow-emerald-500/15">
          <div className="flex items-center justify-between text-emerald-100 text-xs font-semibold">
            <span>Scholarships Awarded</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2">
            ${totalAwarded.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-100 mt-1">Disbursed directly toward tuition & tools</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-5 text-white shadow-md shadow-indigo-500/15">
          <div className="flex items-center justify-between text-indigo-100 text-xs font-semibold">
            <span>Active Pipeline Value</span>
            <DollarSign className="w-4 h-4 text-indigo-200" />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2">
            ${totalInPipeline.toLocaleString()}
          </div>
          <p className="text-[11px] text-indigo-100 mt-1">Across {activeCount} drafting & submitted grants</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>AI Essay Mentor</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-sm font-bold text-slate-800 mt-1">
            Winning Narrative Outlines & Hooks
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Click "AI Essay Help" on any grant to get 3 standout hooks and reviewer strategy!
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, provider, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="discovered">Discovered</option>
            <option value="drafting">Drafting Essay</option>
            <option value="submitted">Submitted</option>
            <option value="awarded">Awarded</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="all">All Categories</option>
            <option value="STEM">STEM</option>
            <option value="Merit">Merit</option>
            <option value="Need-Based">Need-Based</option>
            <option value="Leadership">Leadership</option>
            <option value="Diversity">Diversity</option>
          </select>
        </div>
      </div>

      {/* Scholarships List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredScholarships.map((s) => {
          const isAwarded = s.status === 'awarded';
          return (
            <div
              key={s.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                isAwarded ? 'border-emerald-300 ring-1 ring-emerald-300 bg-emerald-50/20' : 'border-slate-200'
              }`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                      {s.category}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{s.title}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Building className="w-3 h-3 text-slate-400" />
                      <span>{s.provider}</span>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-lg font-black text-emerald-600">
                      ${s.amount.toLocaleString()}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Award Amount</span>
                  </div>
                </div>

                {/* Details row */}
                <div className="grid grid-cols-2 gap-2 mt-3 p-2.5 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Deadline: {s.deadline}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-slate-400" />
                    <span>Min GPA: {s.minGpa ? s.minGpa.toFixed(1) : 'None'}</span>
                  </div>
                </div>

                {/* Requirements / Prompt */}
                {s.essayPrompt && (
                  <div className="mt-3 p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-slate-700">
                    <div className="font-semibold text-indigo-900 flex items-center gap-1 mb-0.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Essay Prompt:</span>
                    </div>
                    <p className="text-[11px] text-slate-600 italic line-clamp-2">{s.essayPrompt}</p>
                  </div>
                )}

                {s.notes && (
                  <div className="mt-2 text-[11px] text-slate-500 italic">
                    Note: {s.notes}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Status:</span>
                  <select
                    value={s.status}
                    onChange={(e) => handleStatusChange(s.id, e.target.value as ScholarshipStatus)}
                    className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="discovered">Discovered</option>
                    <option value="drafting">Drafting Essay</option>
                    <option value="submitted">Submitted</option>
                    <option value="awarded">Awarded ($)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenAiModal(s)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200/60"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>AI Essay Help</span>
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Essay Hook & Feedback Modal */}
      {isAiModalOpen && activeScholarshipForAi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">
                  AI Scholarship Mentor
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Essay Strategy for: {activeScholarshipForAi.title}
                </h3>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Essay Prompt:
                </label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium">
                  {activeScholarshipForAi.essayPrompt || 'Describe your academic background, passions, and community impact.'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Background & Key Experiences (Edit to tailor suggestions):
                </label>
                <textarea
                  rows={2}
                  value={essayBackground}
                  onChange={(e) => setEssayBackground(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <button
                onClick={handleGenerateEssaySupport}
                disabled={isAiLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2"
              >
                {isAiLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing Prompt & Generating Narrative Hooks...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Generate Standout Hooks & Winning Outline</span>
                  </>
                )}
              </button>

              {aiFeedback && (
                <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">AI Admissions Strategy Guide</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(aiFeedback);
                        setCopiedAi(true);
                        setTimeout(() => setCopiedAi(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:text-indigo-800"
                    >
                      {copiedAi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAi ? 'Copied' : 'Copy Guide'}</span>
                    </button>
                  </div>
                  <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line prose prose-sm max-w-none">
                    {aiFeedback}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Scholarship Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Track New Scholarship</h3>
            <form onSubmit={handleSaveScholarship} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Scholarship Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. National Merit Grant"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Provider / Organization</label>
                  <input
                    type="text"
                    value={formProvider}
                    onChange={(e) => setFormProvider(e.target.value)}
                    placeholder="e.g. Dell Scholars"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount ($ USD)</label>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="STEM">STEM</option>
                    <option value="Merit">Merit</option>
                    <option value="Need-Based">Need-Based</option>
                    <option value="Leadership">Leadership</option>
                    <option value="Diversity">Diversity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Min GPA</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formMinGpa}
                    onChange={(e) => setFormMinGpa(Number(e.target.value))}
                    className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Essay Prompt</label>
                <textarea
                  rows={2}
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="Paste scholarship essay prompt question..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Add Scholarship
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
