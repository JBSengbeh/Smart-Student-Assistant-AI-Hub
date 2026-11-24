import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  OperationType,
  handleFirestoreError,
} from '../lib/firebase';
import {
  StudentProfile,
  Assignment,
  Exam,
  SavedNote,
  Scholarship,
  ScheduleEvent,
  AiUsageInfo,
} from '../types/student';
import {
  INITIAL_UNIVERSITY_PROFILE,
  INITIAL_ASSIGNMENTS,
  INITIAL_EXAMS,
  INITIAL_SAVED_NOTES,
  INITIAL_SCHOLARSHIPS,
  INITIAL_SCHEDULE,
} from '../data/mockData';

const ADMIN_EMAIL = 'lapcur3@gmail.com';

interface AuthAndSyncContextValue {
  firebaseUser: User | null;
  authReady: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  profile: StudentProfile;
  updateProfile: (updater: React.SetStateAction<StudentProfile>) => Promise<void>;
  assignments: Assignment[];
  updateAssignments: (updater: React.SetStateAction<Assignment[]>) => Promise<void>;
  exams: Exam[];
  updateExams: (updater: React.SetStateAction<Exam[]>) => Promise<void>;
  savedNotes: SavedNote[];
  updateSavedNotes: (updater: React.SetStateAction<SavedNote[]>) => Promise<void>;
  scholarships: Scholarship[];
  updateScholarships: (updater: React.SetStateAction<Scholarship[]>) => Promise<void>;
  schedule: ScheduleEvent[];
  updateSchedule: (updater: React.SetStateAction<ScheduleEvent[]>) => Promise<void>;
  entitlementToken: string | null;
  applyEntitlement: (payload: {
    proSource: 'stripe' | 'flutterwave' | 'campus';
    entitlementToken: string;
    campusDomain?: string;
    institutionName?: string;
    partnerId?: string;
    stripeSessionId?: string;
    flutterwaveTxId?: string;
  }) => Promise<void>;
  aiUsage: AiUsageInfo;
  setAiUsage: React.Dispatch<React.SetStateAction<AiUsageInfo>>;
  refreshUsage: () => Promise<void>;
  authorizedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  resetDemoData: () => Promise<void>;
  checkoutNotice: string | null;
  clearCheckoutNotice: () => void;
}

const AuthAndSyncContext = createContext<AuthAndSyncContextValue | null>(null);

function sanitizeId(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 128);
  return cleaned || `item-${Date.now()}`;
}

function clampStr(val: unknown, max: number, fallback = ''): string {
  if (typeof val !== 'string') return fallback;
  return val.slice(0, max);
}

