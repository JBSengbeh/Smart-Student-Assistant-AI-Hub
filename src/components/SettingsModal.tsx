import React, { useState, useEffect } from 'react';
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  StudentProfile,
  StudentLevel,
  Assignment,
  Exam,
  SavedNote,
  Scholarship,
  ScheduleEvent,
} from '../types/student';

interface BackupPayload {
  profile?: StudentProfile;
  assignments?: Assignment[];
  exams?: Exam[];
  notes?: SavedNote[];
  scholarships?: Scholarship[];
  schedule?: ScheduleEvent[];
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfile;
  setProfile: (updater: React.SetStateAction<StudentProfile>) => void | Promise<void>;
  assignments: Assignment[];
  exams: Exam[];
  savedNotes: SavedNote[];
  scholarships: Scholarship[];
  schedule: ScheduleEvent[];
  onImportBackup: (data: BackupPayload) => Promise<void>;
  onResetData: () => void | Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  setProfile,
  assignments,
  exams,
  savedNotes,
  scholarships,
  schedule,
  onImportBackup,
  onResetData,
}) => {
  const [name, setName] = useState(profile.name);
  const [level, setLevel] = useState<StudentLevel>(profile.level);
  const [institution, setInstitution] = useState(profile.institution);
  const [majorOrGrade, setMajorOrGrade] = useState(profile.majorOrGrade);
  const [term, setTerm] = useState(profile.term);
  const [currentGpa, setCurrentGpa] = useState(profile.currentGpa);
  const [targetGpa, setTargetGpa] = useState(profile.targetGpa);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [importNotice, setImportNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  useEffect(() => {
    if (isOpen) {
      setName(profile.name);
      setLevel(profile.level);
      setInstitution(profile.institution);
      setMajorOrGrade(profile.majorOrGrade);
      setTerm(profile.term);
      setCurrentGpa(profile.currentGpa);
      setTargetGpa(profile.targetGpa);
      setImportNotice(null);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await setProfile((prev) => ({
      ...prev,
      name,
      level,
      institution,
      majorOrGrade,
      term,
      currentGpa: Number(currentGpa),
      targetGpa: Number(targetGpa),
    }));
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1000);
  };

  const handleExportData = () => {
    const backup = {
      profile,
      assignments,
      exams,
      notes: savedNotes,
      scholarships,
      schedule,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-student-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as BackupPayload;
        await onImportBackup(data);
        setImportNotice({
          type: 'ok',
          text: 'Backup restored successfully to your workspace.',
        });
      } catch {
        setImportNotice({
          type: 'err',
          text: 'Invalid backup file. Please provide a valid Smart Student Assistant JSON file.',
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Student Profile & Settings</h2>
              <p className="text-xs text-slate-500">
                Configure your academic details and manage data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Your Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Tier
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as StudentLevel)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="university">University / College</option>
                <option value="high_school">High School</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Institution / School Name
            </label>
            <input
              type="text"
              required
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Major or Grade Level
              </label>
              <input
                type="text"
                required
                value={majorOrGrade}
                onChange={(e) => setMajorOrGrade(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Academic Term
              </label>
              <input
                type="text"
                required
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Current GPA</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="5"
                value={currentGpa}
                onChange={(e) => setCurrentGpa(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target GPA</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="5"
                value={targetGpa}
                onChange={(e) => setTargetGpa(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Profile Saved!</span>
                </>
              ) : (
                <span>Save Profile Changes</span>
              )}
            </button>
          </div>
        </form>

        {/* Data Backup & Restore */}
        <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Data Backup & Migration
          </h3>
          <p className="text-xs text-slate-500">
            Export your entire academic portfolio (assignments, exams, saved notes, scholarships) to
            a JSON file or restore from a previous backup.
          </p>

          {importNotice && (
            <div
              className={`p-2.5 rounded-xl text-xs font-semibold border ${
                importNotice.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {importNotice.text}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleExportData}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Portfolio Backup (.json)</span>
            </button>

            <label className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import Backup</span>
              <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
            </label>
          </div>

          {/* Reset button */}
          <div className="pt-3">
            {confirmReset ? (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-2">
                <div className="font-bold text-rose-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Reset all data to default demo state?</span>
                </div>
                <p className="text-rose-700 text-[11px]">
                  This will reload initial university sample assignments, exams, and notes.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      await onResetData();
                      setConfirmReset(false);
                      onClose();
                    }}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs"
                  >
                    Yes, Reset Data
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Default Demo State</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
