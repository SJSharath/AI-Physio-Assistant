import { ArrowLeft, ArrowRight, Camera, Check, CircleAlert, Clock3, Info, MicOff, Pause, Play, RotateCcw, ShieldCheck, Sparkles, Target, Volume2, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCreateSession, useGetSession, useListPrescriptions, getListPrescriptionsQueryKey, getGetSessionQueryKey, getListSessionsQueryKey, getGetDashboardSummaryQueryKey } from '@/lib/api-client-react';
import type { Prescription, SessionInput } from '@/lib/api-client-react';
import { useLocation, useParams, Link } from 'wouter';
import { AppShell, PageHeader, PrototypeNotice } from '@/components/app-shell';
import { demoPrescriptions, findPrescription, findSession, formatDate, formatTime, getStoredPrescriptions, mergePrescriptions, saveStoredSession } from '@/lib/mock-data';
import { getLinkedDoctor, getSession } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';
import { createPoseAnalyzer, type PoseLandmark } from '@/lib/pose-analyzer';

const exerciseLabel = (id: string) => id === 'sit-to-stand' ? 'Sit to stand' : id === 'shoulder-flexion' ? 'Shoulder flexion' : 'Supported squat';

function ProgressDots({ current, total }: { current: number; total: number }) {
  return <div className="flex items-center gap-1.5">{Array.from({ length: total }, (_, index) => <span key={index} className={`h-1.5 rounded-full transition-all ${index <= current ? 'w-6 bg-[hsl(var(--accent))]' : 'w-2 bg-[hsl(var(--border))]'}`} />)}</div>;
}

const poseConnections: [number, number][] = [
  [11, 12], [11, 23], [12, 24], [23, 24], [11, 13], [13, 15], [12, 14], [14, 16],
  [23, 25], [25, 27], [24, 26], [26, 28], [27, 29], [27, 31], [28, 30], [28, 32],
];

