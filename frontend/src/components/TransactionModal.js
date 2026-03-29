'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Calendar, FileText, Tag, DollarSign } from 'lucide-react';
import { bankingService } from '../services/bankingService';
import { useQueryClient } from '@tanstack/react-query';

const CATEGORIES = [
  'Income', 'Housing', 'Bills & Utilities', 'Food & Grocery', 
  'Transportation', 'Shopping', 'Entertainment', 'Health & Wellness', 
  'Financial', 'Travel', 'Gifts & Donations', 'Other'
];

export default function TransactionModal({ isOpen, onClose, transaction, accountId }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    value_date: '',
    description: '',
    category: '',
    amount: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (transaction) {
      setFormData({
        value_date: transaction.value_date || '',
        description: transaction._descDisplay || '',
        category: transaction.category || 'Other',
        amount: Math.abs(transaction._amount || 0).toString(),
        indicator: transaction.credit_debit_indicator || transaction.creditDebitIndicator || (transaction._amount >= 0 ? 'CRDT' : 'DBIT')
      });
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    
    const safeAccId = typeof accountId === 'object' ? (accountId.uid || accountId.iban) : accountId;
    const safeRef = typeof transaction.entry_reference === 'object' ? transaction.entry_reference.ref : transaction.entry_reference;

    console.log(`Updating tx: ref=${safeRef}, accId=${safeAccId}`);

    try {
      // Prepare updates for the backend
      const updates = {
        value_date: formData.value_date,
        description: formData.description,
        category: formData.category,
        amount: parseFloat(formData.amount),
        indicator: formData.indicator
      };

      await bankingService.updateTransaction(safeAccId, safeRef, updates);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['all-transactions'] });
      
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)'
      }} onClick={onClose}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          style={{
            width: '100%', maxWidth: '420px', background: '#0d0f1e',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px',
            padding: '32px', position: 'relative', overflow: 'hidden'
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '20px', fontWeight: '700', color: '#fff', margin: 0 }}>
              Edit Transaction
            </h2>
            <button onClick={onClose} style={{ 
              background: 'rgba(255,255,255,0.03)', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', color: '#64748b', cursor: 'pointer' 
            }}>
              <X size={18} />
            </button>
          </div>

          {error && (
            <div style={{ 
              padding: '12px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)',
              borderRadius: '12px', color: '#f43f5e', fontSize: '13px', marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSave}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Date */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  <Calendar size={12} /> Date
                </label>
                <input 
                  type="date"
                  value={formData.value_date}
                  onChange={e => setFormData({ ...formData, value_date: e.target.value })}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  <FileText size={12} /> Description
                </label>
                <input 
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                  }}
                  placeholder="Retail Store Name..."
                />
              </div>

              {/* Category */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  <Tag size={12} /> Category
                </label>
                <select 
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                  }}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  <DollarSign size={12} /> Amount
                </label>
                <input 
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'Space Grotesk'
                  }}
                />
              </div>

              {/* Type Toggle */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Type
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, indicator: 'DBIT' })}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px', fontSize: '12px', fontWeight: '600',
                      background: formData.indicator === 'DBIT' ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.03)',
                      color: formData.indicator === 'DBIT' ? '#f43f5e' : '#64748b',
                      border: formData.indicator === 'DBIT' ? '1px solid #f43f5e' : '1px solid rgba(255,255,255,0.06)',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    Expense (DBIT)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, indicator: 'CRDT' })}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px', fontSize: '12px', fontWeight: '600',
                      background: formData.indicator === 'CRDT' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.03)',
                      color: formData.indicator === 'CRDT' ? '#22c55e' : '#64748b',
                      border: formData.indicator === 'CRDT' ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.06)',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    Income (CRDT)
                  </button>
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSaving}
              style={{
                width: '100%', marginTop: '32px', padding: '14px',
                borderRadius: '14px', background: 'linear-gradient(135deg, #9333ea, #db2777)',
                color: '#fff', fontSize: '15px', fontWeight: '600', border: 'none',
                cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
              }}
            >
              {isSaving ? 'Saving Changes...' : <><Save size={18} /> Save Changes</>}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
