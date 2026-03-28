'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function HomeRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    if (code || error) {
      // OAuth callback — forward to /setting with all query params
      router.replace('/setting?' + searchParams.toString());
    } else {
      router.replace('/dashboard');
    }
  }, [router, searchParams]);

  return null;
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeRedirect />
    </Suspense>
  );
}