function PoseOverlay({ video, landmarks, angle, target, minRom, maxRom }: { video: HTMLVideoElement | null; landmarks: PoseLandmark[] | null; angle: number | null; target: number; minRom: number; maxRom: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const draw = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      if (!landmarks?.length) return;

      const videoWidth = video?.videoWidth || width;
      const videoHeight = video?.videoHeight || height;
      const scale = Math.max(width / videoWidth, height / videoHeight);
      const renderedWidth = videoWidth * scale;
      const renderedHeight = videoHeight * scale;
      const offsetX = (width - renderedWidth) / 2;
      const offsetY = (height - renderedHeight) / 2;
      const point = (landmark: PoseLandmark) => ({ x: offsetX + (1 - landmark.x) * renderedWidth, y: offsetY + landmark.y * renderedHeight });
      const isVisible = (index: number) => (landmarks[index]?.visibility ?? 1) >= 0.35;
      const nearLimit = Math.max((maxRom - minRom) * 0.2, 1);
      const status = angle === null ? '#b9dfd6' : angle >= minRom && angle <= maxRom ? '#83d4ac' : angle >= minRom - nearLimit && angle <= maxRom + nearLimit ? '#f2c66d' : '#ef8b7b';

      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = 3;
      context.strokeStyle = 'rgba(185, 223, 214, .7)';
      poseConnections.forEach(([from, to]) => {
        if (!isVisible(from) || !isVisible(to)) return;
        const start = point(landmarks[from]);
        const end = point(landmarks[to]);
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
      });

      if ([23, 25, 27].every(isVisible)) {
        context.lineWidth = 6;
        context.strokeStyle = status;
        const hip = point(landmarks[23]);
        const knee = point(landmarks[25]);
        const ankle = point(landmarks[27]);
        context.beginPath();
        context.moveTo(hip.x, hip.y);
        context.lineTo(knee.x, knee.y);
        context.lineTo(ankle.x, ankle.y);
        context.stroke();
        [hip, knee, ankle].forEach(({ x, y }) => {
          context.beginPath();
          context.fillStyle = status;
          context.arc(x, y, 8, 0, Math.PI * 2);
          context.fill();
          context.beginPath();
          context.fillStyle = '#182f36';
          context.arc(x, y, 3, 0, Math.PI * 2);
          context.fill();
        });
        if (angle !== null) {
          context.font = '700 12px DM Sans, sans-serif';
          const label = `${angle}° · target ${target}°`;
          const labelWidth = Math.max(102, context.measureText(label).width + 14);
          const labelX = Math.min(width - labelWidth - 8, Math.max(8, knee.x + 14));
          const labelY = Math.max(24, knee.y - 14);
          context.fillStyle = 'rgba(24, 47, 54, .88)';
          context.beginPath();
          context.roundRect(labelX - 7, labelY - 15, labelWidth, 24, 7);
          context.fill();
          context.fillStyle = status;
          context.fillText(label, labelX, labelY + 1);
        }
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [video, landmarks, angle, target, minRom, maxRom]);

  return <div ref={containerRef} className="pointer-events-none absolute inset-0 z-[1]"><canvas ref={canvasRef} aria-label="Live pose skeleton overlay" /></div>;
}

export function PatientHome() {
  /*
  const prescriptionsQuery = useListPrescriptions();
  const prescriptions = mergePrescriptions(prescriptionsQuery.data);
  const patient = getSession();
  const doctor = getLinkedDoctor(patient);
  const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return <AppShell role="patient"><PageHeader eyebrow="Your movement plan" title="Your movement plan" description="A little focused time today can make tomorrow feel more capable." action={<div className="flex items-center gap-2 rounded-full bg-[#e0f1e9] px-3 py-2 text-xs font-bold text-[#236b57]"><span className="h-2 w-2 rounded-full bg-[#3e9278]" />Plan is on track</div>} /><div className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]"><section className="rounded-2xl bg-[hsl(var(--primary))] p-6 text-white md:p-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--accent))]">Today’s focus</p><h2 className="mt-3 max-w-lg font-display text-5xl leading-[.95]">Move with a little more room.</h2><p className="mt-5 max-w-md text-sm leading-6 text-white/70">You have {prescriptions.length} active {prescriptions.length === 1 ? 'exercise' : 'exercises'} in your plan. Take your time and stay within the range your therapist set.</p><div className="mt-8 flex items-center gap-4"><div className="flex -space-x-2"><span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[hsl(var(--primary))] bg-[hsl(var(--accent))] text-xs font-bold text-[hsl(var(--foreground))]">{initials(patient?.name ?? 'You')}</span><span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[hsl(var(--primary))] bg-[#b9dfd6] text-xs font-bold text-[#175b54]">{initials(doctor?.name ?? 'Care')}</span></div><p className="text-xs text-white/60">Your plan is guided by {doctor?.name ?? 'your physiotherapist'}{doctor?.clinicName ? ` · ${doctor.clinicName}` : ''}</p></div></section><section className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Your rhythm</p><h2 className="mt-1 text-xl font-semibold">This week</h2></div><Target className="h-5 w-5 text-[hsl(var(--primary))] /></div><div className="mt-7 flex items-end gap-3"><span className="font-display text-6xl">3</span><span className="mb-2 text-sm text-[hsl(var(--muted-foreground))]">sessions completed</span></div><p className="mt-6 border-t border-[hsl(var(--border))] pt-4 text-xs text-[hsl(var(--muted-foreground))]">One more session this week keeps your current rhythm.</p></section></div><section className="mt-6"><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Assigned exercises</p><h2 className="mt-1 text-xl font-semibold">Ready when you are</h2></div><span className="text-xs text-[hsl(var(--muted-foreground))]">{prescriptions.length} active</span></div><div className="grid gap-4 md:grid-cols-2">{prescriptions.map((prescription, index) => <ExerciseCard key={prescription.id} prescription={prescription} tone={index % 2 === 0 ? 'yellow' : 'teal'} />)}</div></section><div className="mt-8"><PrototypeNotice /></div></AppShell>;
}

  */
}

function PatientHomeLegacy() {
  const prescriptionsQuery = useListPrescriptions();
  const prescriptions = prescriptionsQuery.data ?? getStoredPrescriptions();
  const session = getSession();
  const doctor = getLinkedDoctor(session);
  const doctorInitials = doctor?.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() ?? 'PT';
  return <AppShell role="patient"><PageHeader eyebrow="Monday, February 17" title="Your movement plan" description="A little focused time today can make tomorrow feel more capable." action={<div className="flex items-center gap-2 rounded-full bg-[#e0f1e9] px-3 py-2 text-xs font-bold text-[#236b57]"><span className="h-2 w-2 rounded-full bg-[#3e9278]" />Plan is on track</div>} />
    <div className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]"><section className="relative overflow-hidden rounded-2xl bg-[hsl(var(--primary))] p-6 text-white md:p-8"><div className="absolute -right-20 -top-20 h-56 w-56 rounded-full border-[24px] border-white/5" /><div className="relative"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--accent))]">Today’s focus</p><h2 className="mt-3 max-w-lg font-display text-5xl leading-[.95] tracking-[-0.03em]">Move with a little more room.</h2><p className="mt-5 max-w-md text-sm leading-6 text-white/70">You have {prescriptions.length} active {prescriptions.length === 1 ? 'exercise' : 'exercises'} in your plan. Take your time and stay within the range your therapist set.</p><div className="mt-8 flex items-center gap-4"><div className="flex -space-x-2"><span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[hsl(var(--primary))] bg-[hsl(var(--accent))] text-xs font-bold text-[hsl(var(--foreground))]">MC</span><span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[hsl(var(--primary))] bg-[#b9dfd6] text-xs font-bold text-[#175b54]">JM</span></div><p className="text-xs text-white/60">Your plan is guided by Jordan Miller, PT</p></div></div></section><section className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Your rhythm</p><h2 className="mt-1 text-xl font-semibold">This week</h2></div><Target className="h-5 w-5 text-[hsl(var(--primary))]" /></div><div className="mt-7 flex items-end gap-3"><span className="font-display text-6xl">3</span><span className="mb-2 text-sm text-[hsl(var(--muted-foreground))]">sessions completed</span></div><div className="mt-6 flex justify-between">{['M','T','W','T','F','S','S'].map((day, index) => <div className="flex flex-col items-center gap-2" key={`${day}-${index}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${[0, 2, 4].includes(index) ? 'bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]'}`}>{[0, 2, 4].includes(index) ? <Check className="h-3.5 w-3.5" /> : ''}</span><span className="text-[10px] text-[hsl(var(--muted-foreground))]">{day}</span></div>)}</div><div className="mt-6 border-t border-[hsl(var(--border))] pt-4 text-xs text-[hsl(var(--muted-foreground))]">One more session this week keeps your current rhythm.</div></section></div>
    <section className="mt-6"><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Assigned exercises</p><h2 className="mt-1 text-xl font-semibold">Ready when you are</h2></div><span className="text-xs text-[hsl(var(--muted-foreground))]">{prescriptions.length} active</span></div><div className="grid gap-4 md:grid-cols-2">{prescriptions.map((rx, index) => <ExerciseCard key={rx.id} prescription={rx} tone={index % 2 === 0 ? 'yellow' : 'teal'} />)}</div></section>
    <div className="mt-8"><PrototypeNotice /></div>
  </AppShell>;
}

