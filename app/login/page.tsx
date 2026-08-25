import { Suspense } from 'react';
import { AuthForm } from '@/components/sections/AuthForm';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <main className="flex min-h-[100dvh] items-center px-8 py-24 md:px-16">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="grid grid-cols-1 md:grid-cols-12">
          <div className="md:col-span-5 md:col-start-2">
            {/* useSearchParams needs a Suspense boundary or the whole route
                opts out of static rendering with a build-time error. */}
            <Suspense fallback={<div className="h-96" />}>
              <AuthForm />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}
