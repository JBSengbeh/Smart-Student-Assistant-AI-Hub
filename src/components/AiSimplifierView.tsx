import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Brain,
  Lightbulb,
  FileCheck2,
  HelpCircle,
  Bookmark,
  Share2,
  Copy,
  Check,
  RotateCw,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Search,
  ChevronRight,
  GraduationCap,
  Download,
  Crown,
  AlertCircle,
} from 'lucide-react';
import { SimplifierMode, SavedNote, StudentLevel } from '../types/student';
import { PRESET_DIFFICULT_TOPICS } from '../data/mockData';
import { useAppSync } from '../context/AuthAndSyncContext';
import { MarkdownRenderer } from './MarkdownRenderer';

interface AiSimplifierViewProps {
  level: StudentLevel;
  savedNotes: SavedNote[];
  setSavedNotes: (updater: React.SetStateAction<SavedNote[]>) => void | Promise<void>;
  initialTopic?: string;
  onUpgrade?: () => void;
}

export const AiSimplifierView: React.FC<AiSimplifierViewProps> = ({
  level,
  savedNotes,
  setSavedNotes,
  initialTopic = '',
  onUpgrade,
}) => {
  const { authorizedFetch, aiUsage, setAiUsage } = useAppSync();
  const [topicInput, setTopicInput] = useState(initialTopic || 'Quantum Superposition & Wave Collapse');
  const [subjectInput, setSubjectInput] = useState('Physics');
  const [mode, setMode] = useState<SimplifierMode>('eli5');
  const [studentLevel, setStudentLevel] = useState<StudentLevel>(level);
  const [extraQuestion, setExtraQuestion] = useState('');
  const [explanation, setExplanation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'explainer' | 'notebook'>('explainer');
  const [searchNotes, setSearchNotes] = useState('');
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [upgradePrompt, setUpgradePrompt] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialTopic) {
      setTopicInput(initialTopic);
    }
  }, [initialTopic]);

  // Mode descriptors
  const MODES: { id: SimplifierMode; label: string; desc: string; icon: any; color: string }[] = [
    {
      id: 'eli5',
      label: "Explain Like I'm 5",
      desc: 'Playful metaphors, intuitive imagery, zero jargon',
      icon: Sparkles,
      color: 'from-amber-500 to-orange-500',
    },
    {
      id: 'analogy',
      label: 'Everyday Analogy',
      desc: 'Relates to cooking, sports, gaming, and real life',
      icon: Lightbulb,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'feynman',
      label: 'Feynman Technique',
      desc: 'First principles, deep mechanism, tests for blindspots',
      icon: Brain,
      color: 'from-purple-500 to-indigo-500',
    },
    {
      id: 'summary',
      label: 'Exam Cram Sheet',
      desc: 'High-yield takeaways, formulas, and common traps',
      icon: FileCheck2,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      id: 'quiz',
      label: 'Interactive Flashcards',
      desc: '3 concept checks with hints & test answers',
      icon: HelpCircle,
      color: 'from-rose-500 to-pink-500',
    },
  ];

  const handleGenerate = async (customTopic?: string, customSubject?: string, customMode?: SimplifierMode) => {
    const targetTopic = customTopic || topicInput;
    const targetSubject = customSubject || subjectInput;
    const targetMode = customMode || mode;

    if (!targetTopic.trim()) return;

    setIsLoading(true);
    setCopied(false);
    setSavedSuccess(false);
    setUpgradePrompt(null);
    stopSpeech();

    try {
      const res = await authorizedFetch('/api/ai/explain', {
        method: 'POST',
        body: JSON.stringify({
          topic: targetTopic,
          subject: targetSubject,
          mode: targetMode,
          level: studentLevel,
          extraContext: extraQuestion,
        }),
      });

      const data = await res.json();
      if (data.usage) {
        setAiUsage((prev) => ({ ...prev, ...data.usage }));
      }

      if (res.status === 402 || data.code === 'PRO_REQUIRED') {
        setUpgradePrompt(
          data.error ||
            'Daily free AI study limit reached. Upgrade to Student Pro or verify a campus email for unlimited access.'
        );
        return;
      }

      if (data.explanation) {
        setExplanation(data.explanation);
      } else {
        setExplanation('Unable to generate explanation right now. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setExplanation(
        `### ${targetTopic} (${targetMode.toUpperCase()})\n\nImagine this like a team relay race where each runner passes the baton smoothly. The key intuition is that complex systems are just small, simple rules repeated with discipline.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowUp = async () => {
    if (!followUpQuestion.trim() || !explanation) return;
    setIsLoading(true);
    setUpgradePrompt(null);
    stopSpeech();
    try {
      const res = await authorizedFetch('/api/ai/explain', {
        method: 'POST',
        body: JSON.stringify({
          topic: `${topicInput} - Follow-up: ${followUpQuestion}`,
          subject: subjectInput,
          mode,
          level: studentLevel,
          extraContext: `Previous explanation: "${explanation.slice(0, 300)}...". Student asks: "${followUpQuestion}"`,
        }),
      });
      const data = await res.json();
      if (data.usage) {
        setAiUsage((prev) => ({ ...prev, ...data.usage }));
      }

      if (res.status === 402 || data.code === 'PRO_REQUIRED') {
        setUpgradePrompt(
          data.error ||
            'Daily free AI study limit reached. Upgrade to Student Pro or verify a campus email for unlimited access.'
        );
        return;
      }

      if (data.explanation) {
        setExplanation(
          (prev) => `${prev}\n\n---\n\n#### 💬 Follow-Up: "${followUpQuestion}"\n${data.explanation}`
        );
        setFollowUpQuestion('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToNotebook = () => {
    if (!explanation) return;
    const newNote: SavedNote = {
      id: `note-${Date.now()}`,
      title: `${topicInput} (${mode.toUpperCase()})`,
      course: subjectInput || 'General',
      topic: topicInput,
      mode,
      explanation,
      createdAt: 'Just now',
      tags: [subjectInput, mode.toUpperCase(), studentLevel === 'university' ? 'College' : 'High School'],
    };

    setSavedNotes((prev) => [newNote, ...prev]);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleCopy = () => {
    if (!explanation) return;
    navigator.clipboard.writeText(explanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!explanation) return;
    const content = `# ${topicInput}\n\n**Subject:** ${subjectInput}  \n**Style:** ${mode.toUpperCase()}  \n**Level:** ${studentLevel}  \n\n---\n\n${explanation}`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topicInput.toLowerCase().replace(/[^a-z0-9]/g, '-')}-study-note.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const cleanText = explanation.replace(/[#*`_]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const filteredNotes = savedNotes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchNotes.toLowerCase()) ||
      n.topic.toLowerCase().includes(searchNotes.toLowerCase()) ||
      n.course.toLowerCase().includes(searchNotes.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-6 sm:p-8 shadow-xl mb-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/20 mb-3 text-indigo-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Special Feature: AI Topic Simplifier</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Demystify Any Difficult Academic Topic
            </h1>
            <p className="mt-2 text-sm sm:text-base text-indigo-200 leading-relaxed">
              Stuck on dense textbook equations, confusing algorithms, or complex biology cycles?
              Get crystal-clear breakdowns in everyday language tailored to your learning style.
            </p>
          </div>

          {/* Toggle between Explainer and Notebook + Quota Badge */}
          <div className="flex flex-col items-start md:items-end gap-2.5 self-start md:self-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-md border border-white/25 text-white">
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {aiUsage.tier === 'pro'
                  ? aiUsage.proSource === 'campus'
                    ? 'Campus Pro • Unlimited AI'
                    : 'Student Pro • Unlimited AI'
                  : `Remaining today: ${aiUsage.remaining ?? 0}/${aiUsage.limit ?? 5} AI sessions`}
              </span>
            </div>

            <div className="flex bg-white/10 p-1 rounded-xl backdrop-blur-md border border-white/20">
              <button
                onClick={() => setActiveTab('explainer')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'explainer'
                    ? 'bg-white text-indigo-950 shadow-md'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Explainer Studio
              </button>
              <button
                onClick={() => setActiveTab('notebook')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'notebook'
                    ? 'bg-white text-indigo-950 shadow-md'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>My Notebook ({savedNotes.length})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'notebook' ? (
        /* Saved Notebook View */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search saved topic explanations..."
                value={searchNotes}
                onChange={(e) => setSearchNotes(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={() => setActiveTab('explainer')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Explain New Topic</span>
            </button>
          </div>

          {filteredNotes.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No notes saved yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Use the Explainer Studio to break down tricky concepts and click "Save to Notebook"
                to build your personal study guide.
              </p>
              <button
                onClick={() => setActiveTab('explainer')}
                className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
              >
                Go to Explainer Studio
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                        {note.course}
                      </span>
                      <span className="text-xs text-slate-400">{note.createdAt}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-3">{note.title}</h3>
                    <div className="max-h-36 overflow-hidden bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <MarkdownRenderer content={note.explanation} />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {note.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setTopicInput(note.topic);
                          setSubjectInput(note.course);
                          setMode(note.mode);
                          setExplanation(note.explanation);
                          setActiveTab('explainer');
                        }}
                        className="px-2.5 py-1 text-xs text-indigo-600 font-medium hover:bg-indigo-50 rounded"
                      >
                        Open in Studio
                      </button>
                      <button
                        onClick={() =>
                          setSavedNotes((prev) => prev.filter((item) => item.id !== note.id))
                        }
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Delete note"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Explainer Studio View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Input and Mode Controls */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-600" />
                <span>Configure Simplification</span>
              </h2>

              {/* Topic & Subject Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    What topic or concept are you struggling with?
                  </label>
                  <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="e.g. Raft Consensus, Krebs Cycle, Eigenvalues, Photosynthesis..."
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Subject / Course
                    </label>
                    <input
                      type="text"
                      value={subjectInput}
                      onChange={(e) => setSubjectInput(e.target.value)}
                      placeholder="e.g. CS 445, Physics, Bio"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Audience Level
                    </label>
                    <select
                      value={studentLevel}
                      onChange={(e) => setStudentLevel(e.target.value as StudentLevel)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    >
                      <option value="university">University / College</option>
                      <option value="high_school">High School</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Specific question or confusion point (optional)
                  </label>
                  <input
                    type="text"
                    value={extraQuestion}
                    onChange={(e) => setExtraQuestion(e.target.value)}
                    placeholder="e.g., Why do we need the leader heartbeat? Can you use numbers?"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  />
                </div>
              </div>

              {/* Simplification Mode Picker */}
              <div className="mt-6">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Choose Simplification Style
                </label>
                <div className="space-y-2">
                  {MODES.map((item) => {
                    const Icon = item.icon;
                    const isSelected = mode === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setMode(item.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 bg-gradient-to-br ${item.color}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">{item.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={() => handleGenerate()}
                disabled={isLoading || !topicInput.trim()}
                className="mt-6 w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-md shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Simplifying with Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Explain Topic Simply</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Presets Section */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>Try Classic Difficult Topics</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_DIFFICULT_TOPICS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setTopicInput(item.topic);
                      setSubjectInput(item.subject);
                      setStudentLevel(item.level as StudentLevel);
                      handleGenerate(item.topic, item.subject);
                    }}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-transparent text-slate-700 font-medium transition-colors text-left"
                  >
                    {item.topic}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Output & Follow-up */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col min-h-[580px]">
              {/* Output Top Bar */}
              <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 rounded-t-2xl">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded">
                    {mode.toUpperCase()} Explanation
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1 truncate max-w-[280px] sm:max-w-[380px]">
                    {topicInput || 'Topic Explanation'}
                  </h3>
                </div>

                {explanation && (
                  <div className="flex items-center gap-2">
                    {/* Read Aloud Button */}
                    <button
                      onClick={toggleSpeech}
                      title={isSpeaking ? 'Stop voice readout' : 'Read aloud with speech audio'}
                      className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                        isSpeaking
                          ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                          <span className="hidden sm:inline">Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="hidden sm:inline">Listen</span>
                        </>
                      )}
                    </button>

                    {/* Copy Button */}
                    <button
                      onClick={handleCopy}
                      title="Copy explanation"
                      className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    {/* Download Markdown Note */}
                    <button
                      onClick={handleDownloadMarkdown}
                      title="Download as Markdown (.md) note"
                      className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                    </button>

                    {/* Save to Notebook Button */}
                    <button
                      onClick={handleSaveToNotebook}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        savedSuccess
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                      }`}
                    >
                      {savedSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Saved!</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>Save Note</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Output Content Area */}
              <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
                {upgradePrompt && (
                  <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5 text-xs text-amber-950">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">Daily Free AI Quota Reached</div>
                        <p className="text-amber-800 mt-0.5">{upgradePrompt}</p>
                      </div>
                    </div>
                    {onUpgrade && (
                      <button
                        onClick={onUpgrade}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5"
                      >
                        <Crown className="w-3.5 h-3.5 text-amber-300" />
                        <span>Unlock Unlimited Pro</span>
                      </button>
                    )}
                  </div>
                )}

                {isLoading ? (
                  <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 animate-pulse">
                        <Sparkles className="w-8 h-8 animate-spin-slow" />
                      </div>
                    </div>
                    <h4 className="mt-4 text-sm font-bold text-slate-800">
                      Transforming "{topicInput}" into clear language...
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Stripping away jargon, applying real-world metaphors, and crafting intuitive
                      breakdowns.
                    </p>
                  </div>
                ) : explanation ? (
                  <MarkdownRenderer content={explanation} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-20 text-center text-slate-400">
                    <Lightbulb className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="text-sm font-semibold text-slate-700">No explanation generated yet</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Select a topic on the left or click any of the preset difficult topics to see
                      the AI Simplifier in action!
                    </p>
                    <button
                      onClick={() => handleGenerate()}
                      className="mt-4 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold border border-indigo-200"
                    >
                      Explain "{topicInput}" now
                    </button>
                  </div>
                )}
              </div>

              {/* Follow-up / Clarification box */}
              {explanation && (
                <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Ask a clarifying question (e.g. 'Can you give an example with numbers?')..."
                      value={followUpQuestion}
                      onChange={(e) => setFollowUpQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFollowUp()}
                      className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    />
                    <button
                      onClick={handleFollowUp}
                      disabled={isLoading || !followUpQuestion.trim()}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0"
                    >
                      <span>Ask AI</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
