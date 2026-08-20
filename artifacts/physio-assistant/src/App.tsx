import { type ReactNode } from 'react';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Activity, ArrowRight, Check, HeartPulse, Stethoscope } from 'lucide-react';
import { Link, Redirect } from 'wouter';
import { PhysioOverview, PatientsPage, ReviewSessionPage } from '@/pages/physio-pages';
import { NewPrescriptionPageForm } from '@/pages/new-prescription-page';
import { ExerciseInstructionsPage, LiveSessionPage, SessionSummaryPage } from '@/pages/patient-pages';
import { PatientHome } from '@/pages/patient-home';
import { SignInPage, SignUpPage } from '@/pages/auth-pages';
import { LandingPage } from '@/pages/landing-page';
import { getSession, isPatientRetired } from '@/lib/auth';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Home() {
  const session = getSession();
  if (session) {
    return <Redirect to={session.role === 'physio' ? '/physio' : '/patient'} />;
  }
  return <div className="min-h-[100dvh] overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8"><Link href="/" className="flex items-center gap-3" data-testid="link-home-brand"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--accent))]"><Activity className="h-5 w-5" /></span><span className="font-semibold tracking-[-0.02em]">kinetic<span className="text-[hsl(var(--primary))]">/</span>care</span></Link><div className="flex items-center gap-3"><Link href="/signin" className="text-xs font-semibold text-[hsl(var(--primary))] hover:underline" data-testid="link-signin">Sign in</Link><Link href="/signup" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-4 text-xs font-bold text-white shadow-sm hover:-translate-y-0.5 transition-transform" data-testid="link-signup">Get started</Link></div></header>
    <main className="mx-auto max-w-6xl px-5 pb-16 pt-10 md:px-8 md:pt-20"><div className="grid items-center gap-12 lg:grid-cols-[1fr_.9fr]"><div className="animate-rise-in"><div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--secondary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary))]"><HeartPulse className="h-3.5 w-3.5" />Movement, made more understandable</div><h1 className="max-w-2xl font-display text-6xl leading-[.88] tracking-[-0.045em] md:text-8xl">A steadier way to <em className="text-[hsl(var(--primary))]">move forward.</em></h1><p className="mt-7 max-w-lg text-base leading-7 text-[hsl(var(--muted-foreground))]">Kinetic Care connects a physiotherapist's precise plan with a patient's everyday practice — with just enough technology to make the next movement feel clear.</p><div className="mt-8 flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#b9dfd6] text-[10px] font-bold text-[#175b54]">JM</span><span>Guided by clinicians. Built around people.</span></div></div><div className="relative animate-rise-in-delay-1"><div className="absolute -inset-6 rounded-[2.5rem] bg-[#dcefe9]/60 blur-2xl" /><div className="relative rounded-[2rem] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[0_24px_70px_-35px_hsl(var(--foreground)/.35)] md:p-7"><div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary))] text-white"><Stethoscope className="h-5 w-5" /></span><div><p className="text-sm font-bold">Today's movement plan</p><p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">Maya Chen · supported squat</p></div></div><span className="h-2 w-2 rounded-full bg-[#3e9278]" /></div><div className="mt-6 rounded-2xl bg-[hsl(var(--secondary))] p-5"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Movement target</p><p className="mt-3 font-display text-5xl">72°</p></div><div className="text-right"><p className="font-mono-ui text-xs font-bold text-[hsl(var(--primary))]">58° — 78°</p><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">comfortable range</p></div></div><div className="mt-6 h-2 rounded-full bg-[hsl(var(--border))]"><div className="relative ml-[58%] h-full w-[20%] rounded-full bg-[hsl(var(--accent))]"><span className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full border-2 border-[hsl(var(--primary))] bg-[hsl(var(--card))]" /></div></div></div><div className="mt-5 flex items-center gap-3 rounded-xl border border-[#b9dfd6] bg-[#eef8f4] p-3"><Check className="h-4 w-4 text-[#236b57]" /><p className="text-xs text-[#236b57]">Your therapist's cues are ready when you are.</p></div><div className="mt-5 flex justify-between text-[10px] text-[hsl(var(--muted-foreground))]"><span>3 sets</span><span>8 repetitions</span><span>Approx. 6 min</span></div></div></div></div>
      <section className="mt-24"><div className="mb-6 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--primary))]">Choose your demo</p><h2 className="mt-2 font-display text-5xl tracking-[-0.03em]">Two sides of the same care.</h2></div><p className="hidden max-w-xs text-right text-xs leading-5 text-[hsl(var(--muted-foreground))] md:block">This prototype lets you step into the clinician workspace or the patient experience.</p></div><div className="grid gap-4 md:grid-cols-2"><RoleCard href="/signin" icon={Stethoscope} title="I'm a physiotherapist" text="Turn a patient's plan into a measurable, humane movement target." label="Open clinician workspace" tone="dark" /><RoleCard href="/signin" icon={HeartPulse} title="I'm doing my exercises" text="See today's plan, get set up, and move through a guided session." label="Open patient experience" tone="light" /></div></section><p className="mt-10 text-center text-[11px] text-[hsl(var(--muted-foreground))]">Assistive research prototype · Not a diagnosis or medical replacement.</p></main>
  </div>;
}

