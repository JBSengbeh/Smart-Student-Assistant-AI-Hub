import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  Trash2,
  Edit2,
  Sparkles,
  Columns3,
  List,
  Flame,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Assignment, AssignmentPriority, AssignmentStatus } from '../types/student';

interface AssignmentsViewProps {
  assignments: Assignment[];
  setAssignments: React.Dispatch<React.SetStateAction<Assignment[]>>;
  onExplainTopic: (topic: string, subject: string) => void;
}

export const AssignmentsView: React.FC<AssignmentsViewProps> = ({
  assignments,
  setAssignments,
  onExplainTopic,
}) => {
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCourse, setFormCourse] = useState('');
  const [formCourseCode, setFormCourseCode] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formPriority, setFormPriority] = useState<AssignmentPriority>('medium');
  const [formStatus, setFormStatus] = useState<AssignmentStatus>('todo');
  const [formWeight, setFormWeight] = useState(10);
  const [formHours, setFormHours] = useState(3);
  const [formDesc, setFormDesc] = useState('');

  // Course unique options
  const courses = Array.from(new Set(assignments.map((a) => a.courseCode || a.course)));

  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.courseCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = selectedCourse === 'all' || a.courseCode === selectedCourse || a.course === selectedCourse;
    const matchesPriority = selectedPriority === 'all' || a.priority === selectedPriority;
    return matchesSearch && matchesCourse && matchesPriority;
  });

  const columns: { id: AssignmentStatus; label: string; bg: string; border: string; badge: string }[] = [
    { id: 'todo', label: 'To Do', bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-200 text-slate-700' },
    { id: 'in_progress', label: 'In Progress', bg: 'bg-blue-50/40', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800' },
    { id: 'submitted', label: 'Submitted', bg: 'bg-amber-50/40', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800' },
    { id: 'graded', label: 'Graded & Done', bg: 'bg-emerald-50/40', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-800' },
  ];

  const handleStatusChange = (assignmentId: string, newStatus: AssignmentStatus) => {
    if (newStatus === 'submitted' || newStatus === 'graded') {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (e) {}
    }

    setAssignments((prev) =>
      prev.map((a) => (a.id === assignmentId ? { ...a, status: newStatus } : a))
    );
  };

  const handleDelete = (id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  };

  const openCreateModal = () => {
    setEditingAssignment(null);
    setFormTitle('');
    setFormCourse('Computer Science');
    setFormCourseCode('CS 301');
    setFormDueDate(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
    setFormPriority('medium');
    setFormStatus('todo');
    setFormWeight(10);
    setFormHours(3);
    setFormDesc('');
    setIsModalOpen(true);
  };

  const openEditModal = (a: Assignment) => {
    setEditingAssignment(a);
    setFormTitle(a.title);
    setFormCourse(a.course);
    setFormCourseCode(a.courseCode);
    setFormDueDate(a.dueDate);
    setFormPriority(a.priority);
    setFormStatus(a.status);
    setFormWeight(a.weightPercentage);
    setFormHours(a.estimatedHours);
    setFormDesc(a.description || '');
    setIsModalOpen(true);
  };

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingAssignment) {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === editingAssignment.id
            ? {
                ...a,
                title: formTitle,
                course: formCourse,
                courseCode: formCourseCode,
                dueDate: formDueDate,
                priority: formPriority,
                status: formStatus,
                weightPercentage: Number(formWeight),
                estimatedHours: Number(formHours),
                description: formDesc,
              }
            : a
        )
      );
    } else {
      const newAsg: Assignment = {
        id: `asg-${Date.now()}`,
        title: formTitle,
        course: formCourse,
        courseCode: formCourseCode,
        color: 'indigo',
        dueDate: formDueDate,
        priority: formPriority,
        status: formStatus,
        weightPercentage: Number(formWeight),
        estimatedHours: Number(formHours),
        description: formDesc,
      };
      setAssignments((prev) => [newAsg, ...prev]);
    }

    setIsModalOpen(false);
  };

  const getPriorityBadge = (priority: AssignmentPriority) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">Urgent</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Medium</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">Low</span>;
    }
  };

  // Aggregated stats
  const pendingCount = assignments.filter((a) => a.status === 'todo' || a.status === 'in_progress').length;
  const totalPendingHours = assignments
    .filter((a) => a.status === 'todo' || a.status === 'in_progress')
    .reduce((sum, a) => sum + (a.estimatedHours || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-indigo-600" />
            <span>Assignments & Coursework Hub</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track problem sets, lab reports, and essays with smart time estimates and weightings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-4 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600">
            <div>
              <span className="text-slate-400">Pending: </span>
              <span className="font-bold text-slate-900">{pendingCount} tasks</span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div>
              <span className="text-slate-400">Est. Time: </span>
              <span className="font-bold text-indigo-600">~{totalPendingHours} hrs</span>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Assignment</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Search, Filters & View Toggle */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search assignments or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Courses</option>
            {courses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* View switcher: Board vs List */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={() => setViewMode('board')}
            className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 ${
              viewMode === 'board' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Columns3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kanban</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 ${
              viewMode === 'list' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'board' ? (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {columns.map((col) => {
            const colAssignments = filteredAssignments.filter((a) => a.status === col.id);
            return (
              <div
                key={col.id}
                className={`rounded-2xl border ${col.border} ${col.bg} p-4 flex flex-col min-h-[500px]`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{col.label}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${col.badge}`}>
                      {colAssignments.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colAssignments.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      No assignments here
                    </div>
                  ) : (
                    colAssignments.map((a) => (
                      <div
                        key={a.id}
                        className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            {a.courseCode}
                          </span>
                          {getPriorityBadge(a.priority)}
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                          {a.title}
                        </h4>

                        {a.description && (
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                            {a.description}
                          </p>
                        )}

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <div className="flex items-center gap-1 text-slate-600 font-medium">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>Due: {a.dueDate}</span>
                          </div>
                          <div className="flex items-center gap-1 font-semibold text-slate-700">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{a.estimatedHours}h</span>
                          </div>
                        </div>

                        {/* Card Actions & AI Explainer Shortcut */}
                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                          <button
                            onClick={() => onExplainTopic(a.title, a.course)}
                            title="Explain this topic simply with AI"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Explain Topic</span>
                          </button>

                          <div className="flex items-center gap-1">
                            {/* Fast status move */}
                            <select
                              value={a.status}
                              onChange={(e) => handleStatusChange(a.id, e.target.value as AssignmentStatus)}
                              className="text-[10px] font-medium bg-slate-100 rounded px-1.5 py-0.5 text-slate-700 border-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="submitted">Submitted</option>
                              <option value="graded">Graded</option>
                            </select>

                            <button
                              onClick={() => openEditModal(a)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDelete(a.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Assignment & Course</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Weight / Est.</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredAssignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{a.title}</div>
                      <div className="text-[11px] text-slate-500">
                        {a.courseCode} • {a.course}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-800">
                      {a.dueDate}
                    </td>
                    <td className="px-4 py-3.5">{getPriorityBadge(a.priority)}</td>
                    <td className="px-4 py-3.5">
                      <select
                        value={a.status}
                        onChange={(e) => handleStatusChange(a.id, e.target.value as AssignmentStatus)}
                        className="px-2 py-1 text-xs font-semibold rounded-lg bg-slate-100 border border-slate-200 text-slate-800"
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="submitted">Submitted</option>
                        <option value="graded">Graded</option>
                      </select>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {a.weightPercentage}% weight • ~{a.estimatedHours} hrs
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => onExplainTopic(a.title, a.course)}
                        className="px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded"
                        title="Explain topic with AI"
                      >
                        Explain
                      </button>
                      <button
                        onClick={() => openEditModal(a)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Assignment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingAssignment ? 'Edit Assignment' : 'Add New Assignment'}
            </h3>
            <form onSubmit={handleSaveAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assignment Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Distributed Consensus Simulation"
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
                    placeholder="e.g. CS 445"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Course Name</label>
                  <input
                    type="text"
                    value={formCourse}
                    onChange={(e) => setFormCourse(e.target.value)}
                    placeholder="e.g. Distributed Systems"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as AssignmentPriority)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as AssignmentStatus)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="submitted">Submitted</option>
                    <option value="graded">Graded</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Grade Weight (%)</label>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={formHours}
                    onChange={(e) => setFormHours(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description & Rubric Notes
                </label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Key deliverables, required file formats, rubric criteria..."
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
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  {editingAssignment ? 'Save Changes' : 'Create Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
