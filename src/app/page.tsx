import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{
      backgroundColor: '#0b0b0a',
      color: '#ffffff',
      fontFamily: 'Outfit, sans-serif',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden'
    }}>
      {/* Header / Navbar */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 8%',
        borderBottom: '1px solid #262624',
        backgroundColor: 'rgba(18, 18, 17, 0.8)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/extension/my-part-pros-lg.svg" alt="My Part Pros Logo" style={{ height: '36px', width: 'auto' }} />
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#f6b23a', letterSpacing: '0.1em', marginTop: '2px' }}>
            Price Optimizer
          </div>
        </div>

        <nav style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <a href="#features" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s' }}>Features</a>
          <a href="#how-it-works" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s' }}>How it Works</a>
          <Link href="/login" style={{ color: '#ffffff', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
            Sign In
          </Link>
          <Link href="/login" style={{
            backgroundColor: '#f6b23a',
            color: '#0b0b0a',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(246, 178, 58, 0.2)',
            transition: 'transform 0.2s'
          }}>
            Free Trial
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section style={{
        padding: '100px 8% 80px 8%',
        textAlign: 'center',
        backgroundImage: 'radial-gradient(circle at top, #1a1a19 0%, #0b0b0a 100%)',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          height: '500px',
          backgroundColor: 'rgba(246, 178, 58, 0.03)',
          filter: 'blur(100px)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-block',
            backgroundColor: 'rgba(246, 178, 58, 0.1)',
            border: '1px solid rgba(246, 178, 58, 0.2)',
            color: '#f6b23a',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '24px'
          }}>
            ⚡ Better OEC by My Part Pros
          </div>

          <h1 style={{
            fontSize: '56px',
            fontWeight: 900,
            lineHeight: '1.15',
            letterSpacing: '-0.03em',
            marginBottom: '24px',
            fontFamily: 'Outfit, sans-serif'
          }}>
            Improve Dealer Shop Pricing & <br />
            <span style={{ color: '#f6b23a' }}>Maximize OEM Reimbursements</span>
          </h1>

          <p style={{
            fontSize: '18px',
            color: '#9ca3af',
            lineHeight: '1.6',
            marginBottom: '40px',
            maxWidth: '680px',
            margin: '0 auto 40px auto'
          }}>
            Win more conquest bids, accelerate CollisionLink order workflows, and automatically protect your dealership profit margins directly on OEConnection.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link href="/login" style={{
              backgroundColor: '#f6b23a',
              color: '#0b0b0a',
              padding: '14px 28px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(246, 178, 58, 0.2)',
              transition: 'transform 0.2s'
            }}>
              Register for Free Trial
            </Link>
            <Link href="/login" style={{
              backgroundColor: '#121211',
              border: '1px solid #262624',
              color: '#ffffff',
              padding: '14px 28px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'background-color 0.2s'
            }}>
              Dealer Login
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{
        padding: '80px 8%',
        backgroundColor: '#121211',
        borderTop: '1px solid #262624',
        borderBottom: '1px solid #262624'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            Built Specifically for Automotive Wholesalers
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '15px' }}>
            Automate conquest rules and pricing analytics to dominate your local parts market.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '32px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* Feature 1 */}
          <div style={{
            backgroundColor: '#161615',
            border: '1px solid #262624',
            padding: '32px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ fontSize: '28px' }}>🎯</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f6b23a' }}>Improve Shop Pricing</h3>
            <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.5', margin: 0 }}>
              Offer parts to collision shops at the optimal price point. Save settings globally or set overrides per brand and account number.
            </p>
          </div>

          {/* Feature 2 */}
          <div style={{
            backgroundColor: '#161615',
            border: '1px solid #262624',
            padding: '32px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ fontSize: '28px' }}>💰</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f6b23a' }}>Maximize Reimbursements</h3>
            <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.5', margin: 0 }}>
              The server-side pricing algorithm calculates optimal values based on manufacturer reimbursement rate maps so you secure maximum parts profit.
            </p>
          </div>

          {/* Feature 3 */}
          <div style={{
            backgroundColor: '#161615',
            border: '1px solid #262624',
            padding: '32px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ fontSize: '28px' }}>⚡</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f6b23a' }}>Win CollisionLink Orders</h3>
            <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.5', margin: 0 }}>
              Instantly review quotes, calculate proration thresholds, and submit winning conquest prices in seconds through our dedicated Chrome Extension.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" style={{
        padding: '100px 8%',
        backgroundColor: '#0b0b0a'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '60px', maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '12px' }}>
              How Better OEC Accelerates Bids
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '15px' }}>
              Three simple steps to connect and optimize your wholesale operations.
            </p>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '40px',
            flexWrap: 'wrap'
          }}>
            {/* Step 1 */}
            <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#f6b23a' }}>STEP 01</div>
              <h4 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Define Margin Policies</h4>
              <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.5', margin: 0 }}>
                Configure fallback markup percentages and custom dealer rules in the web console dashboard.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#f6b23a' }}>STEP 02</div>
              <h4 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Get the Chrome Extension</h4>
              <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.5', margin: 0 }}>
                Download our extension, enter your license seat passcode, and click optimize on OEC order details.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#f6b23a' }}>STEP 03</div>
              <h4 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Log & Export Results</h4>
              <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.5', margin: 0 }}>
                View margin reports, log histories, and export detailed CSV reports to keep your wholesaling strategy optimized.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        padding: '40px 8%',
        backgroundColor: '#121211',
        borderTop: '1px solid #262624',
        textAlign: 'center',
        fontSize: '13px',
        color: '#9ca3af'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px' }}>
          <Link href="/login" style={{ color: '#9ca3af', textDecoration: 'none' }}>Admin Login</Link>
          <a href="#" style={{ color: '#9ca3af', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="#" style={{ color: '#9ca3af', textDecoration: 'none' }}>Terms of Service</a>
        </div>
        <p style={{ margin: 0 }}>&copy; {new Date().getFullYear()} My Part Pros. All rights reserved. Better OEC is a registered utility of My Part Pros.</p>
      </footer>
    </div>
  );
}