function RoleCard({ href, icon: Icon, title, text, label, tone }: { href: string; icon: typeof Stethoscope; title: string; text: string; label: string; tone: 'dark' | 'light' }) {
  return <Link href={href} className={`group rounded-2xl border p-6 transition-transform hover:-translate-y-1 md:p-7 ${tone === 'dark' ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white' : 'border-[hsl(var(--card-border))] bg-[hsl(var(--card))]'}`} data-testid={`link-role-${tone}`}><div className="flex items-start justify-between"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone === 'dark' ? 'bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]'}`}><Icon className="h-5 w-5" /></span><ArrowRight className={`h-5 w-5 transition-transform group-hover:translate-x-1 ${tone === 'dark' ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--primary))]'}`} /></div><h3 className="mt-12 text-xl font-bold">{title}</h3><p className={`mt-2 max-w-sm text-sm leading-6 ${tone === 'dark' ? 'text-white/65' : 'text-[hsl(var(--muted-foreground))]'}`}>{text}</p><p className={`mt-6 text-xs font-bold ${tone === 'dark' ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--primary))]'}`}>{label} <span className="ml-1">→</span></p></Link>;
}

// ── Protected route wrapper ──────────────────────────────────────────────────

function RequirePhysio({ children }: { children: ReactNode }) {
  const session = getSession();
  if (!session) return <Redirect to="/signin" />;
  if (session.role !== 'physio') return <Redirect to="/patient" />;
  return <>{children}</>;
}

function RequirePatient({ children }: { children: ReactNode }) {
  const session = getSession();
  if (!session) return <Redirect to="/signin" />;
  if (session.role !== 'patient') return <Redirect to="/physio" />;
  if (session.status === 'retired' || isPatientRetired(session.id)) return <Redirect to="/signin" />;
  return <>{children}</>;
}

// ── Router ───────────────────────────────────────────────────────────────────

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/signin" component={SignInPage} />
        <Route path="/signup" component={SignUpPage} />

        <Route path="/physio">
          {() => <RequirePhysio><PhysioOverview /></RequirePhysio>}
        </Route>
        <Route path="/physio/patients">
          {() => <RequirePhysio><PatientsPage /></RequirePhysio>}
        </Route>
        <Route path="/physio/prescriptions/new">
          {() => <RequirePhysio><NewPrescriptionPageForm /></RequirePhysio>}
        </Route>
        <Route path="/physio/review/:sessionId">
          {() => <RequirePhysio><ReviewSessionPage /></RequirePhysio>}
        </Route>

        <Route path="/patient">
          {() => <RequirePatient><PatientHome /></RequirePatient>}
        </Route>
        <Route path="/patient/exercise/:prescriptionId">
          {() => <RequirePatient><ExerciseInstructionsPage /></RequirePatient>}
        </Route>
        <Route path="/patient/session/:prescriptionId">
          {() => <RequirePatient><LiveSessionPage /></RequirePatient>}
        </Route>
        <Route path="/patient/summary/:sessionId">
          {() => <RequirePatient><SessionSummaryPage /></RequirePatient>}
        </Route>

        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function RouteMetadata() {
  const [location] = useLocation();
  useEffect(() => {
    const isPublic = location === '/';
    const robots = document.querySelector('meta[name="robots"]');
    if (robots) robots.setAttribute('content', isPublic ? 'index, follow' : 'noindex, nofollow');
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', 'https://kineticcare.app/');
  }, [location]);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <RouteMetadata />
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