function ExerciseCard({ prescription, tone }: { prescription: Prescription; tone: 'yellow' | 'teal' }) {
  return <Link href={`/patient/exercise/${prescription.id}`} className="group block rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2" data-testid={`link-start-exercise-${prescription.id}`}><div className="flex items-start gap-4"><div className={`relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${tone === 'yellow' ? 'bg-[#fcf0cf] text-[#785e1e]' : 'bg-[#dcefe9] text-[#256c5e]'}`}><span className="absolute inset-3 rounded-full border-2 border-current/25" /><span className="font-mono-ui text-xs font-bold">{prescription.minRom}°</span></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{exerciseLabel(prescription.exerciseId)}</h3><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{prescription.sets} sets × {prescription.repetitions} reps</p></div><span className="rounded-full bg-[#e0f1e9] px-2 py-1 text-[10px] font-bold text-[#236b57]">Active</span></div><div className="mt-5 flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]"><span className="flex items-center gap-1"><Target className="h-3.5 w-3.5" />{prescription.minRom}–{prescription.maxRom}° range</span><span className="h-1 w-1 rounded-full bg-[hsl(var(--border))]" /><span>Updated {formatDate(prescription.updatedAt)}</span></div></div></div><div className="mt-5 flex items-center justify-between border-t border-[hsl(var(--border))] pt-4"><p className="text-xs text-[hsl(var(--muted-foreground))]">Approx. 6 minutes</p><span className="inline-flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--primary))] group-hover:gap-2.5">View exercise <ArrowRight className="h-3.5 w-3.5" /></span></div></Link>;
}

