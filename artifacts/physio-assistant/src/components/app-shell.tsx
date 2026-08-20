import { Activity, Bell, ClipboardPlus, Home, LogOut, Menu, Search, Settings2, Users, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { getSession, signOut } from '@/lib/auth';

type Role = 'physio' | 'patient';

export function BrandMark() {
  return <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] shadow-sm"><Activity className="h-5 w-5" strokeWidth={2.3} /></span>;
}

export function PrototypeNotice({ compact = false }: { compact?: boolean }) {
  return <div className={`border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] ${compact ? 'rounded-lg px-3 py-2 text-[11px]' : 'rounded-xl px-4 py-3 text-xs'}`}>
    <span className="font-semibold text-[hsl(var(--foreground))]">Assistive research prototype</span>
    <span className="mx-1.5 opacity-50">·</span>
    Not a diagnosis or medical replacement.
  </div>;
}

export function AppShell({ children, role = 'physio' }: { children: ReactNode; role?: Role }) {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<'settings' | 'notifications' | null>(null);
  const session = getSession();

  const physioLinks = [
    { href: '/physio', label: 'Overview', icon: Home },
    { href: '/physio/patients', label: 'Patients', icon: Users },
    { href: '/physio/prescriptions/new', label: 'New prescription', icon: ClipboardPlus },
  ];
  const patientLinks = [
    { href: '/patient', label: 'My exercises', icon: Home },
    { href: '/patient', label: 'Progress', icon: Activity },
  ];
  const links = role === 'physio' ? physioLinks : patientLinks;

  // Display name / initials — prefer real session, fall back to demo defaults
  const displayName = session?.name ?? 'Your profile';
  const displayRole = session?.role === 'physio'
    ? (session.clinicName ? `PT · ${session.clinicName}` : 'Physiotherapist')
    : 'Patient';
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const headerLabel = session
    ? `${displayName}${role === 'physio' ? ', PT' : ''}`
    : displayName;

  function handleSignOut() {
    signOut();
    setLocation('/signin');
  }

  return <div className="min-h-[100dvh] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-[248px] flex-col bg-[hsl(var(--sidebar))] px-4 py-5 text-[hsl(var(--sidebar-foreground))] transition-transform duration-300 md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between px-2">
        <Link href="/" className="flex items-center gap-3" data-testid="link-brand">
          <BrandMark /><span className="font-semibold tracking-[-0.02em] text-white">kinetic<span className="text-[hsl(var(--accent))]">/</span>care</span>
        </Link>
        <button className="rounded-lg p-1 text-white/65 md:hidden" onClick={() => setOpen(false)} data-testid="button-close-menu"><X className="h-5 w-5" /></button>
      </div>
      <div className="mt-10 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{role === 'physio' ? 'Clinician workspace' : 'Your movement plan'}</div>
      <nav className="mt-3 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === '/physio' ? location === href : location.startsWith(href);
          return <Link key={label} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${active ? 'bg-[hsl(var(--sidebar-accent))] text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>
            <Icon className={`h-[18px] w-[18px] ${active ? 'text-[hsl(var(--accent))]' : ''}`} />{label}
          </Link>;
        })}
      </nav>
      <div className="mt-auto space-y-4">
        <PrototypeNotice compact />
        {/* Physio access code badge */}
        {role === 'physio' && session?.accessCode && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">Doctor access code</p>
            <p className="mt-1 font-mono-ui text-sm font-bold text-[hsl(var(--accent))]">{session.accessCode}</p>
          </div>
        )}
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-xs font-bold text-[hsl(var(--foreground))]">{initials}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{displayName}</p><p className="text-[11px] text-white/45">{displayRole}</p></div>
          <button onClick={() => setPanel('settings')} className="text-white/40 hover:text-white" data-testid="button-settings" aria-label="Open settings"><Settings2 className="h-4 w-4" /></button>
        </div>
        <button onClick={handleSignOut} className="flex w-full items-center gap-3 px-3 text-xs text-white/45 hover:text-white" data-testid="button-sign-out"><LogOut className="h-4 w-4" />Sign out</button>
      </div>
    </aside>
    {open && <button className="fixed inset-0 z-20 bg-[hsl(var(--foreground))]/30 md:hidden" onClick={() => setOpen(false)} aria-label="Close navigation" data-testid="button-backdrop" />}
    <div className="md:pl-[248px]">
      <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/90 px-5 backdrop-blur-md md:px-10">
        <button className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] md:hidden" onClick={() => setOpen(true)} data-testid="button-open-menu"><Menu className="h-5 w-5" /></button>
        <div className="hidden items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] md:flex"><span className="h-2 w-2 rounded-full bg-[hsl(var(--chart-3))]" />Workspace synced just now</div>
        <div className="ml-auto flex items-center gap-4"><button onClick={() => setPanel('notifications')} className="relative rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]" data-testid="button-notifications" aria-label="Open notifications"><Bell className="h-[18px] w-[18px]" /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[hsl(var(--destructive))]" /></button><div className="hidden h-5 w-px bg-[hsl(var(--border))] sm:block" /><span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">{headerLabel}</span></div>
      </header>
      <main className="mx-auto max-w-[1440px] px-5 py-8 md:px-10 md:py-10">{children}</main>
    </div>
    {panel && <div className="fixed inset-0 z-40 flex items-start justify-end bg-[hsl(var(--foreground))]/25 p-4 pt-20" onClick={() => setPanel(null)}><section className="w-full max-w-sm rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-xl" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true"><div className="flex items-center justify-between"><h2 className="font-display text-3xl">{panel === 'settings' ? 'Settings' : 'Notifications'}</h2><button onClick={() => setPanel(null)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]" aria-label="Close panel"><X className="h-4 w-4" /></button></div>{panel === 'settings' ? <div className="mt-6 space-y-4 text-sm"><div><p className="text-xs text-[hsl(var(--muted-foreground))]">Name</p><p className="mt-1 font-semibold">{displayName}</p></div><div><p className="text-xs text-[hsl(var(--muted-foreground))]">Email</p><p className="mt-1 font-semibold">{session?.email ?? 'Demo account'}</p></div><p className="border-t border-[hsl(var(--border))] pt-4 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Profile details are managed from your account. Sign out below when you are finished.</p><button onClick={handleSignOut} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] text-xs font-bold text-white"><LogOut className="h-4 w-4" />Sign out</button></div> : <div className="mt-6 rounded-xl bg-[hsl(var(--secondary))] p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{role === 'physio' ? 'New session results will appear here after a patient completes an exercise.' : 'Your care team updates and completed session notes will appear here.'}</div>}</section></div>}
  </div>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
    <div>{eyebrow && <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">{eyebrow}</p>}<h1 className="font-display text-4xl leading-none tracking-[-0.03em] text-[hsl(var(--foreground))] md:text-5xl">{title}</h1>{description && <p className="mt-3 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">{description}</p>}</div>
    {action}
  </div>;
}

export function SearchField({ value, onChange, placeholder = 'Search by name or email' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] pl-10 pr-4 text-sm outline-none transition-shadow placeholder:text-[hsl(var(--muted-foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20" data-testid="input-search" /></label>;
}
