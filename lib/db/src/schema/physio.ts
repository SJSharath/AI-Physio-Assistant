import {
  jsonb,
  pgTable,
  text,
  timestamp,
  real,
  integer,
} from "drizzle-orm/pg-core";

export const patientsTable = pgTable("physio_patients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const prescriptionsTable = pgTable("physio_prescriptions", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => patientsTable.id),
  exerciseId: text("exercise_id").notNull(),
  status: text("status").notNull().default("active"),
  sets: integer("sets").notNull(),
  repetitions: integer("repetitions").notNull(),
  angleRules: jsonb("angle_rules").notNull().$type<
    Array<{ joint: string; target: number; min: number; max: number }>
  >(),
  minRom: real("min_rom").notNull(),
  maxRom: real("max_rom").notNull(),
  instructions: jsonb("instructions").notNull().$type<string[]>(),
  precautions: jsonb("precautions").notNull().$type<string[]>(),
  holdTimeSeconds: real("hold_time_seconds"),
  frequency: text("frequency"),
  voiceCue: text("voice_cue"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessionsTable = pgTable("physio_sessions", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => patientsTable.id),
  prescriptionId: text("prescription_id")
    .notNull()
    .references(() => prescriptionsTable.id),
  exerciseId: text("exercise_id").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }).notNull(),
  reps: integer("reps").notNull(),
  correctReps: integer("correct_reps").notNull(),
  romAchieved: real("rom_achieved").notNull(),
  durationSeconds: real("duration_seconds").notNull(),
  errors: jsonb("errors").notNull().$type<string[]>(),
  status: text("status").notNull().default("completed"),
});