export function ExerciseInstructionsPage() {
  const { prescriptionId } = useParams<{ prescriptionId: string }>();
  const prescriptionsQuery = useListPrescriptions();
  const prescription = mergePrescriptions(prescriptionsQuery.data).find((item) => item.id === prescriptionId) ?? findPrescription(prescriptionId) ?? demoPrescriptions[0];
  const [, setLocation] = useLocation();
  return <AppShell role="patient"><div className="mb-7"><Link href="/patient" className="inline-flex items-center gap-2 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]" data-testid="link-back-exercises"><ArrowLeft className="h-4 w-4" />Back to my exercises</Link></div><div className="mx-auto max-w-4xl"><div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-start"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--primary))]">Before you begin</p><h1 className="mt-3 font-display text-6xl leading-[.9] tracking-[-0.04em]">{exerciseLabel(prescription.exerciseId)}</h1><p className="mt-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]">A calm, measured practice. Follow the guidance below and let the camera support your awareness of the movement.</p><div className="mt-8 flex items-center gap-3 rounded-xl bg-[hsl(var(--secondary))] p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--accent))]"><Clock3 className="h-5 w-5" /></span><div><p className="text-sm font-bold">{prescription.sets} sets · {prescription.repetitions} reps</p><p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">About 6 minutes</p></div></div><button onClick={() => setLocation(`/patient/session/${prescription.id}`)} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5 sm:w-auto sm:px-7" data-testid="button-start-session">Set up my camera <ArrowRight className="h-4 w-4" /></button></div><div className="space-y-4"><div className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Your cues</h2><span className="rounded-full bg-[hsl(var(--secondary))] px-2.5 py-1 text-[10px] font-bold text-[hsl(var(--primary))]">3 steps</span></div><div className="mt-5 space-y-4">{prescription.instructions.map((instruction, index) => <div className="flex gap-3" key={instruction}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent))] font-mono-ui text-[10px] font-bold">{String(index + 1).padStart(2, '0')}</span><p className="pt-0.5 text-sm leading-5">{instruction}</p></div>)}</div></div><div className="rounded-2xl border border-[#efd6cc] bg-[#fff7f3] p-5"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-[#9b5a4e]" /><div><h3 className="text-sm font-bold text-[#77453d]">A note for your body</h3><ul className="mt-2 space-y-1.5 text-xs leading-5 text-[#8b635c]">{prescription.precautions.map((precaution) => <li key={precaution}>• {precaution}</li>)}</ul></div></div></div><PrototypeNotice /></div></div></div></AppShell>;
}

