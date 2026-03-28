'use client';

/**
 * ConnectBankButton component handles UI look and feel (Single Responsibility).
 */
/**
 * ConnectBankButton component handles UI look and feel (Single Responsibility).
 */
export function ConnectBankButton({ onClick, loading, label = 'Connect with Bank' }) {
  return (
    <button 
      onClick={loading ? undefined : onClick}
      style={{
        padding: '16px 24px',
        borderRadius: '12px',
        background: loading ? '#4a5568' : 'linear-gradient(135deg, #4f46e5, #8b5cf6)',
        color: 'white',
        border: 'none',
        fontSize: '16px',
        fontWeight: '600',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        width: '100%',
        boxShadow: '0 8px 20px rgba(99, 102, 241, 0.25)',
      }}
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          Finalizing Authorization...
        </span>
      ) : label}
    </button>
  );
}

export function BankSelector({ banks, onSelect, loading }) {
  if (loading) return <div style={{ color: '#94a3b8' }}>Loading banks in Finland...</div>;
  if (!banks || banks.length === 0) return null;

  return (
    <div style={{ marginTop: '24px', textAlign: 'left' }}>
      <h3 style={{ color: '#a7f3d0', fontSize: '14px', marginBottom: '12px' }}>Choose your bank:</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {banks.map((bank, index) => (
          <button 
            key={index}
            onClick={() => onSelect(bank)}
            style={{
              padding: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              color: 'white',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
          >
            {bank.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AccountList({ accounts, onSelectAccount, selectedAccountId }) {
  if (!accounts || accounts.length === 0) return null;
  
  // Transform selectedAccountId into a helpful list check
  const isSelectedCheck = (id) => {
    if (Array.isArray(selectedAccountId)) return selectedAccountId.includes(id);
    return selectedAccountId === id;
  };
  
  return (
    <div style={{ marginTop: '24px', textAlign: 'left' }}>
      <h3 style={{ color: '#a7f3d0', fontSize: '14px', marginBottom: '12px' }}>Choose an account to track:</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {accounts.map((acc, index) => {
          const displayId = typeof acc.account_id === 'object' 
            ? (acc.account_id.iban || acc.account_id.other) 
            : acc.account_id;
          
          const technicalId = acc.uid || acc.id || displayId;
          const isSelected = isSelectedCheck(technicalId);
          
          return (
            <li key={index} 
              onClick={() => {
                console.log('Account clicked:', technicalId);
                onSelectAccount(technicalId);
              }}
              style={{
                padding: '14px',
                backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: isSelected ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                marginBottom: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                opacity: isSelected ? 0.8 : 1
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: '500', color: isSelected ? '#34d399' : '#e2e8f0' }}>
                    {typeof acc.name === 'object' ? (acc.name.name || acc.name.id || 'Account') : (acc.name || 'Account')}
                  </span>
                  {isSelected && (
                    <span style={{ fontSize: '10px', color: '#10b981', background: 'rgba(16, 185, 129, 0.2)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                      LINKED
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {displayId}
                </span>
              </div>
              {(() => {
                const currency = typeof acc.currency === 'object'
                  ? (acc.currency.code || acc.currency.name || 'EUR')
                  : (acc.currency || 'EUR');

                const balance = acc.balance?.amount ?? acc.balances?.[0]?.balanceAmount?.amount;

                return (
                  <span style={{ fontWeight: 'bold', color: '#10b981' }}>
                    {balance != null
                      ? `${parseFloat(balance).toFixed(2)} ${currency}`
                      : currency}
                  </span>
                );
              })()}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TransactionList({ transactions, loading }) {
  if (loading) return <div style={{ color: '#94a3b8', marginTop: '20px' }}>Loading transactions...</div>;
  if (!transactions) return null;
  if (transactions.length === 0) return <div style={{ color: '#94a3b8', marginTop: '20px' }}>No transactions found for this account.</div>;

  return (
    <div style={{ marginTop: '32px', textAlign: 'left' }}>
      <h3 style={{ color: '#a7f3d0', fontSize: '14px', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
        Transactions
      </h3>
      <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
        {transactions.map((tx, index) => (
          <div key={index} style={{
            padding: '12px 0',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '14px', color: '#f1f5f9' }}>{tx.remittance_information_unstructured || tx.debtor_name || tx.creditor_name || 'Generic Transaction'}</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>{tx.booking_date || tx.value_date}</span>
            </div>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: parseFloat(tx.transaction_amount.amount) < 0 ? '#f87171' : '#34d399' 
            }}>
              {parseFloat(tx.transaction_amount.amount).toFixed(2)} {tx.transaction_amount.currency}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
