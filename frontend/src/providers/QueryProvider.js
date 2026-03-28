'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function QueryProvider({ children }) {
  // Create QueryClient inside useState so it's stable per render
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,   // 5 minutes — data is fresh, no refetch
        gcTime:    10 * 60 * 1000,  // 10 minutes — keep in cache after unused
        retry: 1,
        refetchOnWindowFocus: false, // Don't refetch when tab regains focus
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
