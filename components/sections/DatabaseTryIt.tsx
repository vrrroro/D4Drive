'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api-client';

interface Option {
  id: number;
  name: string;
}

interface TryResult {
  sql: string;
  params: unknown[];
  rows: Record<string, unknown>[];
  ms: number;
}

const selectClass =
  'h-12 w-full border-b border-[var(--ink)]/40 bg-[var(--color-studio)] px-2 py-2 font-body text-sm text-[var(--ink)] focus:border-[var(--accent-text)] focus:outline-none';
const inputClass = selectClass;
const labelClass = 't-label text-[var(--muted)]';

const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

function show(value: unknown): string {
  if (value === null) return 'NULL';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  return String(value);
}

/**
 * Three live demonstrations of the flow, each showing all of it: the
 * operation, the SQL that runs, the values bound into it, and the rows that
 * come back.
 */
export function DatabaseTryIt({ cars, branches }: { cars: Option[]; branches: Option[] }) {
  return (
    <div className="grid grid-cols-1 gap-16 xl:grid-cols-3 xl:gap-12">
      <TryForm
        title="Is this car free?"
        explain="Calls fn_car_available, the same function sp_create_booking runs under its lock."
        kind="availability"
        fields={(set) => (
          <>
            <label className="flex flex-col gap-2">
              <span className={labelClass}>Car</span>
              <select name="carId" className={selectClass} onChange={set} defaultValue={cars[0]?.id}>
                {cars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className={labelClass}>From</span>
                <input name="startDate" type="date" className={inputClass} defaultValue={iso(1)} onChange={set} />
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelClass}>To</span>
                <input name="endDate" type="date" className={inputClass} defaultValue={iso(3)} onChange={set} />
              </label>
            </div>
          </>
        )}
        initial={{ carId: String(cars[0]?.id ?? ''), startDate: iso(1), endDate: iso(3) }}
      />
      <TryForm
        title="What does collection cost?"
        explain="Calls fn_haversine_km and fn_delivery_fee for a car kept at one branch and collected at another."
        kind="distance"
        fields={(set) => (
          <>
            <label className="flex flex-col gap-2">
              <span className={labelClass}>Car kept at</span>
              <select name="fromBranchId" className={selectClass} onChange={set} defaultValue={branches[0]?.id}>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelClass}>Collected at</span>
              <select name="toBranchId" className={selectClass} onChange={set} defaultValue={branches[2]?.id ?? branches[0]?.id}>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          </>
        )}
        initial={{ fromBranchId: String(branches[0]?.id ?? ''), toBranchId: String(branches[2]?.id ?? branches[0]?.id ?? '') }}
      />
      <TryForm
        title="What happened to this booking?"
        explain="Reads booking_status_log, which only the triggers write."
        kind="history"
        fields={(set) => (
          <label className="flex flex-col gap-2">
            <span className={labelClass}>Booking reference</span>
            <input name="reference" className={`${inputClass} uppercase`} defaultValue="D4P5XJ6LQF" onChange={set} spellCheck={false} />
          </label>
        )}
        initial={{ reference: 'D4P5XJ6LQF' }}
      />
    </div>
  );
}

function TryForm({
  title,
  explain,
  kind,
  fields,
  initial,
}: {
  title: string;
  explain: string;
  kind: string;
  fields: (set: (e: { target: { name: string; value: string } }) => void) => ReactNode;
  initial: Record<string, string>;
}) {
  const [values, setValues] = useState(initial);
  const [result, setResult] = useState<TryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (e: { target: { name: string; value: string } }) =>
    setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  async function run(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({ kind, ...values });
      const response = await apiFetch(`/api/admin/database/try?${params}`);
      const body = (await response.json().catch(() => null)) as (TryResult & { error?: string }) | null;
      if (!response.ok || !body) {
        setError(body?.error ?? 'That did not run.');
        setResult(null);
        return;
      }
      setResult(body);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  const columns = result?.rows[0] ? Object.keys(result.rows[0]) : [];

  return (
    <form onSubmit={run} className="flex flex-col gap-6 border-t border-[var(--ink)]/20 pt-8">
      <div>
        <h3 className="t-sub text-[clamp(1.5rem,2vw,2rem)]">{title}</h3>
        <p className="mt-2 font-body text-sm text-[var(--muted)]">{explain}</p>
      </div>
      {fields(set)}
      <Button type="submit" loading={busy} className="self-start">
        Run it
      </Button>

      <div aria-live="polite" className="flex flex-col gap-4">
        {error && <p className="font-body text-sm text-[var(--accent-text)]">{error}</p>}
        {result && (
          <>
            <div>
              <p className={labelClass}>SQL sent</p>
              <pre className="mt-2 overflow-x-auto bg-[var(--color-ink)] p-4 font-mono text-xs leading-relaxed text-[var(--color-blush)]">
                <code>{result.sql}</code>
              </pre>
              <p className="mt-2 font-body text-xs text-[var(--muted)]">
                Bound values: {result.params.map((p) => JSON.stringify(p)).join(', ')}. Answered in {result.ms} ms.
              </p>
            </div>
            <div>
              <p className={labelClass}>Result</p>
              {result.rows.length === 0 ? (
                <p className="mt-2 font-body text-sm">No rows.</p>
              ) : (
                <table className="mt-2 w-full border-collapse font-body text-sm">
                  <thead>
                    <tr>
                      {columns.map((c) => (
                        <th key={c} scope="col" className="t-label border-b border-[var(--ink)]/30 pb-1 pr-4 text-left text-[var(--muted)]">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i} className="border-b border-[var(--ink)]/10">
                        {columns.map((c) => <td key={c} className="py-1 pr-4 align-top">{show(row[c])}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </form>
  );
}
