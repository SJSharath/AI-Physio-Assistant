import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, patientsTable, prescriptionsTable, sessionsTable } from "../../../../lib/db/src";
import {
  CreatePatientBody,
  CreatePatientResponse,
  CreatePrescriptionBody,
  CreatePrescriptionResponse,
  CreateSessionBody,
  CreateSessionResponse,
  GetDashboardSummaryResponse,
  GetPatientParams,
  GetPatientResponse,
  GetSessionParams,
  GetSessionResponse,
  ListPatientsResponse,
  ListPrescriptionsQueryParams,
  ListPrescriptionsResponse,
  ListSessionsQueryParams,
  ListSessionsResponse,
  UpdatePrescriptionBody,
  UpdatePrescriptionParams,
  UpdatePrescriptionResponse,
} from "../../../../lib/api-zod/src";

const router: IRouter = Router();

const demoPatient = {
  id: "demo-patient-1",
  name: "Maya Patel",
  email: "maya.patel@example.com",
  status: "active",
};

const demoPrescription = {
  id: "demo-prescription-1",
  patientId: demoPatient.id,
  exerciseId: "squat",
  status: "active",
  sets: 3,
  repetitions: 10,
  angleRules: [{ joint: "leftKnee", target: 90, min: 85, max: 95 }],
  minRom: 80,
  maxRom: 100,
  instructions: [
    "Stand with feet about shoulder-width apart.",
    "Keep your chest lifted and move at a steady pace.",
    "Lower until your knee angle reaches the prescribed range.",
  ],
  precautions: [
    "Stop if you feel sharp pain, dizziness, or instability.",
    "Do not move beyond the prescribed depth.",
  ],
};

async function ensureSeeded(): Promise<void> {
  const existing = await db
    .select({ id: patientsTable.id })
    .from(patientsTable)
    .limit(1);
  if (existing.length > 0) {
    return;
  }

  await db.insert(patientsTable).values(demoPatient);
  await db.insert(prescriptionsTable).values(demoPrescription);
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

async function patientResponse(patient: typeof patientsTable.$inferSelect) {
  const [prescriptionCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(prescriptionsTable)
    .where(
      and(
        eq(prescriptionsTable.patientId, patient.id),
        eq(prescriptionsTable.status, "active"),
      ),
    );
  const [latestSession] = await db
    .select({ endedAt: sessionsTable.endedAt })
    .from(sessionsTable)
    .where(eq(sessionsTable.patientId, patient.id))
    .orderBy(desc(sessionsTable.endedAt))
    .limit(1);

  return {
    id: patient.id,
    name: patient.name,
    email: patient.email,
    initials: initials(patient.name),
    status: patient.status,
    lastSessionAt: latestSession?.endedAt ?? null,
    activePrescriptionCount: Number(prescriptionCount?.count ?? 0),
  };
}

async function prescriptionResponse(
  prescription: typeof prescriptionsTable.$inferSelect,
) {
  const [patient] = await db
    .select({ name: patientsTable.name })
    .from(patientsTable)
    .where(eq(patientsTable.id, prescription.patientId))
    .limit(1);
  return {
    ...prescription,
    patientName: patient?.name ?? "Unknown patient",
  };
}

async function sessionResponse(session: typeof sessionsTable.$inferSelect) {
  const [patient] = await db
    .select({ name: patientsTable.name })
    .from(patientsTable)
    .where(eq(patientsTable.id, session.patientId))
    .limit(1);
  return {
    ...session,
    patientName: patient?.name ?? "Unknown patient",
  };
}

router.get("/patients", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const patients = await db.select().from(patientsTable).orderBy(patientsTable.name);
  const response = await Promise.all(patients.map(patientResponse));
  res.json(ListPatientsResponse.parse(response));
});

router.post("/patients", async (req, res): Promise<void> => {
  const parsed = CreatePatientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const patient = {
    id: `patient-${crypto.randomUUID()}`,
    name: parsed.data.name,
    email: parsed.data.email,
    status: "active",
  };
  const [created] = await db.insert(patientsTable).values(patient).returning();
  res.status(201).json(CreatePatientResponse.parse(await patientResponse(created)));
});

router.get("/patients/:patientId", async (req, res): Promise<void> => {
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [patient] = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.id, params.data.patientId))
    .limit(1);
  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }
  res.json(GetPatientResponse.parse(await patientResponse(patient)));
});

