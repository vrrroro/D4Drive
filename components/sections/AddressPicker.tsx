'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { CircleMarker, LeafletMouseEvent, Map as LeafletMap, Polyline } from 'leaflet';
import { LocateFixed, Search } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

export interface Place {
  label: string;
  latitude: number;
  longitude: number;
  addressLine: string;
  city: string;
  pincode: string | null;
}

interface AddressPickerProps {
  /** The car's branch: the map starts there and the line runs from it. */
  branch: { name: string; latitude: number; longitude: number };
  value: Place | null;
  onChange: (place: Place) => void;
}

const INK = '#1a1a1a';
const CARMINE = '#a82519';

/**
 * Choose the delivery address by searching for it or by pointing at it.
 *
 * Search goes to our own /api/geocode (OpenStreetMap's Nominatim behind it);
 * a click on the map, or "use my location", drops the pin there and looks up
 * the address at that point. The map is Leaflet over OpenStreetMap tiles,
 * loaded only when a visitor picks doorstep delivery. The parent works out
 * the distance and fee from the pin; nobody types a latitude.
 */
export function AddressPicker({ branch, value, onChange }: AddressPickerProps) {
  const listId = useId();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const pinRef = useRef<CircleMarker | null>(null);
  const lineRef = useRef<Polyline | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Set when the box is filled in by a choice rather than typed into, so the
  // chosen label does not set off a search of its own.
  const settled = useRef(false);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mapFailed, setMapFailed] = useState(false);

  // The map, created once. Leaflet needs `window`, so it is imported here.
  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;
    void import('leaflet')
      .then((L) => {
        if (cancelled || !mapEl.current) return;
        map = L.map(mapEl.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView(
          [branch.latitude, branch.longitude],
          13,
        );
        const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        });
        let failures = 0;
        tiles.on('tileerror', () => {
          failures += 1;
          if (failures > 6) setMapFailed(true);
        });
        tiles.addTo(map);
        L.circleMarker([branch.latitude, branch.longitude], {
          radius: 7,
          color: INK,
          weight: 2,
          fillColor: '#f9f8f6',
          fillOpacity: 1,
        })
          .bindTooltip(branch.name, { direction: 'top', offset: [0, -6] })
          .addTo(map);
        map.on('click', (event: LeafletMouseEvent) => {
          void pinAt(event.latlng.lat, event.latlng.lng);
        });
        mapRef.current = map;
      })
      .catch(() => setMapFailed(true));
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      pinRef.current = null;
      lineRef.current = null;
    };
    // The branch is fixed for the life of the checkout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the pin and the line from the branch in step with the chosen place.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !value) return;
    void import('leaflet').then((L) => {
      const at: [number, number] = [value.latitude, value.longitude];
      if (!pinRef.current) {
        pinRef.current = L.circleMarker(at, { radius: 9, color: CARMINE, weight: 3, fillColor: CARMINE, fillOpacity: 0.85 }).addTo(map);
      } else {
        pinRef.current.setLatLng(at);
      }
      const from: [number, number] = [branch.latitude, branch.longitude];
      if (!lineRef.current) {
        lineRef.current = L.polyline([from, at], { color: CARMINE, weight: 2, dashArray: '6 6', opacity: 0.8 }).addTo(map);
      } else {
        lineRef.current.setLatLngs([from, at]);
      }
      map.fitBounds(L.latLngBounds([from, at]).pad(0.35), { maxZoom: 16, animate: true });
    });
  }, [value, branch.latitude, branch.longitude]);

  // Search as the visitor types, after a pause.
  useEffect(() => {
    const q = query.trim();
    if (settled.current) {
      settled.current = false;
      return undefined;
    }
    if (q.length < 3) {
      setResults([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setBusy(true);
      try {
        const response = await apiFetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const body = (await response.json().catch(() => null)) as { places?: Place[]; error?: string } | null;
        if (!response.ok) {
          setMessage(body?.error ?? 'Address search is unavailable right now.');
          setResults([]);
          return;
        }
        setMessage(body?.places?.length ? null : 'Nothing in Bengaluru matches that. Try a street or an area.');
        setResults(body?.places ?? []);
        setActive(-1);
        setOpen(true);
      } catch {
        if (!controller.signal.aborted) setMessage('Address search is unavailable right now.');
      } finally {
        setBusy(false);
      }
    }, 550);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  function choose(place: Place) {
    onChangeRef.current(place);
    settled.current = true;
    setQuery(place.label);
    setOpen(false);
    setResults([]);
    setMessage(null);
  }

  async function pinAt(latitude: number, longitude: number) {
    setMessage('Finding that address...');
    try {
      const response = await apiFetch(`/api/geocode?lat=${latitude.toFixed(6)}&lon=${longitude.toFixed(6)}`);
      const body = (await response.json().catch(() => null)) as { place?: Place | null; error?: string } | null;
      const place: Place = body?.place ?? {
        label: 'Pinned on the map',
        latitude,
        longitude,
        addressLine: '',
        city: 'Bengaluru',
        pincode: null,
      };
      onChangeRef.current({ ...place, latitude, longitude });
      settled.current = true;
      setQuery(place.label);
      setMessage(response.ok ? null : 'The pin is set. Type the address below; the lookup did not answer.');
    } catch {
      onChangeRef.current({ label: 'Pinned on the map', latitude, longitude, addressLine: '', city: 'Bengaluru', pincode: null });
      setMessage('The pin is set. Type the address below; the lookup did not answer.');
    }
  }

  function locate() {
    if (!('geolocation' in navigator)) {
      setMessage('This browser cannot share its location.');
      return;
    }
    setMessage('Asking for your location...');
    navigator.geolocation.getCurrentPosition(
      (position) => void pinAt(position.coords.latitude, position.coords.longitude),
      () => setMessage('Your location was not shared. Search for the address instead.'),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      choose(results[active]!);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={`${listId}-q`} className="t-label text-[var(--muted)]">
        Delivery address
      </label>
      <div className="relative">
        <div className="flex items-center gap-3 border-b border-[var(--ink)]/40 focus-within:border-[var(--accent-text)]">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-[var(--muted)]" strokeWidth={1.5} />
          <input
            id={`${listId}-q`}
            type="search"
            role="combobox"
            aria-expanded={open && results.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
            value={query}
            onChange={(e) => {
              settled.current = false;
              setQuery(e.target.value);
              setOpen(true);
            }}
            onKeyDown={onKeyDown}
            onFocus={() => results.length > 0 && setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            className="h-12 w-full bg-transparent font-display text-[clamp(1.1rem,1.4vw,1.35rem)] font-light text-[var(--ink)] focus:outline-none"
          />
          <button
            type="button"
            onClick={locate}
            className="keycap t-label shrink-0 whitespace-nowrap px-3 py-2"
          >
            <LocateFixed aria-hidden className="h-4 w-4" strokeWidth={1.5} />
            Use my location
          </button>
        </div>
        {open && results.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Matching addresses"
            className="absolute inset-x-0 top-full z-[500] max-h-64 overflow-y-auto border border-[var(--ink)]/15 bg-[var(--select-bg)] shadow-[var(--shadow-glass)]"
          >
            {results.map((place, i) => (
              <li
                key={`${place.latitude},${place.longitude},${i}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(place);
                }}
                className={`cursor-pointer px-4 py-3 font-body text-sm transition-colors ${
                  i === active ? 'bg-[var(--color-carmine)] text-[var(--color-paper)]' : 'hover:bg-[var(--color-carmine)] hover:text-[var(--color-paper)]'
                }`}
              >
                {place.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p aria-live="polite" className="min-h-[1.125rem] font-body text-xs text-[var(--muted)]">
        {busy ? 'Searching...' : message ?? 'Search for the address, or tap the map where the car should come.'}
      </p>

      <div className="address-map relative">
        <div ref={mapEl} className="h-[clamp(13rem,30dvh,17rem)] w-full" role="application" aria-label="Map. Tap to place the delivery pin." />
        {mapFailed && (
          <p className="absolute inset-0 grid place-items-center bg-[var(--studio)] p-6 text-center font-body text-sm text-[var(--muted)]">
            The map could not load. Search for the address above instead.
          </p>
        )}
      </div>
    </div>
  );
}
