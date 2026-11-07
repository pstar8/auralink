import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 24, textAlign: 'center' }}>
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0b0e14', marginBottom: 8 }}>Page Not Found</h2>
        <p style={{ color: '#475569', marginBottom: 20 }}>The page you are looking for does not exist or has been moved.</p>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '9px 18px',
            borderRadius: 10,
            background: '#0b0e14',
            color: '#fff',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}