router.get("/prescriptions", async (req, res): Promise<void> => {
  await ensureSeeded();
  const params = ListPrescriptionsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const query = db
    .select()
    .from(prescriptionsTable)
    .orderBy(desc(prescriptionsTable.updatedAt));
  const rows = params.data.patientId
    ? await query.where(eq(prescriptionsTable.patientId, params.data.patientId))
    : await query;
  res.json(ListPrescriptionsResponse.parse(await Promise.all(rows.map(prescriptionResponse))));
});

router.post("/prescriptions", async (req, res): Promise<void> => {
  const parsed = CreatePrescriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [patient] = await db
    .select({ id: patientsTable.id })
    .from(patientsTable)
    .where(eq(patientsTable.id, parsed.data.patientId))
    .limit(1);
  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }
  const [created] = await db
    .insert(prescriptionsTable)
    .values({ id: `prescription-${crypto.randomUUID()}`, ...parsed.data })
    .returning();
  res.status(201).json(CreatePrescriptionResponse.parse(await prescriptionResponse(created)));
});

router.patch("/prescriptions/:prescriptionId", async (req, res): Promise<void> => {
  const params = UpdatePrescriptionParams.safeParse(req.params);
  const body = UpdatePrescriptionBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [updated] = await db
    .update(prescriptionsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(prescriptionsTable.id, params.data.prescriptionId))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Prescription not found" });
    return;
  }
  res.json(UpdatePrescriptionResponse.parse(await prescriptionResponse(updated)));
});

router.get("/sessions", async (req, res): Promise<void> => {
  await ensureSeeded();
  const params = ListSessionsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const query = db.select().from(sessionsTable).orderBy(desc(sessionsTable.endedAt));
  const rows = params.data.patientId
    ? await query.where(eq(sessionsTable.patientId, params.data.patientId))
    : await query;
  res.json(ListSessionsResponse.parse(await Promise.all(rows.map(sessionResponse))));
});

router.post("/sessions", async (req, res): Promise<void> => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [patient] = await db
    .select({ id: patientsTable.id })
    .from(patientsTable)
    .where(eq(patientsTable.id, parsed.data.patientId))
    .limit(1);
  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }
  const [created] = await db
    .insert(sessionsTable)
    .values({ id: `session-${crypto.randomUUID()}`, ...parsed.data })
    .returning();
  res.status(201).json(CreateSessionResponse.parse(await sessionResponse(created)));
});

router.get("/sessions/:sessionId", async (req, res): Promise<void> => {
  const params = GetSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, params.data.sessionId))
    .limit(1);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(GetSessionResponse.parse(await sessionResponse(session)));
});

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const patients = await db.select().from(patientsTable);
  const prescriptions = await db
    .select()
    .from(prescriptionsTable)
    .where(eq(prescriptionsTable.status, "active"));
  const sessions = await db
    .select()
    .from(sessionsTable)
    .orderBy(desc(sessionsTable.endedAt));
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const recent = await Promise.all(sessions.slice(0, 5).map(sessionResponse));
  const weekly = sessions.filter((session) => session.endedAt >= weekStart);
  const averageCompletion =
    sessions.length === 0
      ? 0
      : (sessions.reduce((sum, session) => sum + (session.reps ? session.correctReps / session.reps : 0), 0) /
          sessions.length) *
        100;
  res.json(
    GetDashboardSummaryResponse.parse({
      patientCount: patients.length,
      activePrescriptionCount: prescriptions.length,
      sessionsThisWeek: weekly.length,
      averageCompletion,
      recentSessions: recent,
    }),
  );
});

export default router;
