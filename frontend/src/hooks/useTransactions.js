'use client';

import { useQuery } from '@tanstack/react-query';
import { bankingService } from '../services/bankingService';

const STALE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch transactions for a single account, cached by React Query.
 * Cache key includes both accountId and sessionId so a new session
 * (re-authentication) automatically invalidates the old cached data.
 */
export function useAccountTransactions(account) {
  return useQuery({
    queryKey: ['transactions', account.uid, account.sessionId],
    queryFn: () => bankingService.getTransactions(account.uid, account.sessionId),
    enabled: Boolean(account.uid && account.sessionId),
    staleTime: STALE_MS,
    select: (data) => Array.isArray(data) ? data : [],
  });
}

/**
 * Fetch transactions for ALL linked accounts in parallel.
 * Returns a map: { [uid]: Transaction[] } plus aggregate loading/error state.
 */
export function useAllAccountTransactions(accounts) {
  // We can't call hooks inside a map, so we use a single query that
  // fetches all accounts concurrently via Promise.all.
  const uids = accounts.map(a => a.uid);
  const sessionIds = accounts.map(a => a.sessionId);

  return useQuery({
    queryKey: ['all-transactions', uids, sessionIds],
    queryFn: async () => {
      const results = {};
      await Promise.all(accounts.map(async (acc) => {
        try {
          const txs = await bankingService.getTransactions(acc.uid, acc.sessionId);
          const list = Array.isArray(txs) ? txs : [];
          // Debug: log first transaction to verify field names from this bank
          if (list.length > 0) {
            console.log(`[${acc.name}] Sample tx:`, list[0]);
          }
          results[acc.uid] = list;
        } catch (e) {
          console.error(`Failed to fetch transactions for ${acc.name}:`, e.message);
          results[acc.uid] = [];
        }
      }));
      return results;
    },
    enabled: accounts.length > 0,
    staleTime: STALE_MS,
  });
}
