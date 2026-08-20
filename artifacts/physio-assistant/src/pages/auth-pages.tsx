import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { Activity, Eye, EyeOff, HeartPulse, Stethoscope } from 'lucide-react';
import { signIn, signUpPhysio, signUpPatient, type Role } from '@/lib/auth';

// ── shared primitives ────────────────────────────────────────────────────────

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[hsl(var(--background))] flex flex-col">
      {/* Nav */}
      <header className="mx-auto flex w-full max-w-6xl items-center px-5 py-5 md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--accent))]">
            <Activity className="h-5 w-5" />
          </span>
          <span className="font-semibold tracking-[-0.02em]">
            kinetic<span className="text-[hsl(var(--primary))]">/</span>care
          </span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md animate-rise-in">{children}</div>
      </main>

      <footer className="pb-8 text-center text-[11px] text-[hsl(var(--muted-foreground))]">
        Assistive research prototype · Not a diagnosis or medical replacement.
      </footer>
    </div>
  );
}

function Field({
  label,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  required,
  hint,
}: {
  label: string;
  id: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-[hsl(var(--foreground))]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && show ? 'text' : type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          maxLength={id.includes('name') ? 35 : undefined}
          required={required}
          className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-1 placeholder:text-[hsl(var(--muted-foreground))]"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hint && <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{hint}</p>}
    </div>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-[#efd6cc] bg-[#fff7f3] px-4 py-3 text-xs text-[#8b4e45]">
      {message}
    </div>
  );
}

// ── Sign In ──────────────────────────────────────────────────────────────────

export function SignInPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    // Micro-delay for perceived security
    setTimeout(() => {
      const result = signIn(email, password);
      setLoading(false);
      if (!result.ok) {
        setError(result.error ?? 'Sign-in failed.');
        return;
      }
      if (result.user?.role === 'physio') {
        setLocation('/physio');
      } else {
        setLocation('/patient');
      }
    }, 280);
  }

  return (
    <AuthLayout>
      <div className="mb-8 space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--primary))]">
          Welcome back
        </p>
        <h1 className="font-display text-4xl tracking-[-0.03em]">Sign in</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          id="signin-email"
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
          required
        />
        <Field
          id="signin-password"
          label="Password"
          type="password"
          placeholder="Your password"
          value={password}
          onChange={setPassword}
          required
        />

        {error && <ErrorAlert message={error} />}

        {/* Demo hint */}
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-4 py-3 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">
          <span className="font-semibold text-[hsl(var(--foreground))]">Demo accounts</span>
          <br />
          Physio: <span className="font-mono-ui">jordan@kineticcare.io</span> · password: demo
          <br />
          Patient: <span className="font-mono-ui">maya.chen@example.com</span> · password: demo
        </div>

        <button
          type="submit"
          disabled={loading}
          id="btn-signin-submit"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
        No account?{' '}
        <Link href="/signup" className="font-semibold text-[hsl(var(--primary))] hover:underline">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}

// ── Sign Up ──────────────────────────────────────────────────────────────────

export function SignUpPage() {
  const [, setLocation] = useLocation();
  const [role, setRole] = useState<Role>('patient');
  const [name, setName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      let result;
      if (role === 'physio') {
        result = signUpPhysio({ name, clinicName, email, password });
        if (result.ok && result.user?.accessCode) {
          setCreatedCode(result.user.accessCode);
          setLoading(false);
          return; // Show code reveal before redirect
        }
      } else {
        result = signUpPatient({ name, email, password, doctorAccessCode: accessCode });
      }
      setLoading(false);
      if (!result.ok) {
        setError(result.error ?? 'Sign-up failed.');
        return;
      }
      setLocation(role === 'physio' ? '/physio' : '/patient');
    }, 320);
  }

  // After physio sees their access code, navigate
  if (createdCode) {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--primary))]">
              Account created
            </p>
            <h1 className="font-display text-4xl tracking-[-0.03em]">Your access code</h1>
          </div>
          <p className="text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Share this code with your patients when they sign up. They'll need it to join your
            caseload.
          </p>
          <div className="rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
              Doctor access code
            </p>
            <p className="mt-3 font-mono-ui text-4xl font-bold tracking-widest">{createdCode}</p>
            <p className="mt-3 text-[11px] text-[hsl(var(--muted-foreground))]">
              You can find this in your profile at any time.
            </p>
          </div>
          <button
            id="btn-access-code-continue"
            onClick={() => setLocation('/physio')}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5"
          >
            Go to dashboard
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="mb-6 space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--primary))]">
          Get started
        </p>
        <h1 className="font-display text-4xl tracking-[-0.03em]">Create account</h1>
      </div>

      {/* Role toggle */}
      <div className="mb-6 flex gap-3">
        {(
          [
            { value: 'patient' as Role, icon: HeartPulse, label: "I'm a patient" },
            { value: 'physio' as Role, icon: Stethoscope, label: "I'm a physiotherapist" },
          ] as const
        ).map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            type="button"
            id={`btn-role-${value}`}
            onClick={() => setRole(value)}
            className={`flex flex-1 flex-col items-center gap-2 rounded-xl border py-4 text-xs font-bold transition-colors ${
              role === value
                ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white'
                : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))]'
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          id="signup-name"
          label="Full name"
          placeholder="Your name"
          value={name}
          onChange={setName}
          required
        />

        {role === 'physio' && (
          <Field
            id="signup-clinic"
            label="Clinic name"
            placeholder="Your practice or clinic"
            value={clinicName}
            onChange={setClinicName}
            required
          />
        )}

        <Field
          id="signup-email"
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
          required
        />

        <Field
          id="signup-password"
          label="Password"
          type="password"
          placeholder="Choose a password"
          value={password}
          onChange={setPassword}
          required
        />

        {role === 'patient' && (
          <Field
            id="signup-access-code"
            label="Doctor Access Code"
            placeholder="e.g. KC-AB23"
            value={accessCode}
            onChange={setAccessCode}
            required
            hint="Ask your physiotherapist for their code."
          />
        )}

        {role === 'physio' && (
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-4 py-3 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">
            A unique <span className="font-semibold text-[hsl(var(--foreground))]">Doctor Access Code</span> will be
            generated for you after sign-up. Share it with patients so they can join your caseload.
          </div>
        )}

        {error && <ErrorAlert message={error} />}

        <button
          type="submit"
          disabled={loading}
          id="btn-signup-submit"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
        Already have an account?{' '}
        <Link href="/signin" className="font-semibold text-[hsl(var(--primary))] hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
