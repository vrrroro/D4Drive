'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import type { CarFilterInput } from '@/lib/validation/schemas';

interface CarFiltersProps {
  brands: string[];
  current: CarFilterInput;
}

/**
 * Catalog filters.
 *
 * Writes to the URL rather than to local state, so the server re-queries and
 * the filtered view stays linkable. This is the only client component on the
 * catalog page.
 */
export function CarFilters({ brands, current }: CarFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Any filter change invalidates the current page number.
      params.delete('page');
      router.push(`/cars?${params.toString()}`);
    },
    [router, searchParams],
  );

  const selectClass =
    'h-12 w-full border-b border-[var(--ink)]/40 bg-transparent px-0 py-2 font-body text-sm text-[var(--ink)] transition-colors duration-500 focus:border-[var(--color-carmine)] focus:outline-none';

  const labelClass =
    'font-body text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]';

  return (
    <section
      aria-label="Filter the fleet"
      className="mt-20 grid grid-cols-1 gap-8 border-t border-[var(--ink)] pt-10 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="filter-brand" className={labelClass}>
          Brand
        </label>
        <select
          id="filter-brand"
          className={selectClass}
          value={current.brand ?? ''}
          onChange={(e) => update('brand', e.target.value)}
        >
          <option value="">Any brand</option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="filter-fuel" className={labelClass}>
          Fuel
        </label>
        <select
          id="filter-fuel"
          className={selectClass}
          value={current.fuel ?? ''}
          onChange={(e) => update('fuel', e.target.value)}
        >
          <option value="">Any fuel</option>
          <option value="petrol">Petrol</option>
          <option value="diesel">Diesel</option>
          <option value="electric">Electric</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="filter-seats" className={labelClass}>
          Seats
        </label>
        <select
          id="filter-seats"
          className={selectClass}
          value={current.seats?.toString() ?? ''}
          onChange={(e) => update('seats', e.target.value)}
        >
          <option value="">Any size</option>
          <option value="4">4 seats</option>
          <option value="5">5 seats</option>
          <option value="7">7 seats</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="filter-sort" className={labelClass}>
          Sort
        </label>
        <select
          id="filter-sort"
          className={selectClass}
          value={current.sort}
          onChange={(e) => update('sort', e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="price_asc">Price, low to high</option>
          <option value="price_desc">Price, high to low</option>
          <option value="seats">Seats, fewest first</option>
        </select>
      </div>
    </section>
  );
}
