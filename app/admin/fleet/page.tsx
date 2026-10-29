import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { StackPanel } from '@/components/motion/StackPanel';
import { getSession } from '@/lib/auth/guards';
import { listAllCars, listBranches } from '@/lib/services/admin';
import { FleetManager } from '@/components/sections/FleetManager';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Fleet admin' };

export default async function AdminFleetPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin/fleet');
  if (session.role !== 'admin') redirect('/');

  const [cars, branches] = await Promise.all([listAllCars(), listBranches()]);

  return (
    <StackPanel tone="studio" className="panel min-h-[100dvh] pt-[calc(var(--header-h)+clamp(2rem,4vw,4rem))]" aria-labelledby="fleet-admin-title">
        <Link href="/admin" className="keycap t-label">
          <ArrowLeft aria-hidden className="h-4 w-4" strokeWidth={1.5} />
          Operations
        </Link>

        <h1 id="fleet-admin-title" className="t-mega mt-12">
          The <span className="italic-safe inline-block italic">fleet</span>.
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
    </StackPanel>
  );
}
