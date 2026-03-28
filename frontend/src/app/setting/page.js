'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useBankingContext } from '../../contexts/BankingContext';
import { bankingService } from '../../services/bankingService';
import { BankSelector, ConnectBankButton, AccountList } from '../../components/BankingComponents';
import { Trash2, Plus, CheckCircle2, Loader2 } from 'lucide-react';

const SESSION_STORAGE_KEY = 'setting_session';
const BANK_NAME_KEY = 'setting_bank_name';

function SettingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    linkedAccounts,
    maxAccounts,
    toggleAccount,
    removeAccount,
    banks,
    fetchBanks,
    error: globalError
  } = useBankingContext();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // session = { session_id, accounts[] } — persisted in sessionStorage so it survives URL cleanup
  const [session, setSession] = useState(null);
  const [selectedBank, setSelectedBank] = useState(null);
  const [bankName, setBankName] = useState('Bank');
  const [toast, setToast] = useState(null);

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Load banks list
  useEffect(() => {
    fetchBanks('FI');
  }, [fetchBanks]);

  // Restore session from sessionStorage on mount (survives URL change)
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      try {
        setSession(JSON.parse(saved));
      } catch (e) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
    // Restore bank name from before the OAuth redirect
    const savedBankName = sessionStorage.getItem(BANK_NAME_KEY);
    if (savedBankName) setBankName(savedBankName);
  }, []);

  const processedCodeRef = useRef(null);

  // Handle OAuth callback code — must watch searchParams (not [] deps)
  useEffect(() => {
    const code = searchParams.get('code');
    if (!code || code === processedCodeRef.current) return;

    // Mark as processed to avoid running twice (React strict mode)
    processedCodeRef.current = code;

    async function handleCode() {
      setLoading(true);
      setError(null);
      try {
        const data = await bankingService.exchangeCode(code);
        console.log('Session from bank:', data);
        setSession(data);
        // Persist session so it survives the URL cleanup navigation
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
      } catch (err) {
        console.error('Exchange code failed:', err);
        setError(err.message || 'Failed to complete authentication');
      } finally {
        setLoading(false);
        // Clean URL AFTER session is saved
        router.replace('/setting');
      }
    }

    handleCode();
  }, [searchParams, router]);

  const handleSelectBank = (bank) => {
    setSelectedBank(bank);
    setBankName(bank.name);
  };

  const handleStartAuth = async (bank) => {
    setLoading(true);
    setError(null);
    try {
      const data = await bankingService.getAuthUrl({ aspsp: bank, psu_type: 'personal' });
      if (data.url) {
        // Save bank name before navigating away so we can restore it after redirect
        sessionStorage.setItem(BANK_NAME_KEY, bank.name);
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        setSession(null);
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err.message || 'Failed to start authentication');
      setLoading(false);
    }
  };

  const handleAddAccount = (account) => {
    if (!session?.session_id) {
      console.error('No session available to link account');
      return;
    }
    // toggleAccount: adds if not linked, removes if already linked
    toggleAccount(account, session.session_id, bankName);
  };

  const clearSession = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(BANK_NAME_KEY);
    setSession(null);
    setSelectedBank(null);
    setBankName('Bank');
  };

  const isAtLimit = linkedAccounts.length >= maxAccounts;

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontFamily: 'Space Grotesk', fontSize: '30px', fontWeight: '700', margin: '0 0 4px',
          background: 'linear-gradient(90deg, #f8fafc, #94a3b8)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>Settings</h2>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Manage your linked bank accounts and data sources.</p>
      </header>

      {(error || globalError) && (
        <div style={{ padding: '16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: '#fca5a5', marginBottom: '24px' }}>
          {error || globalError}
        </div>
      )}

      {/* Linked Accounts Section */}
      <section style={{
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '32px',
        marginBottom: '40px'
      }}>
        <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          Linked Accounts ({linkedAccounts.length})
        </h3>

        {linkedAccounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', border: '2px dashed rgba(255,255,255,0.05)', borderRadius: '16px' }}>
            No accounts linked yet. Use the section below to connect your first bank.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            {linkedAccounts.map((acc) => (
              <div key={acc.uid} style={{
                padding: '16px 20px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: '600', color: '#f1f5f9' }}>{acc.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{acc.bankName} • {acc.displayId}</div>
                  </div>
                </div>
                <button
                  onClick={() => removeAccount(acc.uid)}
                  style={{
                    padding: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f87171',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add New Bank Section */}
      <section style={{
        backgroundColor: 'rgba(30, 41, 59, 0.3)',
        borderRadius: '24px',
        border: `1px solid ${isAtLimit ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
        padding: '32px'
      }}>
        <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <Plus size={20} color={isAtLimit ? '#f59e0b' : '#10b981'} />
          Connect New Bank
          <span style={{
            marginLeft: 'auto', fontSize: '12px', padding: '3px 10px', borderRadius: '20px',
            background: isAtLimit ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.1)',
            color: isAtLimit ? '#f59e0b' : '#10b981', fontWeight: '600'
          }}>
            {linkedAccounts.length} / {maxAccounts}
          </span>
        </h3>

        {isAtLimit ? (
          <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔒</div>
            <div style={{ color: '#fbbf24', fontWeight: '600', marginBottom: '4px' }}>
              Account limit reached ({maxAccounts}/{maxAccounts})
            </div>
            <div style={{ color: '#94a3b8', fontSize: '13px' }}>
              Remove an account from the list above to add a new one.
            </div>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8', padding: '20px 0' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            Completing authentication...
          </div>
        ) : !session ? (
          <>
            <BankSelector
              banks={banks}
              onSelect={handleSelectBank}
              loading={banks.length === 0}
            />
            {selectedBank && (
              <div style={{ marginTop: '24px' }}>
                <ConnectBankButton
                  onClick={() => handleStartAuth(selectedBank)}
                  loading={loading}
                  label={`Auth with ${selectedBank.name}`}
                />
              </div>
            )}
          </>
        ) : (
          <div>
            <div style={{ padding: '16px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 color="#10b981" />
              <div>
                <div style={{ fontWeight: '600', color: '#34d399' }}>Bank Authenticated!</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Click accounts below to add them to your dashboard.</div>
              </div>
            </div>

            {(() => {
              const linkedIds = new Set([
                ...linkedAccounts.map(a => a.uid).filter(Boolean),
                ...linkedAccounts.map(a => a.displayId).filter(Boolean)
              ]);

              const unlinkableAccounts = session.accounts?.filter(a => {
                const dId = typeof a.account_id === 'object'
                  ? (a.account_id.iban || a.account_id.other)
                  : a.account_id;
                const tId = a.uid || a.id || dId;
                return !linkedIds.has(tId) && !linkedIds.has(dId);
              }) || [];

              if (!session.accounts || session.accounts.length === 0) {
                return (
                  <div style={{ color: '#94a3b8', padding: '20px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                    No accounts returned from this bank session. Please try re-authenticating.
                  </div>
                );
              }

              if (unlinkableAccounts.length === 0) {
                return (
                  <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '12px' }}>
                    <div style={{ color: '#34d399', fontWeight: '600', marginBottom: '4px' }}>✓ All accounts tracked</div>
                    <div style={{ color: '#94a3b8', fontSize: '13px' }}>All accounts from this bank are already on your dashboard.</div>
                  </div>
                );
              }

              return (
                <AccountList
                  accounts={unlinkableAccounts}
                  onSelectAccount={(uid) => {
                    if (isAtLimit) {
                      setToast('You have reached the maximum of ' + maxAccounts + ' linked accounts. Remove one to add another.');
                      return;
                    }
                    const acc = session.accounts.find(a => {
                      const dId = typeof a.account_id === 'object'
                        ? (a.account_id.iban || a.account_id.other)
                        : a.account_id;
                      return (a.uid || a.id || dId) === uid;
                    });
                    if (acc) handleAddAccount(acc);
                    else console.warn('Account not found for uid:', uid, session.accounts);
                  }}
                  selectedAccountId={[]}
                />
              );
            })()}

            <button
              onClick={clearSession}
              style={{
                marginTop: '24px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                padding: '10px 20px',
                borderRadius: '12px',
                color: '#60a5fa',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              Connect another bank
            </button>
          </div>
        )}
      </section>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(30, 41, 59, 0.95)', border: '1px solid rgba(245, 158, 11, 0.4)',
          borderLeft: '4px solid #f59e0b', borderRadius: '12px',
          padding: '16px 24px', color: '#f1f5f9', fontSize: '14px',
          display: 'flex', alignItems: 'center', gap: '12px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)', zIndex: 1000,
          maxWidth: '420px', animation: 'slideUp 0.3s ease'
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <span style={{ flex: 1 }}>{toast}</span>
          <button
            onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
          >×</button>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      `}</style>
    </div>
  );
}

export default function SettingPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: 'white' }}>Loading settings...</div>}>
      <SettingContent />
    </Suspense>
  );
}
