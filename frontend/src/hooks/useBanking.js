import { useState, useCallback } from 'react';
import { bankingService } from '../services/bankingService';

/**
 * useBanking hook follows the Single Responsibility Principle (managing state and business flow)
 * and keeps the UI components "clean".
 */
export function useBanking() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [banks, setBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const fetchBanks = useCallback(async (country = 'FI') => {
    setLoading(true);
    setError(null);
    try {
      const data = await bankingService.getAspsps(country);
      setBanks(data.aspsps || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const startAuth = useCallback(async (aspsp) => {
    setLoading(true);
    setError(null);
    try {
      const data = await bankingService.getAuthUrl({ aspsp, psu_type: 'personal' });
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No redirect URL was returned.');
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  const exchangeCode = useCallback(async (code) => {
    setLoading(true);
    setError(null);
    try {
      const data = await bankingService.exchangeCode(code);
      setSession(data);
      // Clear URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async (accountId) => {
    if (!session?.session_id) return;
    setLoading(true);
    setError(null);
    setSelectedAccount(accountId);
    try {
      const data = await bankingService.getTransactions(accountId, session.session_id);
      setTransactions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  return {
    loading,
    error,
    session,
    banks,
    selectedBank,
    selectedAccount,
    transactions,
    fetchBanks,
    setSelectedBank,
    startAuth,
    exchangeCode,
    fetchTransactions,
  };
}
