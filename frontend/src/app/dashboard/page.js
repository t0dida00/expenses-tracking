'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useBankingContext } from '../../contexts/BankingContext';
import { useAllAccountTransactions } from '../../hooks/useTransactions';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts';

// ── fonts & palette ───────────────────────────────────────────────────────────
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap');`;

const PIE_EXPENSE_COLORS = ['#ec4899', '#8b5cf6', '#f59e0b', '#06b6d4', '#10b981', '#6366f1'];
const PIE_INCOME_COLORS  = ['#22c55e', '#3b82f6', '#a78bfa', '#f97316', '#14b8a6'];
const LINE_GREEN = '#22c55e';
const LINE_PINK  = '#ec4899';

// ── helpers ───────────────────────────────────────────────────────────────────

function dedup(accounts) {
  const seen = new Map();
  accounts.forEach(a => seen.set(a.uid, a));
  return Array.from(seen.values());
}

function accountLabel(acc) {
  const s = acc.displayId ? acc.displayId.slice(-4) : '';
  return s ? `${acc.name} (${s})` : acc.name;
}

function fmt(n) {
  return new Intl.NumberFormat('en', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Enable Banking API returns amounts as always-positive values.
 * The direction is indicated by credit_debit_indicator:
 *   "DBIT" → money leaving the account (expense) → negative
 *   "CRDT" → money entering the account (income) → positive
 * Fall back to the raw sign if no indicator is present.
 */
function normalizeAmount(tx) {
  const raw = parseFloat(tx.transaction_amount?.amount || tx.amount || 0);
  const indicator = tx.credit_debit_indicator?.toUpperCase?.() ?? tx.creditDebitIndicator?.toUpperCase?.();
  if (indicator === 'DBIT') return -Math.abs(raw);
  if (indicator === 'CRDT') return Math.abs(raw);
  return raw;
}

function getCategory(tx) {
  if (tx.category) return tx.category;

  const raw = [
    tx.creditor?.name, tx.debtor?.name,
    tx.creditor_name, tx.debtor_name,
    ...(Array.isArray(tx.remittance_information)
      ? tx.remittance_information
      : [tx.remittance_information])
  ].filter(Boolean).join(' ').toLowerCase();

  if (/salary|palkka|income|deposit|wage|return/.test(raw)) return 'Income';
  if (/rent|housing|asunto|mortgage/.test(raw))              return 'Housing';
  if (/food|grocery|kauppa|ruoka|market|eat|resto/.test(raw)) return 'Food & Grocery';
  if (/transport|taxi|bus|train|fuel|gas station/.test(raw)) return 'Transportation';
  if (/netflix|spotify|sub|stream|entertain/.test(raw))      return 'Entertainment';
  if (/electric|water|utility|utilities|phone|internet/.test(raw)) return 'Bills & Utilities';
  return 'Other';
}

// ── framer variants ───────────────────────────────────────────────────────────
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } }
};

// ── sub-components ────────────────────────────────────────────────────────────

function GlassCard({ children, style = {}, className = '' }) {
  return (
    <div className={className} style={{
      background: 'rgba(22, 24, 39, 0.8)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px',
      padding: '24px',
      ...style
    }}>
      {children}
    </div>
  );
}