export function LiveSessionPage() {
  const { prescriptionId } = useParams<{ prescriptionId: string }>();
  const prescriptionsQuery = useListPrescriptions();
  const prescription = mergePrescriptions(prescriptionsQuery.data).find((item) => item.id === prescriptionId) ?? findPrescription(prescriptionId) ?? demoPrescriptions[0];
  const [, setLocation] = useLocation();
  const createSession = useCreateSession();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(new Date().toISOString());
  const [cameraState, setCameraState] = useState<'idle' | 'requesting' | 'live' | 'error'>('idle');
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [poseState, setPoseState] = useState<'loading' | 'no-pose' | 'tracking' | 'error'>('loading');
  const [reps, setReps] = useState(0);
  const [phase, setPhase] = useState<'Ready' | 'Lower' | 'Rise'>('Ready');
  const [angle, setAngle] = useState<number | null>(null);
  const [landmarks, setLandmarks] = useState<PoseLandmark[] | null>(null);
  const [voice, setVoice] = useState(true);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const analyzerCleanupRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    const timer = window.setInterval(() => { if (!paused) setElapsed((value) => value + 1); }, 1000);
    return () => window.clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    if (cameraState !== 'live' || !videoRef.current) return;
    let cancelled = false;
    setPoseState('loading');
    createPoseAnalyzer(videoRef.current, {
      onFrame: ({ angle: nextAngle, landmarks: nextLandmarks, phase: nextPhase, reps: nextReps, hasPose }) => {
        if (cancelled) return;
        setAngle(nextAngle);
        setLandmarks(nextLandmarks);
        setPhase(hasPose ? nextPhase : 'Ready');
        setReps(nextReps);
        setPoseState(hasPose ? 'tracking' : 'no-pose');
      },
      onError: () => { if (!cancelled) setPoseState('error'); },
    }).then((cleanup) => {
      if (cancelled) cleanup();
      else analyzerCleanupRef.current = cleanup;
    }).catch(() => { if (!cancelled) setPoseState('error'); });
    return () => {
      cancelled = true;
      analyzerCleanupRef.current?.();
      analyzerCleanupRef.current = null;
    };
  }, [cameraState]);

  useEffect(() => () => {
    analyzerCleanupRef.current?.();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const startCamera = async () => {
    if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      setCameraError('Camera access requires HTTPS. Open this app over a secure connection.');
      setCameraState('error');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
      setCameraError('This browser does not provide camera access.');
      setCameraState('error');
      return;
    }
    setCameraState('requesting');
    setCameraError('');
    streamRef.current?.getTracks().forEach((track) => track.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const video = videoRef.current;
      await video.play();
      if (!video.srcObject || video.paused || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        throw new Error('The camera stream did not start playing.');
      }
      streamRef.current = stream;
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        setCameraError('The camera stream ended. Connect the camera again to continue.');
        setCameraState('error');
      }, { once: true });
      setCameraState('live');
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const name = error instanceof DOMException ? error.name : '';
      setCameraError(name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access and try again.' : 'The camera could not start. Check browser permissions and try again.');
      setCameraState('error');
    }
  };

  const switchCamera = () => {
    setFacingMode((mode) => mode === 'environment' ? 'user' : 'environment');
    window.setTimeout(startCamera, 0);
  };

  const complete = (status: 'completed' | 'interrupted') => {
    const endedAt = new Date().toISOString();
    const input: SessionInput = {
      patientId: prescription.patientId,
      prescriptionId: prescription.id,
      exerciseId: prescription.exerciseId,
      startedAt: startedAtRef.current,
      endedAt,
      reps,
      correctReps: reps,
      romAchieved: angle ?? 0,
      durationSeconds: elapsed,
      errors: status === 'interrupted'
        ? ['Session stopped before the planned set was complete.']
        : angle === null ? ['No valid pose was detected during this session.'] : [],
      status,
    };
    createSession.mutate({ data: input }, {
      onSuccess: (session) => {
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListPrescriptionsQueryKey() });
        setLocation(`/patient/summary/${session.id}`);
      },
      onError: () => { const localSession = saveStoredSession(input, getSession()?.name ?? prescription.patientName); setLocation(`/patient/summary/${localSession.id}`); },
    });
  };

  const progress = Math.min(100, (reps / prescription.repetitions) * 100);
  const poseMessage = poseState === 'no-pose'
    ? 'Position your full body in frame'
    : poseState === 'loading' ? 'Starting pose analysis…'
      : poseState === 'error' ? 'Pose analysis is unavailable. Reconnect the camera to try again.'
        : `${prescription.voiceCue ?? 'Pose detected · move through your prescribed range'}${prescription.holdTimeSeconds ? ` · Hold ${prescription.holdTimeSeconds}s` : ''}`;
  const cameraLabel = cameraState === 'live' ? 'Camera connected' : cameraState === 'requesting' ? 'Connecting camera…' : 'Camera not connected';

  return <div className="min-h-[100dvh] bg-[#182f36] text-white">
    <header className="flex items-center justify-between px-5 py-4 md:px-8">
      <Link href="/patient" className="inline-flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white" data-testid="link-exit-session"><ArrowLeft className="h-4 w-4" />Exit session</Link>
      <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"><ActivityIcon /></span><span className="text-sm font-bold">kinetic<span className="text-[hsl(var(--accent))]">/</span>care</span></div>
      <div className="font-mono-ui text-xs text-white/60">{String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</div>
    </header>
    <main className="mx-auto max-w-[1240px] px-4 pb-8 md:px-8">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--accent))]">Live assist · {exerciseLabel(prescription.exerciseId)}</p><h1 className="mt-2 font-display text-4xl tracking-[-0.03em] md:text-5xl">Find your steady rhythm.</h1></div>
        <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${cameraState === 'live' ? 'bg-[#83d4ac]' : 'bg-[hsl(var(--accent))]'}`} /><span className="text-xs text-white/60">{cameraLabel}</span></div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-[#243f46] md:aspect-[16/10]">
          <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full object-cover [transform:scaleX(-1)] ${cameraState === 'live' ? 'opacity-100' : 'pointer-events-none absolute opacity-0'}`} />
          {cameraState === 'live' && <PoseOverlay video={videoRef.current} landmarks={landmarks} angle={angle} target={prescription.angleRules[0]?.target ?? prescription.minRom} minRom={prescription.minRom} maxRom={prescription.maxRom} />}
          {cameraState !== 'live' && <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-[hsl(var(--accent))]/40 bg-[hsl(var(--accent))]/10 animate-pulse-ring"><Camera className="h-9 w-9 text-[hsl(var(--accent))]" /></div>
            <h2 className="mt-7 text-lg font-semibold">{cameraState === 'error' ? 'Camera unavailable' : cameraState === 'requesting' ? 'Connecting your camera…' : 'Set up your camera'}</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-white/55">{cameraError || 'Place your device so your full body is visible, then allow camera access for live assist.'}</p>
            <button onClick={startCamera} disabled={cameraState === 'requesting'} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[hsl(var(--accent))] px-4 text-xs font-bold text-[hsl(var(--foreground))] disabled:opacity-60" data-testid="button-connect-camera"><Camera className="h-4 w-4" />{cameraState === 'requesting' ? 'Connecting…' : 'Connect camera'}</button>
          </div>}
          {cameraState === 'live' && <><div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-[#182f36]/80 px-3 py-2 text-[10px] font-bold text-white backdrop-blur-sm"><span className="h-1.5 w-1.5 rounded-full bg-[#83d4ac]" />LIVE CAMERA</div><button onClick={switchCamera} className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-[#182f36]/80 px-3 py-2 text-[10px] font-bold text-white backdrop-blur-sm hover:bg-[#182f36]" data-testid="button-switch-camera"><RefreshCw className="h-3.5 w-3.5" />Switch camera</button></>}
          {cameraState === 'live' && <div className="absolute left-4 right-4 top-16 rounded-xl bg-[#182f36]/80 px-3 py-2 text-center text-xs font-semibold text-white backdrop-blur-sm">{poseMessage}</div>}
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between"><div className="rounded-xl bg-[#182f36]/80 px-3 py-2 backdrop-blur-sm"><p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Current phase</p><p className="mt-1 text-sm font-bold">{phase}</p></div><button onClick={() => setVoice((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#182f36]/80 text-white backdrop-blur-sm hover:bg-[#182f36]" data-testid="button-toggle-voice">{voice ? <Volume2 className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}</button></div>
        </div>
        <aside className="space-y-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1"><LiveMetric label="Repetitions" value={`${reps}/${prescription.repetitions}`} helper="from detected pose" /><LiveMetric label="Knee angle" value={angle === null ? '—' : `${angle}°`} helper={prescription.angleRules[0] ? `target ${prescription.angleRules[0].target}°` : 'target unavailable'} /><LiveMetric label="Range of motion" value={angle === null ? '—' : `${angle}°`} helper={`${prescription.minRom}–${prescription.maxRom}°`} /></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-center justify-between"><span className="text-xs font-semibold">Set progress</span><span className="font-mono-ui text-[10px] text-white/50">{Math.round(progress)}%</span></div><div className="mt-3 h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-[hsl(var(--accent))] transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-3 text-[11px] leading-5 text-white/50">Only valid pose frames count toward your set.</p></div>
          <div className="flex gap-3"><button onClick={() => setPaused((value) => !value)} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-xs font-bold hover:bg-white/10" data-testid="button-pause-session">{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}{paused ? 'Resume' : 'Pause'}</button><button onClick={() => complete('interrupted')} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#e5aaa0]/30 bg-[#8b4e45]/20 text-xs font-bold text-[#f4c1b8] hover:bg-[#8b4e45]/30" data-testid="button-stop-session"><CircleAlert className="h-4 w-4" />Stop</button></div>
          <div className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/10 text-xs font-bold text-white/45" data-testid="status-live-reps"><Check className="h-4 w-4" />Reps follow live pose</div>
        </aside>
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-xs leading-5 text-white/50"><Info className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />Assistive analysis is a research prototype. It does not diagnose, measure clinically, or replace guidance from your physiotherapist.</div>
      <button onClick={() => complete('completed')} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-[hsl(var(--foreground))] hover:bg-white/90" data-testid="button-complete-session">Finish session <ArrowRight className="h-4 w-4" /></button>
    </main>
  </div>;
}

function ActivityIcon() { return <Sparkles className="h-4 w-4" />; }
function LiveMetric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-white/45">{label}</p><p className="mt-2 font-mono-ui text-2xl font-bold text-[hsl(var(--accent))]">{value}</p><p className="mt-1 text-[10px] text-white/40">{helper}</p></div>;
}

export function SessionSummaryPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const sessionQuery = useGetSession(sessionId ?? 's-local', { query: { enabled: !!sessionId && sessionId !== 's-local', queryKey: getGetSessionQueryKey(sessionId ?? 's-local') } });
  const session = sessionQuery.data ?? findSession(sessionId);
  const quality = session.reps ? Math.round(session.correctReps / session.reps * 100) : 0;
  return <AppShell role="patient"><div className="mx-auto max-w-3xl"><div className="text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e0f1e9] text-[#236b57]"><Check className="h-8 w-8" /></span><p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--primary))]">Session complete</p><h1 className="mt-3 font-display text-6xl tracking-[-0.04em]">That was good work.</h1><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">You made time for your body today. Here’s a simple look at how the movement went.</p></div><div className="mt-10 rounded-2xl bg-[hsl(var(--primary))] p-6 text-white md:p-8"><div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--accent))]">{exerciseLabel(session.exerciseId)}</p><p className="mt-2 text-sm text-white/60">{formatDate(session.endedAt)} · {formatTime(session.durationSeconds)}</p></div><div className="text-left sm:text-right"><p className="font-display text-6xl leading-none">{quality}%</p><p className="mt-1 text-xs text-white/55">target-aligned reps</p></div></div><div className="mt-7 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[hsl(var(--accent))]" style={{ width: `${quality}%` }} /></div><div className="mt-7 grid grid-cols-3 gap-3"><SummaryMetric label="Reps" value={`${session.correctReps}/${session.reps}`} /><SummaryMetric label="Best range" value={`${session.romAchieved}°`} /><SummaryMetric label="Time" value={formatTime(session.durationSeconds)} /></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[hsl(var(--primary))]" /><h2 className="text-sm font-bold">A note to take with you</h2></div><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{session.errors.length ? 'Your pace was steady. Next time, give yourself a little more space at the bottom of the movement.' : 'Your movement stayed within the planned range. Keep that same calm pace next time.'}</p></div><div className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[hsl(var(--primary))]" /><h2 className="text-sm font-bold">Remember</h2></div><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">These are assistive signals from a research prototype, not clinical measurements or a diagnosis.</p></div></div><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/patient" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 text-sm font-bold text-white" data-testid="link-back-home-summary">Back to my plan <ArrowRight className="h-4 w-4" /></Link><Link href={`/patient/exercise/${session.prescriptionId}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] px-6 text-sm font-bold" data-testid="link-repeat-session"><RotateCcw className="h-4 w-4" />Try again</Link></div></div></AppShell>;
}

function SummaryMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-white/10 p-3"><p className="text-[10px] text-white/50">{label}</p><p className="mt-1 font-mono-ui text-sm font-bold">{value}</p></div>; }
