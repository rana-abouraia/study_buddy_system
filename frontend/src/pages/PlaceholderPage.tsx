import React from 'react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div style={{ minHeight: '100vh', background: '#FDFAF6', padding: '48px 32px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', background: '#FFFFFF', border: '1px solid #E8E0D0', borderRadius: 24, padding: 36, boxShadow: '0 20px 50px rgba(15,23,42,0.08)' }}>
        <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#64748B' }}>Placeholder</p>
        <h1 style={{ margin: '14px 0 12px', fontSize: '2.4rem', color: '#0F172A' }}>{title}</h1>
        <p style={{ margin: '0 0 24px', color: '#64748B', fontSize: 16, lineHeight: 1.75 }}>{description ?? 'This page is a placeholder for the current route. Backend-powered content will be added per user later.'}</p>
        <div style={{ display: 'grid', gap: 14, color: '#334155' }}>
          <p>For now, use the sidebar to navigate between the dashboard and placeholder sections.</p>
          <p>Upcoming study sessions, notifications, and recommended buddies will be fetched from the backend for each logged-in user in the next milestone.</p>
        </div>
      </div>
    </div>
  );
}