function StatCard({ icon, label, primary, secondary, accent, index }) {
  return (
    <motion.div variants={fadeUp} transition={{ duration: 0.4, delay: index * 0.1 }}
      style={{ height: '100%' }}>
      <GlassCard style={{ position: 'relative', overflow: 'hidden', height: '100%', boxSizing: 'border-box' }}>
        {/* glow blob */}
        <div style={{
          position: 'absolute', width: '80px', height: '80px', borderRadius: '50%',
          background: accent + '33', filter: 'blur(30px)',
          top: '-10px', right: '-10px', pointerEvents: 'none'
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <span style={{ color: '#6b7280', fontSize: '13px', fontFamily: 'DM Sans', letterSpacing: '0.02em' }}>{label}</span>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: `linear-gradient(135deg, ${accent}44, ${accent}22)`,
            border: `1px solid ${accent}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
          }}>{icon}</div>
        </div>
        <div style={{ fontSize: '26px', fontWeight: '700', color: '#fff', fontFamily: 'Space Grotesk', lineHeight: 1 }}>{primary}</div>
        {secondary && <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px', fontFamily: 'DM Sans' }}>{secondary}</div>}
      </GlassCard>
    </motion.div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 style={{
      margin: '0 0 20px', fontSize: '15px', fontWeight: '600',
      color: '#e2e8f0', fontFamily: 'Space Grotesk', letterSpacing: '0.01em'
    }}>{children}</h3>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0d0f1e', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px', padding: '10px 14px', fontFamily: 'DM Sans', fontSize: '13px'
    }}>
      <div style={{ color: '#9ca3af', marginBottom: '6px' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: '600' }}>
          {p.name}: ${fmt(p.value)}
        </div>
      ))}
    </div>
  );
};

// ── main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { linkedAccounts } = useBankingContext();
  const accounts = useMemo(() => dedup(linkedAccounts), [linkedAccounts]);
  
  // ── states ──────────────────────────────────────────────────────────────────
  const [selectedAcc, setSelectedAcc] = useState('all'); // 'all' or uid
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: allTransactions = {}, isLoading } = useAllAccountTransactions(accounts);

  // ── available years ────────────────────────────────────────────────────────
  const availableYears = useMemo(() => {
    const years = new Set([new Date().getFullYear()]);
    accounts.forEach(acc => {
      (allTransactions[acc.uid] || []).forEach(tx => {
        const d = new Date(tx.booking_date || tx.value_date);
        if (!isNaN(d)) years.add(d.getFullYear());
      });
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [allTransactions, accounts]);

  // ── data processing ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let filteredAccounts = accounts;
    if (selectedAcc !== 'all') {
      filteredAccounts = accounts.filter(a => a.uid === selectedAcc);
    }

    const flatTxs = [];
    filteredAccounts.forEach(acc => {
      ((allTransactions || {})[acc.uid] || []).forEach(tx => {
        // Year filter
        const d = new Date(tx.booking_date || tx.value_date);
        if (d.getFullYear() !== selectedYear) return;

        flatTxs.push({ 
          ...tx, 
          _amt: normalizeAmount(tx), 
          _acc: accountLabel(acc), 
          _cat: getCategory(tx),
          _childCat: tx.child_category || null
        });
      });
    });

    flatTxs.sort((a, b) => new Date(b.booking_date || b.value_date || 0) - new Date(a.booking_date || a.value_date || 0));

    const totalIn  = flatTxs.filter(t => t._amt > 0).reduce((s, t) => s + t._amt, 0);
    const totalOut = flatTxs.filter(t => t._amt < 0).reduce((s, t) => s + Math.abs(t._amt), 0);

    // Monthly buckets (ensuring all 12 months of the year are shown)
    const byMonth = {};
    for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
      const k = `${selectedYear}-${String(monthIdx + 1).padStart(2, '0')}`;
      byMonth[k] = { k, income: 0, expense: 0 };
    }

    flatTxs.forEach(tx => {
      const d = new Date(tx.booking_date || tx.value_date);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (byMonth[k]) {
        tx._amt > 0 ? (byMonth[k].income += tx._amt) : (byMonth[k].expense += Math.abs(tx._amt));
      }
    });

    const monthly = Object.values(byMonth).sort((a, b) => a.k.localeCompare(b.k)).map(m => ({
      ...m,
      label: new Date(m.k + '-01').toLocaleDateString('en', { month: 'short' }), // 月のみ表示
    }));

    // Most expenses month
    const mostExpensiveMonth = monthly.reduce((worst, m) =>
      m.expense > (worst?.expense ?? -Infinity) ? m : worst
    , null);

    // Category breakdowns
    const expCats = {}, incCats = {};
    flatTxs.forEach(tx => {
      if (tx._amt < 0) expCats[tx._cat] = (expCats[tx._cat] || 0) + Math.abs(tx._amt);
      else             incCats[tx._cat] = (incCats[tx._cat] || 0) + tx._amt;
    });
    const expPie = Object.entries(expCats).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) })).sort((a,b) => b.value - a.value);
    const incPie = Object.entries(incCats).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) })).sort((a,b) => b.value - a.value);

    // Biggest expense category
    const biggestExpCat = expPie[0] || null;

    // Top creditors (expense only)
    const creditors = {};
    flatTxs.filter(t => t._amt < 0).forEach(tx => {
      const name = tx.creditor?.name || tx.creditor_name || (Array.isArray(tx.remittance_information) ? tx.remittance_information[0] : tx.remittance_information) || 'Unknown';
      creditors[name] = (creditors[name] || 0) + Math.abs(tx._amt);
    });
    const topCreditors = Object.entries(creditors).map(([name, total]) => ({ name, total })).sort((a,b) => b.total - a.total).slice(0, 8);
    const maxCreditor = topCreditors[0]?.total || 1;

    return { totalIn, totalOut, monthly, mostExpensiveMonth, expPie, incPie, biggestExpCat, topCreditors, maxCreditor, recentTxs: flatTxs.slice(0, 10) };
  }, [allTransactions, accounts, selectedAcc, selectedYear]);

  // ── empty state ──────────────────────────────────────────────────────────
  if (accounts.length === 0) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center', color: '#6b7280', fontFamily: 'DM Sans' }}>
        <style>{FONTS}</style>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>📊</div>
          <h2 style={{ color: 'white', marginBottom: '12px', fontSize: '26px', fontFamily: 'Space Grotesk' }}>No accounts linked yet</h2>
          <p style={{ marginBottom: '32px', fontSize: '15px' }}>Connect your bank accounts in settings to get started.</p>
          <Link href="/setting" style={{
            padding: '13px 30px',
            background: 'linear-gradient(135deg, #9333ea, #db2777)',
            color: 'white', borderRadius: '12px',
            textDecoration: 'none', fontWeight: '600', fontSize: '15px', fontFamily: 'Space Grotesk'
          }}>Go to Settings</Link>
        </motion.div>
      </div>
    );
  }

  const { totalIn, totalOut, monthly, mostExpensiveMonth, expPie, incPie, biggestExpCat, topCreditors, maxCreditor, recentTxs } = stats;
  const activeAcc = selectedAcc === 'all' ? null : accounts.find(a => a.uid === selectedAcc);

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '36px 24px', fontFamily: 'DM Sans' }}>
      <style>{FONTS}</style>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontFamily: 'Space Grotesk', fontSize: '30px', fontWeight: '700', margin: '0 0 4px',
          background: 'linear-gradient(90deg, #f8fafc, #94a3b8)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>Overview</h1>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Financial overview for {selectedYear}</p>
      </motion.div>

      {/* ── Info Panel ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard style={{ marginBottom: '24px', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Tracked Bank</div>
              <div style={{ fontSize: '15px', color: '#f1f5f9', fontWeight: '600', fontFamily: 'Space Grotesk' }}>
                {activeAcc ? activeAcc.bankName : accounts.map(a => a.bankName).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
              </div>
            </div>
            
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />
            
            <div>
              <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>IBAN / Name</div>
              <div style={{ fontSize: '15px', color: '#f1f5f9', fontWeight: '500', fontFamily: 'DM Sans' }}>
                {activeAcc ? activeAcc.displayId : `${accounts.length} linked accounts`}
              </div>
            </div>
          </div>

          <select 
            value={selectedAcc}
            onChange={(e) => setSelectedAcc(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              background: '#0d0f1e',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              outline: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: 'DM Sans'
            }}
          >
            <option value="all">Total Overview</option>
            {accounts.map(acc => (
              <option key={acc.uid} value={acc.uid}>{acc.name} ({acc.bankName})</option>
            ))}
          </select>
        </GlassCard>
      </motion.div>

      {/* ── Stat Cards ── */}
      <motion.div variants={container} initial="hidden" animate="show"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px', alignItems: 'stretch' }}>
        <StatCard index={0} icon="📈" label="Period Income"   accent="#22c55e" primary={isLoading ? '—' : `$${fmt(totalIn)}`} />
        <StatCard index={1} icon="📉" label="Period Expenses"  accent="#ec4899" primary={isLoading ? '—' : `$${fmt(totalOut)}`} />
        <StatCard index={2} icon="💸" label="Biggest Expense" accent="#8b5cf6"
          primary={isLoading ? '—' : biggestExpCat?.name ?? '—'}
          secondary={biggestExpCat ? `$${fmt(biggestExpCat.value)}` : undefined} />
        <StatCard index={3} icon="🔥" label="Most Expenses Month" accent="#f97316"
          primary={isLoading ? '—' : (mostExpensiveMonth ? new Date(mostExpensiveMonth.k + '-01').toLocaleDateString('en', { month: 'short' }) : '—')}
          secondary={mostExpensiveMonth ? `$${fmt(mostExpensiveMonth.expense)} spent` : undefined} />
      </motion.div>

      {/* ── Unified Analytics Card (Monthly Trend + Pie Charts) ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
        style={{ marginBottom: '20px' }}>
        <GlassCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <SectionTitle style={{ marginBottom: '4px' }}>Financial Analytics</SectionTitle>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Trends & Category Distribution Overview</div>
            </div>
            
            {/* Year Selector */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {availableYears.map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: selectedYear === year ? 'rgba(147, 51, 234, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    color: selectedYear === year ? '#c084fc' : '#9ca3af',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '600',
                    fontFamily: 'Space Grotesk',
                    transition: 'all 0.2s'
                  }}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '40px' }}>
            {/* Line Chart Section */}
            <div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Trend ({selectedYear})</div>
              {monthly.length === 0 ? (
                <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563' }}>No data for {selectedYear}</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthly} margin={{ left: -20, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="label" stroke="#4b5563" fontSize={11} />
                    <YAxis stroke="#4b5563" fontSize={11} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="income"  name="Income"  stroke={LINE_GREEN} strokeWidth={2.5} dot={{ r: 3, fill: LINE_GREEN }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="expense" name="Expense" stroke={LINE_PINK}  strokeWidth={2.5} dot={{ r: 3, fill: LINE_PINK }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pie Charts Section */}
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '40px' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category Distribution</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {[
                  { label: 'Expenses', data: expPie, colors: PIE_EXPENSE_COLORS },
                  { label: 'Income',   data: incPie,  colors: PIE_INCOME_COLORS }
                ].map(({ label, data, colors }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>{label}</div>
                    {data.length === 0 ? (
                      <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', fontSize: '12px' }}>No {label.toLowerCase()}</div>
                    ) : (
                      <>
                        <PieChart width={110} height={100} style={{ margin: '0 auto' }}>
                          <Pie data={data} cx={50} cy={50} innerRadius={28} outerRadius={46} dataKey="value" paddingAngle={2}>
                            {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v) => `$${fmt(v)}`} contentStyle={{ background: '#0d0f1e', border: 'none', borderRadius: '8px', fontSize: '11px' }} />
                        </PieChart>
                        <div style={{ marginTop: '12px', textAlign: 'left' }}>
                          {data.slice(0, 3).map((d, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#9ca3af', marginBottom: '4px' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: colors[i % colors.length], flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name.slice(0, 10)}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ── Income vs Expense Horizontal Bar — gradient card ── */}
      {monthly.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.5 }} style={{ marginBottom: '20px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #2e1065 0%, #7c3aed 45%, #db2777 100%)',
            borderRadius: '20px', padding: '28px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{ fontFamily: 'Space Grotesk', fontSize: '15px', fontWeight: '600', color: '#fff', margin: '0 0 20px' }}>
              Income <span style={{ color: '#f9a8d4' }}>vs.</span> Expense
            </h3>
            <ResponsiveContainer width="100%" height={Math.max(monthly.length * 28, 140)}>
              <BarChart data={monthly} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" stroke="rgba(255,255,255,0.25)" fontSize={10}
                  tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                <YAxis type="category" dataKey="label" stroke="rgba(255,255,255,0.25)" fontSize={10} width={38} />
                <Tooltip contentStyle={{ background: '#1e103a', border: 'none', borderRadius: '8px', color: '#fff', fontFamily: 'DM Sans', fontSize: '13px' }}
                  formatter={(v) => `$${fmt(v, 0)}`} />
                <Legend iconType="square" wrapperStyle={{ color: '#fff', fontSize: '12px', fontFamily: 'DM Sans' }} />
                <Bar dataKey="income"  name="Income"  fill="rgba(255,255,255,0.8)" radius={[0,4,4,0]} barSize={7} />
                <Bar dataKey="expense" name="Expense" fill="rgba(236,72,153,0.75)" radius={[0,4,4,0]} barSize={7} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* ── Transactions + Top Creditors ── */}
      <div id="transactions" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', alignItems: 'stretch' }}>
        {/* Recent Transactions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.5 }} style={{ height: '100%' }}>
          <GlassCard style={{ height: '100%' }}>
            <SectionTitle>Recent Transactions</SectionTitle>
            {isLoading ? (
              <div style={{ color: '#4b5563', padding: '20px 0', textAlign: 'center' }}>Loading…</div>
            ) : recentTxs.length === 0 ? (
              <div style={{ color: '#4b5563', padding: '20px 0', textAlign: 'center' }}>No transactions yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Date', 'Description', 'Category', 'Amount'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#6b7280', fontWeight: '500', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentTxs.map((tx, i) => {
                    const date = tx.booking_date || tx.value_date || '';
                    const desc = tx.creditor?.name || tx.debtor?.name || (Array.isArray(tx.remittance_information)
                      ? tx.remittance_information.join(' ')
                      : (tx.creditor_name || tx.debtor_name || tx.remittance_information || 'Transaction'));
                    return (
                      <motion.tr key={i}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + i * 0.03 }}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px', color: '#9ca3af', whiteSpace: 'nowrap', fontSize: '12px' }}>
                          {date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                        </td>
                        <td style={{ padding: '10px', color: '#e2e8f0', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {desc}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ 
                            background: 'rgba(139,92,246,0.15)', color: '#a78bfa', 
                            fontSize: '10px', padding: '3px 8px', borderRadius: '6px', 
                            fontFamily: 'DM Sans', display: 'inline-block' 
                          }}>
                            {tx._cat}
                          </span>
                          {tx._childCat && tx._childCat !== 'Other' && (
                            <div style={{ fontSize: '9px', color: '#4b5563', marginTop: '2px' }}>
                              {tx._childCat}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px', fontWeight: '600', fontSize: '13px', textAlign: 'right', whiteSpace: 'nowrap',
                          color: tx._amt >= 0 ? '#22c55e' : '#ec4899' }}>
                          {tx._amt >= 0 ? '+' : '-'}${fmt(Math.abs(tx._amt))}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </GlassCard>
        </motion.div>

        {/* Top Creditors */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }} style={{ height: '100%' }}>
          <GlassCard style={{ height: '100%' }}>
            <SectionTitle>Top Spending Outlets</SectionTitle>
            {topCreditors.length === 0 ? (
              <div style={{ color: '#4b5563', padding: '20px 0', textAlign: 'center' }}>No expense data yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {topCreditors.map((c, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.65 + i * 0.05 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '13px', color: '#d1d5db' }}>
                        <span style={{ color: '#6b7280', marginRight: '6px', fontSize: '11px' }}>{i + 1}.</span>
                        {typeof c.name === 'string' ? c.name.slice(0, 26) : 'Unknown'}
                      </span>
                      <span style={{ fontSize: '12px', color: '#ec4899', fontWeight: '600' }}>${fmt(c.total, 0)}</span>
                    </div>
                    <div style={{ height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(c.total / maxCreditor) * 100}%` }}
                        transition={{ delay: 0.7 + i * 0.05, duration: 0.6, ease: 'easeOut' }}
                        style={{
                          height: '100%', borderRadius: '99px',
                          background: `linear-gradient(90deg, #9333ea, #ec4899)`
                        }} />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