export const AuthAndSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Local fallback / guest state
  const [profile, setProfile] = useState<StudentProfile>(() => {
    const saved = localStorage.getItem('ssa_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...parsed, isPro: false, proSource: 'none' };
      } catch {
        return { ...INITIAL_UNIVERSITY_PROFILE, isPro: false, proSource: 'none' };
      }
    }
    return { ...INITIAL_UNIVERSITY_PROFILE, isPro: false, proSource: 'none' };
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

  const [entitlementToken, setEntitlementToken] = useState<string | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsageInfo>({
    tier: 'guest',
    proSource: 'none',
    used: 0,
    limit: 2,
    remaining: 2,
  });

  const isSyncingRef = useRef(false);

  // Persist guest copies in localStorage when signed out
  useEffect(() => {
    if (!firebaseUser) {
      localStorage.setItem('ssa_profile', JSON.stringify(profile));
    }
  }, [profile, firebaseUser]);

  useEffect(() => {
    if (!firebaseUser) {
      localStorage.setItem('ssa_assignments', JSON.stringify(assignments));
    }
  }, [assignments, firebaseUser]);

  useEffect(() => {
    if (!firebaseUser) {
      localStorage.setItem('ssa_exams', JSON.stringify(exams));
    }
  }, [exams, firebaseUser]);

  useEffect(() => {
    if (!firebaseUser) {
      localStorage.setItem('ssa_notes', JSON.stringify(savedNotes));
    }
  }, [savedNotes, firebaseUser]);

  useEffect(() => {
    if (!firebaseUser) {
      localStorage.setItem('ssa_scholarships', JSON.stringify(scholarships));
    }
  }, [scholarships, firebaseUser]);

  useEffect(() => {
    if (!firebaseUser) {
      localStorage.setItem('ssa_schedule', JSON.stringify(schedule));
    }
  }, [schedule, firebaseUser]);

  const authorizedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers || {});
      if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
      }
      if (auth.currentUser) {
        try {
          const idToken = await auth.currentUser.getIdToken();
          headers.set('Authorization', `Bearer ${idToken}`);
        } catch {
          // continue unauthenticated if token fetch fails
        }
      }
      if (entitlementToken) {
        headers.set('X-Entitlement-Token', entitlementToken);
      }
      return fetch(url, { ...options, headers });
    },
    [entitlementToken]
  );

  const refreshUsage = useCallback(async () => {
    try {
      const res = await authorizedFetch('/api/usage');
      if (res.ok) {
        const data = await res.json();
        setAiUsage({
          tier: data.tier,
          proSource: data.proSource || 'none',
          used: data.used ?? 0,
          limit: data.limit ?? null,
          remaining: data.remaining ?? null,
        });
      }
    } catch {
      // ignore transient network errors
    }
  }, [authorizedFetch]);

  const applyEntitlement = useCallback(
    async (payload: {
      proSource: 'stripe' | 'flutterwave' | 'campus';
      entitlementToken: string;
      campusDomain?: string;
      institutionName?: string;
      partnerId?: string;
      stripeSessionId?: string;
      flutterwaveTxId?: string;
    }) => {
      setEntitlementToken(payload.entitlementToken);
      setProfile((prev) => ({
        ...prev,
        isPro: true,
        proSource: payload.proSource,
        campusDomain: payload.campusDomain || prev.campusDomain,
        institution: payload.institutionName || prev.institution,
        partnerInstitutionId: payload.partnerId || prev.partnerInstitutionId,
      }));
      setAiUsage({
        tier: 'pro',
        proSource: payload.proSource,
        used: 0,
        limit: null,
        remaining: null,
      });

      const user = auth.currentUser;
      if (user && user.emailVerified) {
        const privatePath = `users/${user.uid}/private/info`;
        try {
          await setDoc(
            doc(db, 'users', user.uid, 'private', 'info'),
            {
              uid: user.uid,
              email: clampStr(user.email, 254, 'student@example.com'),
              planTier: 'pro',
              proSource: payload.proSource,
              entitlementToken: clampStr(payload.entitlementToken, 1024),
              ...(payload.campusDomain ? { campusDomain: clampStr(payload.campusDomain, 120) } : {}),
              ...(payload.stripeSessionId
                ? { stripeSessionId: clampStr(payload.stripeSessionId, 200) }
                : {}),
              ...(payload.flutterwaveTxId
                ? { flutterwaveTxId: clampStr(payload.flutterwaveTxId, 120) }
                : {}),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, privatePath);
        }

        if (payload.institutionName) {
          const userPath = `users/${user.uid}`;
          try {
            await setDoc(
              doc(db, 'users', user.uid),
              {
                institution: clampStr(payload.institutionName, 150),
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, userPath);
          }
        }
      }
    },
    []
  );

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (!user) {
        setEntitlementToken(null);
        setProfile((prev) => ({ ...prev, isPro: false, proSource: 'none' }));
      }
    });
    return () => unsub();
  }, []);

  // Refresh AI usage whenever user or entitlement changes
  useEffect(() => {
    if (authReady) {
      refreshUsage();
    }
  }, [authReady, firebaseUser, entitlementToken, refreshUsage]);

  // Bootstrap Firestore user doc & subscribe to real-time collections when signed in
  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified) {
      return;
    }

    const uid = firebaseUser.uid;
    let cancelled = false;
    const unsubs: (() => void)[] = [];

    const bootstrapAndListen = async () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;

      try {
        const userDocRef = doc(db, 'users', uid);
        let userSnap;
        try {
          userSnap = await getDoc(userDocRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${uid}`);
        }

        if (!userSnap.exists()) {
          // First-time sign in: create public profile, private record, and migrate current workspace
          const batch = writeBatch(db);
          batch.set(userDocRef, {
            uid,
            displayName: clampStr(firebaseUser.displayName || profile.name, 100, 'Student'),
            level: profile.level,
            institution: clampStr(profile.institution, 150, 'University'),
            majorOrGrade: clampStr(profile.majorOrGrade, 150, 'Undeclared'),
            term: clampStr(profile.term, 80, 'Fall 2026'),
            targetGpa: Number(profile.targetGpa) || 3.8,
            currentGpa: Number(profile.currentGpa) || 3.7,
            streakDays: Number(profile.streakDays) || 1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          batch.set(doc(db, 'users', uid, 'private', 'info'), {
            uid,
            email: clampStr(firebaseUser.email, 254, 'student@example.com'),
            planTier: 'free',
            proSource: 'none',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          assignments.forEach((a) => {
            const id = sanitizeId(a.id);
            batch.set(doc(db, 'users', uid, 'assignments', id), {
              id,
              ownerId: uid,
              title: clampStr(a.title, 200, 'Assignment'),
              course: clampStr(a.course, 120),
              courseCode: clampStr(a.courseCode, 40),
              color: clampStr(a.color, 30, 'indigo'),
              dueDate: clampStr(a.dueDate, 30),
              priority: a.priority,
              status: a.status,
              weightPercentage: Number(a.weightPercentage) || 10,
              estimatedHours: Number(a.estimatedHours) || 2,
              ...(a.description ? { description: clampStr(a.description, 2000) } : {}),
              ...(a.rubricNotes ? { rubricNotes: clampStr(a.rubricNotes, 2000) } : {}),
              ...(a.gradeReceived ? { gradeReceived: clampStr(a.gradeReceived, 40) } : {}),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          });

          exams.forEach((ex) => {
            const id = sanitizeId(ex.id);
            batch.set(doc(db, 'users', uid, 'exams', id), {
              id,
              ownerId: uid,
              course: clampStr(ex.course, 120),
              courseCode: clampStr(ex.courseCode, 40),
              title: clampStr(ex.title, 200, 'Exam'),
              date: clampStr(ex.date, 30),
              time: clampStr(ex.time, 60),
              location: clampStr(ex.location, 150),
              format: ex.format,
              weightPercentage: Number(ex.weightPercentage) || 25,
              confidenceLevel: Math.min(5, Math.max(1, Number(ex.confidenceLevel) || 3)),
              color: clampStr(ex.color, 30, 'blue'),
              checklist: (ex.checklist || []).slice(0, 30),
              ...(ex.studyNotesSummary
                ? { studyNotesSummary: clampStr(ex.studyNotesSummary, 2000) }
                : {}),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          });

          savedNotes.forEach((n) => {
            const id = sanitizeId(n.id);
            batch.set(doc(db, 'users', uid, 'notes', id), {
              id,
              ownerId: uid,
              title: clampStr(n.title, 200, 'Study Note'),
              course: clampStr(n.course, 120),
              topic: clampStr(n.topic, 200),
              mode: n.mode,
              explanation: clampStr(n.explanation, 20000),
              tags: (n.tags || []).slice(0, 10).map((t) => clampStr(t, 40)),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          });

          scholarships.forEach((s) => {
            const id = sanitizeId(s.id);
            batch.set(doc(db, 'users', uid, 'scholarships', id), {
              id,
              ownerId: uid,
              title: clampStr(s.title, 200, 'Scholarship'),
              provider: clampStr(s.provider, 150),
              amount: Number(s.amount) || 0,
              deadline: clampStr(s.deadline, 30),
              eligibilityLevel: s.eligibilityLevel,
              ...(s.minGpa !== undefined ? { minGpa: Number(s.minGpa) } : {}),
              status: s.status,
              category: s.category,
              requirements: (s.requirements || []).slice(0, 20).map((r) => clampStr(r, 200)),
              ...(s.essayPrompt ? { essayPrompt: clampStr(s.essayPrompt, 2000) } : {}),
              ...(s.applicationUrl ? { applicationUrl: clampStr(s.applicationUrl, 500) } : {}),
              ...(s.notes ? { notes: clampStr(s.notes, 2000) } : {}),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          });

          schedule.forEach((ev) => {
            const id = sanitizeId(ev.id);
            batch.set(doc(db, 'users', uid, 'schedule', id), {
              id,
              ownerId: uid,
              day: ev.day,
              startTime: clampStr(ev.startTime, 10),
              endTime: clampStr(ev.endTime, 10),
              title: clampStr(ev.title, 200, 'Study Session'),
              ...(ev.course ? { course: clampStr(ev.course, 60) } : {}),
              type: ev.type,
              color: clampStr(ev.color, 30, 'indigo'),
              ...(ev.location ? { location: clampStr(ev.location, 150) } : {}),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          });

          try {
            await batch.commit();
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
          }
        }

        if (cancelled) return;

        // Subscribe to public profile
        unsubs.push(
          onSnapshot(
            doc(db, 'users', uid),
            (snap) => {
              if (snap.exists()) {
                const d = snap.data();
                setProfile((prev) => ({
                  ...prev,
                  name: d.displayName || prev.name,
                  level: d.level || prev.level,
                  institution: d.institution || prev.institution,
                  majorOrGrade: d.majorOrGrade || prev.majorOrGrade,
                  term: d.term || prev.term,
                  targetGpa: d.targetGpa ?? prev.targetGpa,
                  currentGpa: d.currentGpa ?? prev.currentGpa,
                  streakDays: d.streakDays ?? prev.streakDays,
                }));
              }
            },
            (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
          )
        );

        // Subscribe to private billing info
        unsubs.push(
          onSnapshot(
            doc(db, 'users', uid, 'private', 'info'),
            async (snap) => {
              if (!snap.exists()) return;
              const d = snap.data();
              if (d.entitlementToken) {
                setEntitlementToken(d.entitlementToken);
              }
              if (d.planTier === 'pro' && d.proSource === 'flutterwave' && d.flutterwaveTxId) {
                try {
                  const idToken = await firebaseUser.getIdToken();
                  const verifyRes = await fetch('/api/billing/flutterwave/confirm', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({ transactionId: d.flutterwaveTxId }),
                  });
                  if (verifyRes.ok) {
                    const verified = await verifyRes.json();
                    if (verified.entitlementToken) {
                      setEntitlementToken(verified.entitlementToken);
                    }
                  }
                } catch {
                  // ignore if Flutterwave isn't configured in current env
                }
              } else if (d.planTier === 'pro' && d.proSource === 'stripe' && d.stripeSessionId) {
                // Re-confirm with server in case process restarted with a fresh signing secret
                try {
                  const idToken = await firebaseUser.getIdToken();
                  const verifyRes = await fetch('/api/billing/confirm-checkout', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({ sessionId: d.stripeSessionId }),
                  });
                  if (verifyRes.ok) {
                    const verified = await verifyRes.json();
                    if (verified.entitlementToken) {
                      setEntitlementToken(verified.entitlementToken);
                    }
                  }
                } catch {
                  // ignore if Stripe isn't configured in current env
                }
              }
            },
            (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}/private/info`)
          )
        );

        // Helper for listening to user-owned subcollections with Pillar 8 ownerId filter
        const subscribeSubcollection = <T,>(
          sub: string,
          setter: React.Dispatch<React.SetStateAction<T[]>>,
          mapper?: (data: any) => T
        ) => {
          const pathStr = `users/${uid}/${sub}`;
          const q = query(collection(db, 'users', uid, sub), where('ownerId', '==', uid));
          unsubs.push(
            onSnapshot(
              q,
              (snap) => {
                const items = snap.docs.map((docSnap) => {
                  const raw = docSnap.data();
                  return mapper ? mapper(raw) : (raw as T);
                });
                setter(items);
              },
              (err) => handleFirestoreError(err, OperationType.LIST, pathStr)
            )
          );
        };

        subscribeSubcollection<Assignment>('assignments', setAssignments);
        subscribeSubcollection<Exam>('exams', setExams);
        subscribeSubcollection<SavedNote>('notes', setSavedNotes, (raw) => ({
          ...raw,
          createdAt:
            raw.createdAt?.toDate ? raw.createdAt.toDate().toLocaleDateString() : 'Saved',
        }));
        subscribeSubcollection<Scholarship>('scholarships', setScholarships);
        subscribeSubcollection<ScheduleEvent>('schedule', setSchedule);

        // Check URL for Flutterwave or Stripe checkout return
        const params = new URLSearchParams(window.location.search);
        const flwCheckout = params.get('flw_checkout');
        const flwStatus = params.get('status');
        const flwTransactionId = params.get('transaction_id');
        const checkoutStatus = params.get('checkout');
        const sessionId = params.get('session_id');

        if (flwCheckout === 'success') {
          if (
            (flwStatus === 'successful' || flwStatus === 'completed') &&
            flwTransactionId
          ) {
            const idToken = await firebaseUser.getIdToken();
            const confirmRes = await fetch('/api/billing/flutterwave/confirm', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({ transactionId: flwTransactionId }),
            });
            if (confirmRes.ok) {
              const confirmed = await confirmRes.json();
              await applyEntitlement({
                proSource: 'flutterwave',
                entitlementToken: confirmed.entitlementToken,
                flutterwaveTxId: confirmed.flutterwaveTxId,
              });
              setCheckoutNotice(
                'Flutterwave payment confirmed! Your Student Pro account is now active.'
              );
            } else {
              setCheckoutNotice(
                'Could not verify Flutterwave payment yet. Please contact support if you were charged.'
              );
            }
          } else {
            setCheckoutNotice(
              'Flutterwave checkout was cancelled. You remain on your current plan.'
            );
          }
          window.history.replaceState({}, '', window.location.pathname);
        } else if (checkoutStatus === 'success' && sessionId) {
          const idToken = await firebaseUser.getIdToken();
          const confirmRes = await fetch('/api/billing/confirm-checkout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ sessionId }),
          });
          if (confirmRes.ok) {
            const confirmed = await confirmRes.json();
            await applyEntitlement({
              proSource: 'stripe',
              entitlementToken: confirmed.entitlementToken,
              stripeSessionId: confirmed.stripeSessionId,
            });
            setCheckoutNotice('Payment confirmed! Your Student Pro account is now active.');
          }
          window.history.replaceState({}, '', window.location.pathname);
        } else if (checkoutStatus === 'cancelled') {
          setCheckoutNotice('Checkout was cancelled. You remain on your current plan.');
          window.history.replaceState({}, '', window.location.pathname);
        }

        // Auto-verify if signed-in Google email belongs to an active partner university
        const idToken = await firebaseUser.getIdToken();
        const campusRes = await fetch('/api/campus/auto-verify', {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (campusRes.ok) {
          const campusData = await campusRes.json();
          if (campusData.verified && campusData.entitlementToken) {
            await applyEntitlement({
              proSource: 'campus',
              entitlementToken: campusData.entitlementToken,
              campusDomain: campusData.campusDomain,
              institutionName: campusData.institutionName,
              partnerId: campusData.partnerId,
            });
          }
        }
      } finally {
        isSyncingRef.current = false;
      }
    };

    bootstrapAndListen();

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, firebaseUser?.uid]);

  // Sync helpers for collections (diff local update against Firestore when authenticated)
  const syncCollectionDiff = useCallback(
    async <T extends { id: string }>(
      subcollection: string,
      prevItems: T[],
      nextItems: T[],
      buildDoc: (item: T, uid: string, isNew: boolean) => Record<string, any>
    ) => {
      const user = auth.currentUser;
      if (!user || !user.emailVerified) return;
      const uid = user.uid;

      const prevMap = new Map(prevItems.map((i) => [i.id, i]));
      const nextMap = new Map(nextItems.map((i) => [i.id, i]));

      for (const prev of prevItems) {
        if (!nextMap.has(prev.id)) {
          const id = sanitizeId(prev.id);
          try {
            await deleteDoc(doc(db, 'users', uid, subcollection, id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `users/${uid}/${subcollection}/${id}`);
          }
        }
      }

      for (const next of nextItems) {
        const prev = prevMap.get(next.id);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(next)) {
          const id = sanitizeId(next.id);
          const payload = buildDoc({ ...next, id }, uid, !prev);
          try {
            if (!prev) {
              await setDoc(doc(db, 'users', uid, subcollection, id), payload);
            } else {
              await setDoc(doc(db, 'users', uid, subcollection, id), payload, { merge: true });
            }
          } catch (err) {
            handleFirestoreError(
              err,
              prev ? OperationType.UPDATE : OperationType.CREATE,
              `users/${uid}/${subcollection}/${id}`
            );
          }
        }
      }
    },
    []
  );

  const updateProfile = useCallback(
    async (updater: React.SetStateAction<StudentProfile>) => {
      const next = typeof updater === 'function' ? updater(profile) : updater;
      setProfile(next);
      const user = auth.currentUser;
      if (user && user.emailVerified) {
        const uid = user.uid;
        try {
          await setDoc(
            doc(db, 'users', uid),
            {
              displayName: clampStr(next.name, 100, 'Student'),
              level: next.level,
              institution: clampStr(next.institution, 150, 'University'),
              majorOrGrade: clampStr(next.majorOrGrade, 150, 'Undeclared'),
              term: clampStr(next.term, 80, 'Fall 2026'),
              targetGpa: Number(next.targetGpa) || 3.8,
              currentGpa: Number(next.currentGpa) || 3.7,
              streakDays: Number(next.streakDays) || 1,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
        }
      }
    },
    [profile]
  );

  const updateAssignments = useCallback(
    async (updater: React.SetStateAction<Assignment[]>) => {
      const next = typeof updater === 'function' ? updater(assignments) : updater;
      setAssignments(next);
      await syncCollectionDiff('assignments', assignments, next, (a, uid, isNew) => ({
        id: a.id,
        ownerId: uid,
        title: clampStr(a.title, 200, 'Assignment'),
        course: clampStr(a.course, 120),
        courseCode: clampStr(a.courseCode, 40),
        color: clampStr(a.color, 30, 'indigo'),
        dueDate: clampStr(a.dueDate, 30),
        priority: a.priority,
        status: a.status,
        weightPercentage: Number(a.weightPercentage) || 10,
        estimatedHours: Number(a.estimatedHours) || 2,
        ...(a.description ? { description: clampStr(a.description, 2000) } : {}),
        ...(a.rubricNotes ? { rubricNotes: clampStr(a.rubricNotes, 2000) } : {}),
        ...(a.gradeReceived ? { gradeReceived: clampStr(a.gradeReceived, 40) } : {}),
        ...(isNew ? { createdAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp(),
      }));
    },
    [assignments, syncCollectionDiff]
  );

  const updateExams = useCallback(
    async (updater: React.SetStateAction<Exam[]>) => {
      const next = typeof updater === 'function' ? updater(exams) : updater;
      setExams(next);
      await syncCollectionDiff('exams', exams, next, (ex, uid, isNew) => ({
        id: ex.id,
        ownerId: uid,
        course: clampStr(ex.course, 120),
        courseCode: clampStr(ex.courseCode, 40),
        title: clampStr(ex.title, 200, 'Exam'),
        date: clampStr(ex.date, 30),
        time: clampStr(ex.time, 60),
        location: clampStr(ex.location, 150),
        format: ex.format,
        weightPercentage: Number(ex.weightPercentage) || 25,
        confidenceLevel: Math.min(5, Math.max(1, Number(ex.confidenceLevel) || 3)),
        color: clampStr(ex.color, 30, 'blue'),
        checklist: (ex.checklist || []).slice(0, 30),
        ...(ex.studyNotesSummary
          ? { studyNotesSummary: clampStr(ex.studyNotesSummary, 2000) }
          : {}),
        ...(isNew ? { createdAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp(),
      }));
    },
    [exams, syncCollectionDiff]
  );

  const updateSavedNotes = useCallback(
    async (updater: React.SetStateAction<SavedNote[]>) => {
      const next = typeof updater === 'function' ? updater(savedNotes) : updater;
      setSavedNotes(next);
      await syncCollectionDiff('notes', savedNotes, next, (n, uid, isNew) => ({
        id: n.id,
        ownerId: uid,
        title: clampStr(n.title, 200, 'Study Note'),
        course: clampStr(n.course, 120),
        topic: clampStr(n.topic, 200),
        mode: n.mode,
        explanation: clampStr(n.explanation, 20000),
        tags: (n.tags || []).slice(0, 10).map((t) => clampStr(t, 40)),
        ...(isNew ? { createdAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp(),
      }));
    },
    [savedNotes, syncCollectionDiff]
  );

  const updateScholarships = useCallback(
    async (updater: React.SetStateAction<Scholarship[]>) => {
      const next = typeof updater === 'function' ? updater(scholarships) : updater;
      setScholarships(next);
      await syncCollectionDiff('scholarships', scholarships, next, (s, uid, isNew) => ({
        id: s.id,
        ownerId: uid,
        title: clampStr(s.title, 200, 'Scholarship'),
        provider: clampStr(s.provider, 150),
        amount: Number(s.amount) || 0,
        deadline: clampStr(s.deadline, 30),
        eligibilityLevel: s.eligibilityLevel,
        ...(s.minGpa !== undefined ? { minGpa: Number(s.minGpa) } : {}),
        status: s.status,
        category: s.category,
        requirements: (s.requirements || []).slice(0, 20).map((r) => clampStr(r, 200)),
        ...(s.essayPrompt ? { essayPrompt: clampStr(s.essayPrompt, 2000) } : {}),
        ...(s.applicationUrl ? { applicationUrl: clampStr(s.applicationUrl, 500) } : {}),
        ...(s.notes ? { notes: clampStr(s.notes, 2000) } : {}),
        ...(isNew ? { createdAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp(),
      }));
    },
    [scholarships, syncCollectionDiff]
  );

  const updateSchedule = useCallback(
    async (updater: React.SetStateAction<ScheduleEvent[]>) => {
      const next = typeof updater === 'function' ? updater(schedule) : updater;
      setSchedule(next);
      await syncCollectionDiff('schedule', schedule, next, (ev, uid, isNew) => ({
        id: ev.id,
        ownerId: uid,
        day: ev.day,
        startTime: clampStr(ev.startTime, 10),
        endTime: clampStr(ev.endTime, 10),
        title: clampStr(ev.title, 200, 'Study Session'),
        ...(ev.course ? { course: clampStr(ev.course, 60) } : {}),
        type: ev.type,
        color: clampStr(ev.color, 30, 'indigo'),
        ...(ev.location ? { location: clampStr(ev.location, 150) } : {}),
        ...(isNew ? { createdAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp(),
      }));
    },
    [schedule, syncCollectionDiff]
  );

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const resetDemoData = useCallback(async () => {
    localStorage.removeItem('ssa_profile');
    localStorage.removeItem('ssa_assignments');
    localStorage.removeItem('ssa_exams');
    localStorage.removeItem('ssa_notes');
    localStorage.removeItem('ssa_scholarships');
    localStorage.removeItem('ssa_schedule');

    await updateAssignments(INITIAL_ASSIGNMENTS);
    await updateExams(INITIAL_EXAMS);
    await updateSavedNotes(INITIAL_SAVED_NOTES);
    await updateScholarships(INITIAL_SCHOLARSHIPS);
    await updateSchedule(INITIAL_SCHEDULE);
    await updateProfile((prev) => ({
      ...INITIAL_UNIVERSITY_PROFILE,
      isPro: prev.isPro,
      proSource: prev.proSource,
    }));
  }, [
    updateAssignments,
    updateExams,
    updateSavedNotes,
    updateScholarships,
    updateSchedule,
    updateProfile,
  ]);

  const isAdmin = Boolean(
    firebaseUser &&
      firebaseUser.emailVerified &&
      firebaseUser.email?.toLowerCase() === ADMIN_EMAIL
  );

  return (
    <AuthAndSyncContext.Provider
      value={{
        firebaseUser,
        authReady,
        isAdmin,
        signInWithGoogle,
        logout,
        profile,
        updateProfile,
        assignments,
        updateAssignments,
        exams,
        updateExams,
        savedNotes,
        updateSavedNotes,
        scholarships,
        updateScholarships,
        schedule,
        updateSchedule,
        entitlementToken,
        applyEntitlement,
        aiUsage,
        setAiUsage,
        refreshUsage,
        authorizedFetch,
        resetDemoData,
        checkoutNotice,
        clearCheckoutNotice: () => setCheckoutNotice(null),
      }}
    >
      {children}
    </AuthAndSyncContext.Provider>
  );
};

export function useAppSync() {
  const ctx = useContext(AuthAndSyncContext);
  if (!ctx) throw new Error('useAppSync must be used inside AuthAndSyncProvider');
  return ctx;
}
