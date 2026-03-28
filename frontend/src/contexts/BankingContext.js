'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { bankingService } from '../services/bankingService';

const BankingContext = createContext();

const MAX_ACCOUNTS = 2;

export function BankingProvider({ children }) {
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [banks, setBanks] = useState([]);

  // Load from LocalStorage once on mount
  useEffect(() => {
    const saved = localStorage.getItem('linked_accounts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setLinkedAccounts(parsed);
        }
      } catch (e) {
        console.error('Failed to parse linked accounts', e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save to LocalStorage ONLY after initialization and when data changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('linked_accounts', JSON.stringify(linkedAccounts));
    }
  }, [linkedAccounts, isInitialized]);

  const fetchBanks = useCallback(async (country = 'FI') => {
    setLoading(true);
    try {
      const data = await bankingService.getAspsps(country);
      setBanks(data.aspsps || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addAccount = useCallback((account, sessionId, bankName) => {
    const displayId = typeof account.account_id === 'object'
      ? (account.account_id.iban || account.account_id.other)
      : account.account_id;

    const accUid = account.uid || account.id || displayId;

    const newAccount = {
      uid: accUid,
      displayId,
      name: typeof account.name === 'object' ? (account.name.name || account.name.id) : (account.name || 'Account'),
      currency: typeof account.currency === 'object' ? account.currency.code : (account.currency || 'EUR'),
      sessionId,
      bankName,
      addedAt: new Date().toISOString()
    };

    setLinkedAccounts(prev => {
      // Enforce max accounts limit
      const existingIdx = prev.findIndex(
        a => (accUid && a.uid === accUid) || (displayId && a.displayId === displayId)
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], sessionId };
        return updated;
      }
      // Block if limit reached
      if (prev.length >= MAX_ACCOUNTS) {
        console.warn(`Max accounts limit (${MAX_ACCOUNTS}) reached`);
        return prev;
      }
      return [...prev, newAccount];
    });
  }, []);

  // Toggle: add if not linked, remove if already linked
  const toggleAccount = useCallback((account, sessionId, bankName) => {
    const displayId = typeof account.account_id === 'object'
      ? (account.account_id.iban || account.account_id.other)
      : account.account_id;

    const accUid = account.uid || account.id || displayId;

    setLinkedAccounts(prev => {
      const existingIdx = prev.findIndex(
        a => (accUid && a.uid === accUid) || (displayId && a.displayId === displayId)
      );

      if (existingIdx > -1) {
        // Already linked → remove it
        return prev.filter((_, i) => i !== existingIdx);
      }

      // Block if limit reached
      if (prev.length >= MAX_ACCOUNTS) {
        console.warn(`Max accounts limit (${MAX_ACCOUNTS}) reached`);
        return prev;
      }

      return [...prev, {
        uid: accUid,
        displayId,
        name: typeof account.name === 'object' ? (account.name.name || account.name.id) : (account.name || 'Account'),
        currency: typeof account.currency === 'object' ? account.currency.code : (account.currency || 'EUR'),
        sessionId,
        bankName,
        addedAt: new Date().toISOString()
      }];
    });
  }, []);

  const removeAccount = useCallback((uid) => {
    setLinkedAccounts(prev => prev.filter(a => a.uid !== uid));
  }, []);

  const value = {
    linkedAccounts,
    maxAccounts: MAX_ACCOUNTS,
    addAccount,
    toggleAccount,
    removeAccount,
    loading,
    setLoading,
    error,
    setError,
    banks,
    fetchBanks
  };

  return (
    <BankingContext.Provider value={value}>
      {children}
    </BankingContext.Provider>
  );
}

export const useBankingContext = () => {
  const context = useContext(BankingContext);
  if (!context) throw new Error('useBankingContext must be used within a BankingProvider');
  return context;
};
