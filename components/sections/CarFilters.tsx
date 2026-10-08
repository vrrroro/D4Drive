'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, type ReactNode } from 'react';
import type { CarFilterInput } from '@/lib/validation/schemas';

interface CarFiltersProps {
  brands: string[];
  current: CarFilterInput;
}

/**
 * Catalog filters.
 *
 * Writes to the URL rather than to local state, so the server re-queries in
 * SQL and the filtered view stays linkable, refreshable, and works with the
 * back button.
 */
export function CarFilters({ brands, current }: CarFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      // Any filter change invalidates the current page number.
      params.delete('page');
      const query = params.toString();
      router.push(query ? `/cars?${query}` : '/cars', { scroll: false });
    },
    [router, searchParams],
  );

  const filtered = Boolean(current.brand || current.fuel || current.seats || current.transmission);

  return (
    <section aria-label="Filter the fleet" className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-5 lg:items-end">
      <Select id="filter-brand" label="Brand" value={current.brand ?? ''} onChange={(v) => update('brand', v)}>
        <option value="">Any brand</option>
        {brands.map((brand) => (
          <option key={brand} value={brand}>
            {brand}
          </option>
        ))}
      </Select>

      <Select id="filter-fuel" label="Fuel" value={current.fuel ?? ''} onChange={(v) => update('fuel', v)}>
        <option value="">Any fuel</option>
        <option value="petrol">Petrol</option>
        <option value="diesel">Diesel</option>
        <option value="electric">Electric</option>
        <option value="hybrid">Hybrid</option>
      </Select>

      <Select id="filter-seats" label="Seats" value={current.seats?.toString() ?? ''} onChange={(v) => update('seats', v)}>
        <option value="">Any size</option>
        <option value="4">4 seats</option>
        <option value="5">5 seats</option>
        <option value="7">7 seats</option>
      </Select>

      <Select id="filter-sort" label="Sort" value={current.sort} onChange={(v) => update('sort', v)}>
        <option value="newest">Newest first</option>
        <option value="price_asc">Price, low to high</option>
        <option value="price_desc">Price, high to low</option>
        <option value="seats">Seats, fewest first</option>
      </Select>

      <div className="col-span-2 lg:col-span-1">
        {filtered && (
          <Link href="/cars" scroll={false} className="keycap t-label text-[var(--ink)]">
            Clear filters
          </Link>
        )}
      </div>
    </section>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="t-label text-[var(--muted)]">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full appearance-none border-b border-[var(--ink)]/40 bg-transparent pr-8 font-display text-lg font-light text-[var(--ink)] transition-colors duration-300 focus:border-[var(--accent-text)] focus:outline-none"
        >
          {children}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" strokeWidth={1.5} />
      </div>
    </div>
  );
}
