'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useBankingContext } from '../../contexts/BankingContext';
import { useAllAccountTransactions } from '../../hooks/useTransactions';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, Filter, ArrowUpDown } from 'lucide-react';

function dedup(accounts) {
  const seen = new Map();
  (accounts || []).forEach(a => seen.set(a.uid, a));
  return Array.from(seen.values());
}

const GlassCard = ({ children, style = {} }) => (
  <div style={{
    background: 'rgba(13, 15, 30, 0.4)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '24px',
    padding: '24px',
    ...style
  }}>
    {children}
  </div>
);

const SectionTitle = ({ children, style = {} }) => (
  <h2 style={{
    fontFamily: 'Space Grotesk',
    fontSize: '20px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 20px',
    ...style
  }}>{children}</h2>
);

const fmt = (num) => (num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CATEGORY_COLORS = {
  'Income': '#22c55e',
  'Housing': '#10b981',
  'Bills & Utilities': '#6366f1',
  'Food & Grocery': '#f59e0b',
  'Transportation': '#06b6d4',
  'Shopping': '#ec4899',
  'Entertainment': '#8b5cf6',
  'Health & Wellness': '#f43f5e',
  'Financial': '#475569',
  'Travel': '#3b82f6',
  'Gifts & Donations': '#d946ef',
  'Other': '#64748b',
};

function normalizeAmount(tx) {
  const raw = parseFloat(tx.transaction_amount?.amount || tx.amount || 0);
  const indicator = tx.credit_debit_indicator?.toUpperCase?.() ?? tx.creditDebitIndicator?.toUpperCase?.();
  if (indicator === 'DBIT') return -Math.abs(raw);
  if (indicator === 'CRDT') return Math.abs(raw);
  return raw;
}

function getCategory(tx) {
  // Priority: 1. AI category, 2. Manual rule-based fallback
  if (tx.category) return tx.category;

  const raw = [
    tx.creditor?.name, tx.debtor?.name,
    tx.creditor_name, tx.debtor_name,
    ...(Array.isArray(tx.remittance_information) ? tx.remittance_information : [tx.remittance_information])
  ].filter(Boolean).join(' ').toLowerCase();

  if (/salary|palkka|income|deposit|wage|return/.test(raw)) return 'Income';
  if (/rent|housing|asunto|mortgage/.test(raw)) return 'Housing';
  if (/food|grocery|kauppa|ruoka|market|eat|resto/.test(raw)) return 'Food & Grocery';
  if (/transport|taxi|bus|train|fuel|gas station/.test(raw)) return 'Transportation';
  if (/netflix|spotify|sub|stream|entertain/.test(raw)) return 'Entertainment';
  if (/electric|water|utility|utilities|phone|internet/.test(raw)) return 'Bills & Utilities';
  return 'Other';
}

export default function TransactionsPage() {
  const { linkedAccounts } = useBankingContext();
  const accounts = useMemo(() => dedup(linkedAccounts), [linkedAccounts]);
  const { data: allTransactions = {}, isLoading } = useAllAccountTransactions(accounts);

  const [search, setSearch] = useState('');
  const [selectedAcc, setSelectedAcc] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Flatten and process all transactions
  const processedTxs = useMemo(() => {
    let flatTxs = [];
    Object.entries(allTransactions || {}).forEach(([accUid, txs]) => {
      if (selectedAcc !== 'all' && accUid !== selectedAcc) return;
      const account = accounts.find(a => a.uid === accUid);
      txs.forEach(tx => {
        const date = tx.booking_date || tx.value_date || 'Unknown';
        const desc = tx.creditor?.name || tx.debtor?.name || (Array.isArray(tx.remittance_information)
          ? tx.remittance_information.join(' ')
          : (tx.creditor_name || tx.debtor_name || tx.remittance_information || 'Transaction'));

        const amt = normalizeAmount(tx);
        flatTxs.push({
          ...tx,
          _dateDisplay: date,
          _descDisplay: desc,
          _bankName: account?.bankName || 'Unknown',
          _accountName: account?.name || 'Account',
          _amount: amt,
          _isIncome: amt > 0,
          _category: getCategory(tx),
          _childCategory: tx.child_category || null
        });
      });
    });

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      flatTxs = flatTxs.filter(t =>
        t._descDisplay.toLowerCase().includes(q) ||
        t._bankName.toLowerCase().includes(q) ||
        t._dateDisplay.includes(q)
      );
    }

    // Sort
    flatTxs.sort((a, b) => {
      let valA = sortField === 'date' ? a._dateDisplay : sortField === 'amount' ? a._amount : a._descDisplay;
      let valB = sortField === 'date' ? b._dateDisplay : sortField === 'amount' ? b._amount : b._descDisplay;

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return flatTxs;
  }, [allTransactions, accounts, selectedAcc, search, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(processedTxs.length / pageSize));
  const currentTxs = processedTxs.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  if (!isLoading && accounts.length === 0) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '120px 24px', textAlign: 'center' }}>
        <GlassCard style={{ maxWidth: '420px', margin: '0 auto', padding: '48px 32px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '20px',
            background: 'rgba(255,255,255,0.03)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
          }}>
            <Filter size={32} color="#475569" />
          </div>
          <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>No accounts linked yet</h2>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6', marginBottom: '32px' }}>
            Connect your first bank account in settings to start tracking your transaction history.
          </p>
          <Link href="/setting" style={{
            display: 'inline-block', padding: '12px 24px', background: 'linear-gradient(135deg, #a855f7, #ec4899)',
            color: 'white', borderRadius: '14px', fontSize: '14px', fontWeight: '600', textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(168, 85, 247, 0.25)'
          }}>
            Go to Settings
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '36px 24px', fontFamily: 'DM Sans' }}>
      <AnimatePresence>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontFamily: 'Space Grotesk', fontSize: '30px', fontWeight: '840', margin: '0 0 4px', color: '#f8fafc' }}>Transactions</h1>
              <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>View and manage your entire financial history</p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <select
                value={selectedAcc}
                onChange={(e) => { setSelectedAcc(e.target.value); setPage(1); }}
                style={{
                  padding: '10px 16px', borderRadius: '14px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  color: '#fff', fontSize: '13px', outline: 'none'
                }}
              >
                <option value="all">All Accounts</option>
                {accounts.map(acc => (
                  <option key={acc.uid} value={acc.uid}>{acc.name} ({acc.bankName})</option>
                ))}
              </select>
            </div>
          </div>

          <GlassCard style={{ padding: '0', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '320px' }}>
                <Search size={16} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  style={{
                    width: '100%', padding: '10px 14px 10px 40px',
                    borderRadius: '12px', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.02)', color: '#fff',
                    fontSize: '13px', outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  style={{
                    padding: '6px 10px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)',
                    color: '#fff', fontSize: '12px', outline: 'none'
                  }}
                >
                  <option value={10}>10 rows</option>
                  <option value={25}>25 rows</option>
                  <option value={50}>50 rows</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', minHeight: '400px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {[
                      { label: 'Date', field: 'date', width: '12%' },
                      { label: 'Description', field: 'desc', width: '35%' },
                      { label: 'Source', field: 'bank', width: '20%' },
                      { label: 'Category', field: 'cat', width: '15%' },
                      { label: 'Amount', field: 'amount', width: '18%' }
                    ].map(col => (
                      <th
                        key={col.label}
                        onClick={() => col.field && handleSort(col.field)}
                        style={{
                          padding: '16px 24px', textAlign: col.field === 'amount' ? 'right' : 'left',
                          color: '#64748b', fontWeight: '500', fontSize: '11px', textTransform: 'uppercase',
                          letterSpacing: '0.05em', cursor: col.field ? 'pointer' : 'default',
                          width: col.width
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: col.field === 'amount' ? 'flex-end' : 'flex-start' }}>
                          {col.label}
                          {col.field && <ArrowUpDown size={10} style={{ opacity: sortField === col.field ? 1 : 0.3 }} />}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ verticalAlign: 'middle' }}>
                  {isLoading ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '100px', color: '#64748b' }}>Syncing financial data...</td></tr>
                  ) : currentTxs.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '100px', color: '#64748b' }}>No transactions found for the current filters.</td></tr>
                  ) : (
                    currentTxs.map((tx, i) => (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '16px 24px', color: '#94a3b8' }}>{tx._dateDisplay}</td>
                        <td style={{ padding: '16px 24px', color: '#f1f5f9', fontWeight: '500' }}>{tx._descDisplay}</td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>{tx._bankName}</div>
                          <div style={{ fontSize: '10px', color: '#475569' }}>{tx._accountName}</div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{
                            padding: '4px 8px', borderRadius: '6px',
                            background: `${CATEGORY_COLORS[tx._category] || '#64748b'}15`,
                            color: CATEGORY_COLORS[tx._category] || '#64748b',
                            fontSize: '10px', fontWeight: '600',
                            display: 'inline-block'
                          }}>
                            {tx._category}
                          </span>
                          {tx._childCategory && tx._childCategory !== 'Other' && (
                            <div style={{ fontSize: '10px', color: '#475569', marginTop: '4px', paddingLeft: '4px' }}>
                              {tx._childCategory}
                            </div>
                          )}
                        </td>
                        <td style={{
                          padding: '16px 24px', textAlign: 'right',
                          color: tx._isIncome ? '#10b981' : '#f43f5e',
                          fontWeight: '600', fontSize: '15px', fontFamily: 'Space Grotesk'
                        }}>
                          {tx._isIncome ? '+' : '-'}${fmt(Math.abs(tx._amount))}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, processedTxs.length)} of {processedTxs.length} entries
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  style={{
                    width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)',
                    cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? '#475569' : '#fff', opacity: page === 1 ? 0.5 : 1
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <div style={{ fontSize: '13px', color: '#fff', padding: '0 12px' }}>
                  Page {page} of {totalPages}
                </div>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  style={{
                    width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? '#475569' : '#fff', opacity: page === totalPages ? 0.5 : 1
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
