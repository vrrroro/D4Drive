'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { readCsrfToken } from '@/lib/csrf';
import { formatCurrency } from '@/lib/services/pricing';

interface Car {
  id: number;
  branchId: number;
  branchName: string;
  brand: string;
  model: string;
  year: number;
  registrationNo: string;
  fuelType: string;
  transmission: string;
  seats: number;
  pricePerDay: string;
  isActive: boolean;
}

interface Branch {
  id: number;
  name: string;
  city: string;
}

export function FleetManager({ cars, branches }: { cars: Car[]; branches: Branch[] }) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();

  const [editing, setEditing] = useState<Car | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});

  const open = creating || editing !== null;

  function close() {
    setCreating(false);
    setEditing(null);
    setFields({});
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setFields({});

    const data = new FormData(event.currentTarget);
    const payload = {
      branchId: Number(data.get('branchId')),
      brand: String(data.get('brand') ?? ''),
      model: String(data.get('model') ?? ''),
      year: Number(data.get('year')),
      registrationNo: String(data.get('registrationNo') ?? ''),
      fuelType: String(data.get('fuelType') ?? ''),
      transmission: String(data.get('transmission') ?? ''),
      seats: Number(data.get('seats')),
      pricePerDay: Number(data.get('pricePerDay')),
      imageUrl: String(data.get('imageUrl') ?? ''),
      description: String(data.get('description') ?? ''),
      isActive: data.get('isActive') === 'on',
    };

    const url = editing ? `/api/admin/cars/${editing.id}` : '/api/admin/cars';

    try {
      const response = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': readCsrfToken() },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        fields?: Record<string, string>;
      };

      if (!response.ok) {
        if (body.fields) setFields(body.fields);
        toast.show(body.error ?? 'That could not be saved.', 'error');
        setSubmitting(false);
        return;
      }

      toast.show(editing ? 'Car updated.' : 'Car added.', 'success');
      close();
      startTransition(() => router.refresh());
    } catch {
      toast.show('Could not reach the server.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function deactivate(car: Car) {
    try {
      const response = await fetch(`/api/admin/cars/${car.id}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': readCsrfToken() },
      });

      if (!response.ok) {
        toast.show('That car could not be withdrawn.', 'error');
        return;
      }

      toast.show(`${car.brand} ${car.model} withdrawn from the fleet.`, 'success');
      startTransition(() => router.refresh());
    } catch {
      toast.show('Could not reach the server.', 'error');
    }
  }

  const selectClass =
    'h-12 w-full border-b border-[var(--ink)]/40 bg-transparent px-0 py-2 font-body text-sm text-[var(--ink)] transition-colors duration-500 focus:border-[var(--color-carmine)] focus:outline-none';
  const labelClass = 'font-body text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]';

  return (
    <>
      <div className="mt-10">
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
          Add a car
        </Button>
      </div>

      {open && (
        <section className="mt-12 border-t-4 border-t-[var(--color-carmine)] bg-[var(--surface)] p-8 md:p-12">
          <h2 className="font-display text-2xl text-[var(--ink)]">
            {editing ? `${editing.brand} ${editing.model}` : 'New car'}
          </h2>

          <form onSubmit={handleSubmit} className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2" noValidate>
            <Field label="Brand" name="brand" defaultValue={editing?.brand} error={fields.brand} required />
            <Field label="Model" name="model" defaultValue={editing?.model} error={fields.model} required />
            <Field label="Year" name="year" type="number" defaultValue={editing?.year ?? 2024} error={fields.year} required />
            <Field label="Registration" name="registrationNo" defaultValue={editing?.registrationNo} error={fields.registrationNo} required />

            <div className="flex flex-col gap-2">
              <label htmlFor="fleet-branch" className={labelClass}>Branch</label>
              <select id="fleet-branch" name="branchId" className={selectClass} defaultValue={editing?.branchId}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="fleet-fuel" className={labelClass}>Fuel</label>
              <select id="fleet-fuel" name="fuelType" className={selectClass} defaultValue={editing?.fuelType ?? 'petrol'}>
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
                <option value="electric">Electric</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="fleet-transmission" className={labelClass}>Transmission</label>
              <select id="fleet-transmission" name="transmission" className={selectClass} defaultValue={editing?.transmission ?? 'manual'}>
                <option value="manual">Manual</option>
                <option value="automatic">Automatic</option>
              </select>
            </div>

            <Field label="Seats" name="seats" type="number" min={2} max={9} defaultValue={editing?.seats ?? 5} error={fields.seats} required />
            <Field label="Price per day" name="pricePerDay" type="number" step="1" defaultValue={editing?.pricePerDay} error={fields.pricePerDay} required />
            <Field label="Image URL" name="imageUrl" type="url" placeholder="https://" error={fields.imageUrl} />

            <div className="sm:col-span-2">
              <Field label="Description" name="description" placeholder="One or two lines a renter would find useful." error={fields.description} />
            </div>

            <label className="flex items-center gap-3 sm:col-span-2">
              <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} className="h-4 w-4 accent-[var(--color-carmine)]" />
              <span className="font-body text-sm text-[var(--ink)]">Available for booking</span>
            </label>

            <div className="flex gap-4 sm:col-span-2">
              <Button type="submit" loading={submitting}>{editing ? 'Save changes' : 'Add car'}</Button>
              <Button type="button" variant="secondary" onClick={close}>Cancel</Button>
            </div>
          </form>
        </section>
      )}

      <section className="mt-16 flex flex-col gap-px bg-[var(--ink)]/15">
        {cars.map((car) => (
          <article key={car.id} className="grid grid-cols-1 gap-6 bg-[var(--ground)] p-8 md:grid-cols-12 md:items-center md:p-10">
            <div className="md:col-span-4">
              <h3 className={`font-display text-xl ${car.isActive ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}>
                {car.brand} {car.model}
              </h3>
              <p className="mt-2 font-body text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]">
                {car.registrationNo}
              </p>
            </div>

            <div className="md:col-span-3">
              <p className="font-body text-xs capitalize text-[var(--muted)]">
                {car.year} / {car.fuelType} / {car.seats} seats
              </p>
              <p className="mt-1 font-body text-xs text-[var(--muted)]">{car.branchName}</p>
            </div>

            <div className="md:col-span-2">
              <p className="font-body text-sm text-[var(--ink)]">
                {formatCurrency(Number(car.pricePerDay))}
              </p>
              {!car.isActive && (
                <p className="mt-1 font-body text-xs text-[var(--color-carmine)]">Withdrawn</p>
              )}
            </div>

            <div className="flex gap-4 md:col-span-3 md:justify-end">
              <button
                type="button"
                onClick={() => { setEditing(car); setCreating(false); }}
                className="font-body text-[10px] uppercase tracking-[0.2em] text-[var(--ink)] underline underline-offset-8 transition-colors duration-500 hover:text-[var(--color-carmine)]"
              >
                Edit
              </button>
              {car.isActive && (
                <button
                  type="button"
                  onClick={() => deactivate(car)}
                  className="font-body text-[10px] uppercase tracking-[0.2em] text-[var(--color-carmine)] underline underline-offset-8 transition-colors duration-500 hover:text-[var(--ink)]"
                >
                  Withdraw
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
