import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/guards';
import { listAllCars, listBranches } from '@/lib/services/admin';
import { FleetManager } from '@/components/sections/FleetManager';

export const dynamic = 'force-dynamic';

export default async function AdminFleetPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin/fleet');
  if (session.role !== 'admin') redirect('/');

  const [cars, branches] = await Promise.all([listAllCars(), listBranches()]);

  return (
    <main className="px-8 pt-24 pb-20 md:px-16 md:pb-32">
      <div className="mx-auto w-full max-w-[1600px]">
        <Link href="/admin" className="font-body text-[10px] uppercase tracking-[0.25em] text-[var(--muted)] transition-colors duration-500 hover:text-[var(--accent-text)]">
          Operations
        </Link>

        <h1 className="font-display mt-8 text-4xl leading-[0.95] text-[var(--ink)] md:text-6xl">
          The{' '}
          <span className="italic-safe inline-block font-display italic text-[var(--accent-text)]">
            fleet
          </span>
        </h1>

        <FleetManager
          cars={cars.map((c) => ({
            id: c.id,
            branchId: c.branch_id,
            branchName: c.branch_name,
            brand: c.brand,
            model: c.model,
            year: c.year,
            registrationNo: c.registration_no,
            fuelType: c.fuel_type,
            transmission: c.transmission,
            seats: c.seats,
            pricePerDay: c.price_per_day,
            imageUrl: c.image_url,
            description: c.description,
            isActive: c.is_active === 1,
          }))}
          branches={branches.map((b) => ({ id: b.id, name: b.name, city: b.city }))}
        />
      </div>
    </main>
  );
}
