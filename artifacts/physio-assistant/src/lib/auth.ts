// ---------------------------------------------------------------------------
// Mock auth store — persisted to localStorage, no backend required.
// ---------------------------------------------------------------------------

export type Role = 'physio' | 'patient';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Physio only */
  clinicName?: string;
  /** Physio only — the code patients enter to join this doctor */
  accessCode?: string;
  /** Patient only — the doctor's access code used at signup */
  doctorAccessCode?: string;
  doctorId?: string;
  doctorName?: string;
  doctorClinicName?: string;
  status?: 'active' | 'paused' | 'retired';
}

type StoredUser = AuthUser & { password: string };

const STORAGE_KEY = 'kc_auth_user';
const USERS_KEY = 'kc_users';
const RETIRED_PATIENTS_KEY = 'kc_retired_patients';

// ── seed data ───────────────────────────────────────────────────────────────

const SEED_USERS: StoredUser[] = [
  {
    id: 'physio-001',
    name: 'Jordan Miller',
    email: 'jordan@kineticcare.io',
    role: 'physio',
    clinicName: 'Kinetic Care Clinic',
    accessCode: 'KC-2025',
    password: 'demo',
  },
  {
    id: 'patient-001',
    name: 'Maya Chen',
    email: 'maya.chen@example.com',
    role: 'patient',
    doctorAccessCode: 'KC-2025',
    doctorId: 'physio-001',
    doctorName: 'Jordan Miller',
    doctorClinicName: 'Kinetic Care Clinic',
    password: 'demo',
  },
  {
    id: 'patient-002',
    name: 'Oliver Grant',
    email: 'oliver.grant@example.com',
    role: 'patient',
    doctorAccessCode: 'KC-2025',
    doctorId: 'physio-001',
    doctorName: 'Jordan Miller',
    doctorClinicName: 'Kinetic Care Clinic',
    password: 'demo',
  },
];

function getUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      const users = JSON.parse(raw) as StoredUser[];
      return users.map((user) => ({ ...user, password: user.password || 'demo' }));
    }
  } catch { /* empty */ }
  localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
  return SEED_USERS;
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// ── helpers ──────────────────────────────────────────────────────────────────

function generateId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateAccessCode(existingCodes: string[]) {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '23456789';
  const rand = (s: string) => s[Math.floor(Math.random() * s.length)];
  let code = '';
  do {
    code = `KC-${rand(letters)}${rand(letters)}${rand(nums)}${rand(nums)}`;
  } while (existingCodes.includes(code));
  return code;
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, 35);
}

function publicUser(user: StoredUser): AuthUser {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

// ── public API ───────────────────────────────────────────────────────────────

export function getSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function setSession(user: AuthUser | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export interface SignInResult {
  ok: boolean;
  user?: AuthUser;
  error?: string;
}

export function signIn(email: string, _password: string): SignInResult {
  const users = getUsers();
  const user = users.find((candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) return { ok: false, error: 'No account found with that email.' };
  if (!_password || user.password !== _password) return { ok: false, error: 'Incorrect password.' };
  const safeUser = publicUser(user);
  setSession(safeUser);
  return { ok: true, user: safeUser };
}

export interface SignUpPhysioInput {
  name: string;
  clinicName: string;
  email: string;
  password: string;
}

export interface SignUpPatientInput {
  name: string;
  email: string;
  password: string;
  doctorAccessCode: string;
}

export function signUpPhysio(input: SignUpPhysioInput): SignInResult {
  const users = getUsers();
  const name = normalizeName(input.name);
  if (!name) return { ok: false, error: 'Enter your name.' };
  if (input.name.trim().length > 35) return { ok: false, error: 'Name must be 35 characters or fewer.' };
  if (!input.password) return { ok: false, error: 'Choose a password.' };
  if (users.find((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    return { ok: false, error: 'An account with this email already exists.' };
  }
  const user: StoredUser = {
    id: generateId('physio'),
    name,
    email: input.email,
    role: 'physio',
    clinicName: input.clinicName,
    accessCode: generateAccessCode(users.filter((candidate) => candidate.role === 'physio').map((candidate) => candidate.accessCode ?? '')),
    password: input.password,
  };
  saveUsers([...users, user]);
  const safeUser = publicUser(user);
  setSession(safeUser);
  return { ok: true, user: safeUser };
}

export function signUpPatient(input: SignUpPatientInput): SignInResult {
  const users = getUsers();
  const name = normalizeName(input.name);
  if (!name) return { ok: false, error: 'Enter your name.' };
  if (input.name.trim().length > 35) return { ok: false, error: 'Name must be 35 characters or fewer.' };
  if (!input.password) return { ok: false, error: 'Choose a password.' };
  if (users.find((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    return { ok: false, error: 'An account with this email already exists.' };
  }
  // Validate that the access code belongs to a physio
  const physio = users.find(
    (u) =>
      u.role === 'physio' &&
      u.accessCode?.toUpperCase() === input.doctorAccessCode.trim().toUpperCase(),
  );
  if (!physio) {
    return {
      ok: false,
      error: 'Doctor Access Code not recognised. Ask your physiotherapist for their code.',
    };
  }
  const user: StoredUser = {
    id: generateId('patient'),
    name,
    email: input.email,
    role: 'patient',
    doctorAccessCode: physio.accessCode,
    doctorId: physio.id,
    doctorName: physio.name,
    doctorClinicName: physio.clinicName,
    password: input.password,
  };
  saveUsers([...users, user]);
  const safeUser = publicUser(user);
  setSession(safeUser);
  return { ok: true, user: safeUser };
}

export function signOut() {
  setSession(null);
}

export function getAllUsers(): AuthUser[] {
  return getUsers().map(publicUser);
}

function getRetiredPatientIds(): string[] {
  try {
    const raw = localStorage.getItem(RETIRED_PATIENTS_KEY);
    return raw ? JSON.parse(raw) as string[] : [];
  } catch {
    return [];
  }
}

export function isPatientRetired(patientId: string): boolean {
  return getRetiredPatientIds().includes(patientId);
}

export function retirePatient(patientId: string): boolean {
  const user = getUsers().find((candidate) => candidate.id === patientId && candidate.role === 'patient');
  const retiredIds = getRetiredPatientIds();
  if (user && !retiredIds.includes(patientId)) {
    user.status = 'retired';
    saveUsers(getUsers().map((candidate) => candidate.id === patientId ? user : candidate));
  }
  if (!retiredIds.includes(patientId)) {
    localStorage.setItem(RETIRED_PATIENTS_KEY, JSON.stringify([...retiredIds, patientId]));
  }
  const session = getSession();
  if (session?.id === patientId) setSession({ ...session, status: 'retired' });
  return true;
}

export function getLinkedPatients(doctorId: string): AuthUser[] {
  return getUsers().filter((user) => user.role === 'patient' && user.doctorId === doctorId).map((user) => ({ ...publicUser(user), status: isPatientRetired(user.id) ? 'retired' : user.status ?? 'active' }));
}

export function getLinkedDoctor(patient: AuthUser | null): AuthUser | null {
  if (!patient?.doctorId) return null;
  return getUsers().map(publicUser).find((user) => user.id === patient.doctorId) ?? null;
}
