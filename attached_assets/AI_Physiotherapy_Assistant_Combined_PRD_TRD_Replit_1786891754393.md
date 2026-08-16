# AI Physiotherapy Home Exercise Assistant — Combined PRD + TRD + Replit Build Spec

## 0. Build decision
**MVP target:** responsive web/PWA built in Replit. Use camera in browser. Add native mobile packaging later only if needed.

**Core stack:** Next.js + TypeScript + Tailwind + MediaPipe Pose Landmarker Web + Firebase Auth/Firestore + SpeechSynthesis. No custom ML training. No LLM in the real-time loop.

## 1. Product goal
A physiotherapist defines a patient-specific exercise prescription (exercise, sets, reps, joint-angle target/tolerance, ROM, posture/alignment, tempo, precautions). The patient uses a camera. MediaPipe estimates pose. Deterministic biomechanics + prescription rules measure movement and give short visual/audio corrections. Session metrics go back to the physiotherapist.

**Core innovation:** prescription -> measurable movement constraints -> real-time correction -> quantified therapist report.

## 2. Scope
### Must have
- Role login: physiotherapist/patient
- Physio: create patient, create/edit/assign prescription
- Patient: view/start assigned exercise
- Live MediaPipe pose
- Squat: knee angle, ROM, phase, reps
- Prescription comparison
- Visual + voice feedback
- Confidence gate
- Session summary + Firestore persistence
- Therapist review

### Should have
- Shoulder flexion + sit-to-stand
- Tempo
- Per-rep quality
- History
- Optional LLM: therapist text -> draft JSON; therapist confirms

### Out of scope
- Custom model training
- Diagnosis
- Autonomous prescription
- Medical-risk prediction
- Full clinical 3D accuracy
- Dozens of exercises

## 3. Architecture
```
Camera
 -> MediaPipe Pose Landmarker
 -> Landmark filter/confidence gate
 -> Biomechanics engine
 -> Exercise state machine
 -> Prescription rule engine
 -> Feedback manager
 -> Session metrics
 -> Firestore
```

## 4. Tech decisions
| Layer | Choice |
|---|---|
| Frontend | Next.js + TypeScript + Tailwind |
| Pose AI | MediaPipe Pose Landmarker Web |
| Backend | Firebase Auth + Firestore |
| Voice | Browser SpeechSynthesis |
| Hosting/dev | Replit |
| Optional LLM | Only for therapist text -> draft structured prescription |

## 5. Data model
```json
{{
  "prescription": {{
    "patientId": "...",
    "exerciseId": "squat",
    "sets": 3,
    "repetitions": 10,
    "angleRules": [{{"joint":"leftKnee","target":90,"min":85,"max":95}}],
    "romRules": [{{"joint":"leftKnee","minROM":80,"maxROM":100}}],
    "alignmentRules": [],
    "tempo": {{"downSec":2,"holdSec":1,"upSec":2}},
    "instructions": [],
    "precautions": []
  }}
}}
```

Firestore: `users/{uid}`, `patients/{id}`, `prescriptions/{id}`, `sessions/{id}`, `repResults/{id}`.

## 6. Squat engine
Knee angle = angle(hip, knee, ankle).

State machine:
`STANDING -> DESCENDING -> BOTTOM -> ASCENDING -> STANDING = 1 REP`

Per rep store: min angle, duration, errors, correctness. Use smoothing/debounce.

## 7. Feedback
Priority: safety > major correction > minor correction > good.

Use voice cooldown (1.5–3s). Never speak every frame.

Examples:
- “Increase your range of motion.”
- “Reduce your movement depth.”
- “Keep your knees aligned.”
- “Good. Continue.”
- “Please reposition so your full body is visible.”

## 8. Safety
- Assistive/research prototype only.
- No diagnosis or autonomous prescribing.
- Never encourage movement beyond therapist-defined limits.
- Low-confidence pose => no movement-quality advice.
- Store only needed data; enforce Firebase rules.

## 9. UI
- Login
- Physio dashboard
- Patient list
- Prescription editor
- Patient home
- Exercise instructions
- Live camera session
- Session summary
- Therapist review

## 10. MVP build order
1. Replit app + camera
2. MediaPipe skeleton
3. Knee angle
4. Squat state machine/reps
5. Prescription constraints
6. Feedback + TTS
7. Firebase persistence
8. Physio dashboard
9. Shoulder flexion
10. Sit-to-stand

**Deadline rule:** stop at step 7 with a polished squat MVP if time is tight.

## 11. Replit Agent master prompt
```text
BUILD: AI Physiotherapy Home Exercise Assistant — MVP
Goal: responsive web/PWA. Physio defines prescription; patient uses camera; MediaPipe pose detects landmarks; deterministic biomechanics checks movement against prescription; visual/audio feedback; session summary to Firestore.

STACK: Next.js + TypeScript + Tailwind, MediaPipe Tasks Vision Pose Landmarker Web, Firebase Auth + Firestore, SpeechSynthesis. No custom ML. No LLM per camera frame.

ROLES: physiotherapist (patients/prescriptions/sessions), patient (assigned exercises/session/self-results).

MVP: auth; patient CRUD; prescription editor; assigned exercise; live pose; squat knee angle/ROM/phase/reps; target/min/max prescription rules; feedback priority + cooldown; confidence gate; Firestore session summary; therapist review; mobile-first UI.

RULES: no diagnosis; no autonomous prescription; no unsafe advice; prescription values are therapist-defined; use state machine for reps; low confidence => reposition message; build squat end-to-end before more exercises; working functionality before visual polish.

FIRST TASK: scaffold project, install dependencies, configure camera, implement minimal MediaPipe live pose skeleton page. Test it before adding other features.
```

## 12. Low-token follow-ups
**Angle:** Add knee angle from hip/knee/ankle; smooth values; handle missing landmarks.

**Reps:** Add squat state machine; one full cycle = one rep; store min angle/duration.

**Prescription:** Load target/min/max; add error codes `INSUFFICIENT_DEPTH`, `EXCESS_DEPTH`, `LANDMARK_UNCERTAIN`.

**Feedback:** Add priority + 1.5–3s cooldown + SpeechSynthesis.

**Firebase:** Add Auth + Firestore + rules for roles.

**Therapist UI:** Patients + active prescriptions + recent sessions.

**Exercise 2:** Add shoulder flexion through shared exercise configuration.

**Tests:** Angle, ROM, state machine, prescription checks, feedback priority.

## 13. Evaluation
Measure rep detection accuracy, angle error (MAE/median absolute error), ROM error, feedback agreement with therapist labels, feedback latency, and robustness across lighting/distance/orientation. Report failures honestly.

## 14. Novelty positioning
Do **not** claim novelty for pose estimation or generic AI coaching. Claim the integrated prescription-driven workflow: therapist-defined measurable constraints -> real-time checking -> correction -> therapist report.

## 15. References
- https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
- https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js
- https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/android
- https://firebase.google.com/docs/web/setup
- https://firebase.google.com/docs/reference/js/firestore
- https://docs.replit.com/features/agent/overview
- https://docs.replit.com/learn/effective-prompting
- https://github.com/google-ai-edge/mediapipe-samples
