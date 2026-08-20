import type { DashboardSummary, Patient, Prescription, PrescriptionInput, Session, SessionInput } from '@/lib/api-client-react';
import { getLinkedPatients } from '@/lib/auth';

export const demoPatients: Patient[] = [
  { id: 'p-001', name: 'Maya Chen', email: 'maya.chen@example.com', initials: 'MC', status: 'active', lastSessionAt: '2025-02-12T09:30:00.000Z', activePrescriptionCount: 2 },
  { id: 'p-002', name: 'Oliver Grant', email: 'oliver.grant@example.com', initials: 'OG', status: 'active', lastSessionAt: '2025-02-11T16:15:00.000Z', activePrescriptionCount: 1 },
  { id: 'p-003', name: 'Priya Nair', email: 'priya.nair@example.com', initials: 'PN', status: 'paused', lastSessionAt: '2025-02-08T11:00:00.000Z', activePrescriptionCount: 1 },
  { id: 'p-004', name: 'Theo Martin', email: 'theo.martin@example.com', initials: 'TM', status: 'active', lastSessionAt: '2025-02-07T13:20:00.000Z', activePrescriptionCount: 3 },
  { id: 'p-005', name: 'Lucia Alvarez', email: 'lucia.alvarez@example.com', initials: 'LA', status: 'active', lastSessionAt: null, activePrescriptionCount: 1 },
];

export const demoPrescriptions: Prescription[] = [
  { id: 'rx-001', patientId: 'p-001', patientName: 'Maya Chen', exerciseId: 'squat', status: 'active', sets: 3, repetitions: 8, angleRules: [{ joint: 'Knee', target: 72, min: 66, max: 80 }], minRom: 58, maxRom: 78, instructions: ['Stand with feet just wider than hips.', 'Send your hips back slowly.', 'Press through the whole foot to stand tall.'], precautions: ['Stop if you feel sharp pain.', 'Keep your knees tracking over your toes.'], updatedAt: '2025-02-10T10:00:00.000Z' },
  { id: 'rx-002', patientId: 'p-002', patientName: 'Oliver Grant', exerciseId: 'squat', status: 'active', sets: 2, repetitions: 10, angleRules: [{ joint: 'Knee', target: 68, min: 62, max: 76 }], minRom: 55, maxRom: 72, instructions: ['Use a chair behind you as a guide.', 'Move at an even pace.'], precautions: ['Keep the chair close for support.'], updatedAt: '2025-02-09T10:00:00.000Z' },
  { id: 'rx-003', patientId: 'p-004', patientName: 'Theo Martin', exerciseId: 'sit-to-stand', status: 'active', sets: 3, repetitions: 6, angleRules: [{ joint: 'Knee', target: 80, min: 72, max: 88 }], minRom: 50, maxRom: 82, instructions: ['Sit near the front edge of the chair.', 'Lean forward, then drive through your feet.'], precautions: ['Use armrests if needed.'], updatedAt: '2025-02-08T09:00:00.000Z' },
];

export const demoSessions: Session[] = [
  { id: 's-101', patientId: 'p-001', prescriptionId: 'rx-001', patientName: 'Maya Chen', exerciseId: 'squat', startedAt: '2025-02-12T09:30:00.000Z', endedAt: '2025-02-12T09:36:12.000Z', reps: 8, correctReps: 7, romAchieved: 71, durationSeconds: 372, errors: ['Two repetitions were slightly shallow.'], status: 'completed' },
  { id: 's-102', patientId: 'p-002', prescriptionId: 'rx-002', patientName: 'Oliver Grant', exerciseId: 'squat', startedAt: '2025-02-11T16:15:00.000Z', endedAt: '2025-02-11T16:20:24.000Z', reps: 10, correctReps: 9, romAchieved: 66, durationSeconds: 324, errors: ['Good pace. One repetition drifted forward.'], status: 'completed' },
  { id: 's-103', patientId: 'p-004', prescriptionId: 'rx-003', patientName: 'Theo Martin', exerciseId: 'sit-to-stand', startedAt: '2025-02-10T13:20:00.000Z', endedAt: '2025-02-10T13:26:00.000Z', reps: 6, correctReps: 6, romAchieved: 78, durationSeconds: 360, errors: [], status: 'completed' },
];

export const demoSummary: DashboardSummary = { patientCount: 12, activePrescriptionCount: 18, sessionsThisWeek: 27, averageCompletion: 84, recentSessions: demoSessions };

export const formatDate = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value)) : 'Not yet';
export const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
export const findPatient = (id?: string | null) => demoPatients.find((patient) => patient.id === id) ?? demoPatients[0];
export const findPrescription = (id?: string | null) => getStoredPrescriptions().find((prescription) => prescription.id === id) ?? demoPrescriptions[0];
export const findSession = (id?: string | null) => getStoredSessions().find((session) => session.id === id) ?? demoSessions[0];

const LOCAL_PRESCRIPTIONS_KEY = 'kc_local_prescriptions';
const LOCAL_SESSIONS_KEY = 'kc_local_sessions';

function readLocal<T>(key: string): T[] {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T[] : [];
  } catch {
    return [];
  }
}

function writeLocal<T>(key: string, values: T[]) {
  localStorage.setItem(key, JSON.stringify(values));
}

export function getStoredPrescriptions(): Prescription[] {
  return [...readLocal<Prescription>(LOCAL_PRESCRIPTIONS_KEY), ...demoPrescriptions];
}

export function mergePrescriptions(remote: Prescription[] | undefined): Prescription[] {
  return [...(remote ?? []), ...getStoredPrescriptions()].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);
}

export function saveStoredPrescription(input: PrescriptionInput, patientName: string): Prescription {
  const prescription: Prescription = {
    id: `rx-local-${crypto.randomUUID()}`,
    patientId: input.patientId,
    patientName,
    exerciseId: input.exerciseId,
    status: 'active',
    sets: input.sets,
    repetitions: input.repetitions,
    angleRules: input.angleRules,
    minRom: input.minRom,
    maxRom: input.maxRom,
    instructions: input.instructions,
    precautions: input.precautions,
    holdTimeSeconds: input.holdTimeSeconds,
    frequency: input.frequency,
    voiceCue: input.voiceCue,
    updatedAt: new Date().toISOString(),
  };
  writeLocal(LOCAL_PRESCRIPTIONS_KEY, [prescription, ...readLocal<Prescription>(LOCAL_PRESCRIPTIONS_KEY)]);
  return prescription;
}

export function getStoredSessions(): Session[] {
  return [...readLocal<Session>(LOCAL_SESSIONS_KEY), ...demoSessions];
}

export function mergeSessions(remote: Session[] | undefined): Session[] {
  return [...(remote ?? []), ...getStoredSessions()].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);
}

export function saveStoredSession(input: SessionInput, patientName: string): Session {
  const session: Session = { id: `s-local-${crypto.randomUUID()}`, ...input, patientName };
  writeLocal(LOCAL_SESSIONS_KEY, [session, ...readLocal<Session>(LOCAL_SESSIONS_KEY)]);
  return session;
}

export function getLocalPatientsForDoctor(doctorId: string): Patient[] {
  return getLinkedPatients(doctorId).map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    initials: user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
    status: user.status === 'retired' ? 'retired' : 'active',
    lastSessionAt: null,
    activePrescriptionCount: getStoredPrescriptions().filter((prescription) => prescription.patientId === user.id).length,
  }));
}
