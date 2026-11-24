export type StudentLevel = 'university' | 'high_school';

export interface StudentProfile {
  name: string;
  level: StudentLevel;
  institution: string;
  majorOrGrade: string;
  term: string;
  targetGpa: number;
  currentGpa: number;
  streakDays: number;
  isPro: boolean;
  proSource?: 'none' | 'stripe' | 'flutterwave' | 'campus';
  campusDomain?: string;
  partnerInstitutionId?: string;
}

export type AssignmentPriority = 'low' | 'medium' | 'high' | 'urgent';
export type AssignmentStatus = 'todo' | 'in_progress' | 'submitted' | 'graded';

export interface Assignment {
  id: string;
  title: string;
  course: string;
  courseCode: string;
  color: string;
  dueDate: string;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  weightPercentage: number;
  estimatedHours: number;
  description?: string;
  rubricNotes?: string;
  gradeReceived?: string;
}

export interface ExamChecklistItem {
  id: string;
  topic: string;
  completed: boolean;
}

export interface Exam {
  id: string;
  course: string;
  courseCode: string;
  title: string;
  date: string;
  time: string;
  location: string;
  format: 'in_person' | 'online' | 'take_home';
  weightPercentage: number;
  confidenceLevel: number; // 1-5
  color: string;
  checklist: ExamChecklistItem[];
  studyNotesSummary?: string;
}

export type SimplifierMode = 'eli5' | 'analogy' | 'feynman' | 'summary' | 'quiz';

export interface SavedNote {
  id: string;
  title: string;
  course: string;
  topic: string;
  mode: SimplifierMode;
  explanation: string;
  createdAt: string;
  tags: string[];
}

export type ScholarshipStatus = 'discovered' | 'drafting' | 'submitted' | 'awarded' | 'archived';

export interface Scholarship {
  id: string;
  title: string;
  provider: string;
  amount: number;
  deadline: string;
  eligibilityLevel: 'all' | 'university' | 'high_school';
  minGpa?: number;
  status: ScholarshipStatus;
  category: 'STEM' | 'Merit' | 'Need-Based' | 'Leadership' | 'Diversity' | 'General';
  requirements: string[];
  essayPrompt?: string;
  applicationUrl?: string;
  notes?: string;
}

export interface ScheduleEvent {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "10:30"
  title: string;
  course?: string;
  type: 'lecture' | 'lab' | 'study' | 'exam' | 'break' | 'activity';
  color: string;
  location?: string;
}

export interface UniversityPartner {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'pending';
  perks: string[];
  studentsEnrolled: number;
}

export interface PartnerInquiry {
  id: string;
  requesterUid: string;
  institutionName: string;
  domain: string;
  contactName: string;
  contactRole: string;
  contactEmail: string;
  estimatedSeats: number;
  notes?: string;
  status: 'pending' | 'approved' | 'declined';
}

export interface AiUsageInfo {
  tier: 'guest' | 'free' | 'pro';
  proSource: 'none' | 'stripe' | 'flutterwave' | 'campus';
  used: number;
  limit: number | null;
  remaining: number | null;
}
