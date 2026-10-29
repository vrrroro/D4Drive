import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { StackPanel } from '@/components/motion/StackPanel';
import { ReportTable } from '@/components/sections/ReportTable';
import { DatabaseTryIt } from '@/components/sections/DatabaseTryIt';
import { getSession } from '@/lib/auth/guards';
import { RELATIONAL_SCHEMA, TRANSACTIONS } from '@/lib/database-walkthrough';
import { constraintCounts, listRoutines, listTriggers, tableCounts } from '@/lib/services/database-info';
import { listAllCars, listBranches } from '@/lib/services/admin';
import { runReports } from '@/lib/services/reports';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'How the database works' };

const FLOW = [
  { step: 'User operation', text: 'Someone does something on a page: reserves, cancels, closes the day.' },
  { step: 'SQL or stored program', text: 'The route validates the input, then sends one statement or calls one procedure.' },
  { step: 'Database processing', text: 'MySQL locks, checks constraints, runs functions, and fires triggers.' },
  { step: 'Update or retrieval', text: 'Rows are inserted, updated or deleted together in one transaction, or read.' },
  { step: 'Result', text: 'The page shows a reference, a refund, a list, or the reason it was refused.' },
];

export default async function DatabasePage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin/database');
  if (session.role !== 'admin') redirect('/');

  const [counts, routines, triggers, constraints, cars, branches, [history]] = await Promise.all([
    tableCounts(),
    listRoutines(),
    listTriggers(),
    constraintCounts(),
    listAllCars(),
    listBranches(),
    runReports(['recent_history']),
  ]);

  return (
    <StackPanel tone="studio" className="panel min-h-[100dvh] pt-[calc(var(--header-h)+clamp(2rem,4vw,4rem))]" aria-labelledby="db-title">
      <Link href="/admin" className="keycap t-label">
        <ArrowLeft aria-hidden className="h-4 w-4" strokeWidth={1.5} />
        Operations
      </Link>

      <h1 id="db-title" className="t-mega mt-12 max-w-[16ch]">
        How the <span className="italic-safe inline-block italic">database</span> works.
      </h1>
      <p className="t-body mt-8 max-w-[65ch] text-[var(--muted)]">
        Every page of D4Drive talks to one MySQL 8 database through the Node driver mysql2, with
        parameterised SQL and stored programs. Nothing here is a separate exercise: each table,
        routine and trigger below is used by a page you can open. The full write-up is
        docs/DATABASE.md in the repository.
      </p>

      <ol className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-5 md:gap-6">
        {FLOW.map((f, i) => (
          <li key={f.step} className="border-t-4 border-[var(--color-carmine)] pt-4">
            <p className="t-label text-[var(--accent-text)]">Step {i + 1}</p>
            <p className="mt-2 font-display text-xl font-light">{f.step}</p>
            <p className="mt-2 font-body text-sm text-[var(--muted)]">{f.text}</p>
          </li>
        ))}
      </ol>

      <section aria-labelledby="inventory-title" className="mt-24">
        <h2 id="inventory-title" className="t-display">What is in it, right now.</h2>
        <p className="t-body mt-4 max-w-[65ch] text-[var(--muted)]">Read live from MySQL and its information_schema, not written by hand.</p>
        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h3 className="t-label text-[var(--muted)]">Tables and rows</h3>
            <ul className="mt-4 flex flex-col">
              {counts.map((c) => (
                <li key={c.table} className="flex justify-between border-b border-[var(--ink)]/10 py-2 font-body text-sm">
                  <span>{c.table}</span>
                  <span className="tabular-nums">{c.rows}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 font-body text-xs text-[var(--muted)]">
              Constraints: {constraints.map((c) => `${c.n} ${c.kind.toLowerCase()}`).join(', ')}.
            </p>
          </div>
          <div className="lg:col-span-4">
            <h3 className="t-label text-[var(--muted)]">Functions and procedures</h3>
            <ul className="mt-4 flex flex-col">
              {routines.map((r) => (
                <li key={r.name} className="flex justify-between gap-4 border-b border-[var(--ink)]/10 py-2 font-body text-sm">
                  <span className="font-mono text-xs">{r.name}</span>
                  <span className="text-[var(--muted)]">{r.type.toLowerCase()}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-4">
            <h3 className="t-label text-[var(--muted)]">Triggers</h3>
            <ul className="mt-4 flex flex-col">
              {triggers.map((t) => (
                <li key={t.name} className="border-b border-[var(--ink)]/10 py-2 font-body text-sm">
                  <span className="font-mono text-xs">{t.name}</span>
                  <span className="block text-xs text-[var(--muted)]">
                    {t.timing.toLowerCase()} {t.event.toLowerCase()} on {t.table_name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="schema-title" className="mt-24">
        <h2 id="schema-title" className="t-display">The schema.</h2>
        <p className="t-body mt-4 max-w-[65ch] text-[var(--muted)]">
          Eight tables in third normal form. Primary keys are underlined; each foreign key names the
          key it points at.
        </p>
        <figure className="mt-10">
          {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG diagram, nothing to optimise */}
          <img
            src="/erd.svg"
            alt="Entity relationship diagram of the eight tables. A branch houses many cars and is the collection point of many deliveries. A user places many bookings and holds many sessions. A car is booked in many bookings. Each booking has exactly one delivery, one or more payments, and many status history rows, each of which may name the user who acted."
            className="w-full max-w-[72rem] border border-[var(--ink)]/15 bg-[var(--color-ground)]"
            width={1440}
            height={900}
          />
          <figcaption className="mt-3 font-body text-xs text-[var(--muted)]">
            Crow&apos;s foot notation. Generated from the schema by npm run build:erd.
          </figcaption>
        </figure>
        <ul className="mt-12 flex flex-col gap-4 font-mono text-xs leading-relaxed md:text-sm">
          {RELATIONAL_SCHEMA.map((t) => (
            <li key={t.table}>
              <span className="font-semibold">{t.table}</span>(
              {t.pk.map((k) => <u key={k}>{k}</u>)}
              {t.columns.map((c) => {
                const fk = t.fks.find((f) => f.column === c);
                return (
                  <span key={c}>
                    , {c}
                    {fk && <span className="text-[var(--accent-text)]"> FK {fk.references}</span>}
                    {t.unique.includes(c) && <span className="text-[var(--muted)]"> UNIQUE</span>}
                  </span>
                );
              })}
              )
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="flow-title" className="mt-24">
        <h2 id="flow-title" className="t-display">Every transaction.</h2>
        <p className="t-body mt-4 max-w-[65ch] text-[var(--muted)]">
          For each one: what the person does, which tables it touches, which SQL or stored program
          runs, what changes in the database, and what they get back.
        </p>
        <ol className="mt-10 flex flex-col">
          {TRANSACTIONS.map((t) => (
            <li key={t.id} className="grid grid-cols-1 gap-6 border-t border-[var(--ink)]/20 py-10 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <h3 className="t-sub text-[clamp(1.5rem,2.2vw,2.25rem)]">{t.operation}</h3>
                <p className="mt-3 font-body text-sm text-[var(--muted)]">{t.where}</p>
                <p className="mt-3 flex flex-wrap gap-2">
                  {t.dml.map((d) => (
                    <span key={d} className="t-label border border-[var(--ink)]/30 px-2 py-1">{d}</span>
                  ))}
                </p>
              </div>
              <dl className="grid grid-cols-1 gap-5 font-body text-sm lg:col-span-8 md:grid-cols-2">
                <div>
                  <dt className="t-label text-[var(--muted)]">Tables</dt>
                  <dd className="mt-1 font-mono text-xs">{t.tables.join(', ')}</dd>
                </div>
                <div>
                  <dt className="t-label text-[var(--muted)]">SQL and stored programs</dt>
                  <dd className="mt-1">
                    <ul className="flex flex-col gap-1 font-mono text-xs">
                      {t.component.map((c) => <li key={c}>{c}</li>)}
                    </ul>
                  </dd>
                </div>
                <div>
                  <dt className="t-label text-[var(--muted)]">How the database changes</dt>
                  <dd className="mt-1">{t.effect}</dd>
                </div>
                <div>
                  <dt className="t-label text-[var(--muted)]">Result</dt>
                  <dd className="mt-1">{t.result}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="try-title" className="mt-24">
        <h2 id="try-title" className="t-display">Try it.</h2>
        <p className="t-body mt-4 max-w-[65ch] text-[var(--muted)]">
          Each panel runs one real statement against the live database and shows the whole path:
          the SQL, the values bound into it, and what came back. Read only.
        </p>
        <div className="mt-10">
          <DatabaseTryIt
            cars={cars.filter((c) => c.is_active === 1).map((c) => ({ id: c.id, name: `${c.brand} ${c.model}` }))}
            branches={branches.map((b) => ({ id: b.id, name: b.name.replace(/^D4Drive /, '') }))}
          />
        </div>
      </section>

      {history && (
        <section aria-labelledby="audit-title" className="mt-24">
          <h2 id="audit-title" className="t-display">What the triggers wrote last.</h2>
          <div className="mt-6">
            <ReportTable report={history} />
          </div>
        </section>
      )}
    </StackPanel>
  );
}
