'use client';

import Link from 'next/link';
import { LayoutDashboard, Settings, DollarSign } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside style={{
      width: '260px',
      backgroundColor: '#05070a',
      borderRight: '1px solid rgba(255, 255, 255, 0.05)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      bottom: 0,
      left: 0,
      padding: '32px 24px',
      zIndex: 100
    }}>
      {/* Logo Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px', paddingLeft: '8px' }}>
        <div style={{ 
          width: '32px', 
          height: '32px', 
          borderRadius: '10px', 
          background: 'linear-gradient(135deg, #a855f7, #ec4899)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <DollarSign size={20} color="white" strokeWidth={2.5} />
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: '840', margin: 0, fontFamily: 'Space Grotesk', letterSpacing: '-0.02em', color: '#f8fafc' }}>MLog</h1>
      </div>

      {/* Nav Links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <SidebarLink href="/dashboard" icon={<LayoutDashboard size={20} />} label="Overview" />
        <SidebarLink href="/transactions" icon={<DollarSign size={20} />} label="Transactions" />
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '16px 8px' }} />
        <SidebarLink href="/setting" icon={<Settings size={20} />} label="Settings" />
      </nav>

      {/* Profile Placeholder */}
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #9333ea)' }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>Khoa Dinh</span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>khoadinh.work@g...</span>
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({ href, icon, label }) {
  return (
    <Link href={href} style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px', 
      textDecoration: 'none',
      color: '#94a3b8',
      fontSize: '14px',
      fontWeight: '500',
      padding: '12px 16px',
      borderRadius: '12px',
      transition: 'all 0.2s',
      fontFamily: 'DM Sans'
    }}
    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#f8fafc'; }}
    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
    >
      {icon}
      {label}
    </Link>
  );
}
