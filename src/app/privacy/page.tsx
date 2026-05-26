import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Better OEC by My Part Pros",
  description: "Privacy Policy and data collection guidelines for the Better OEC Price Optimizer utility.",
};

export default function PrivacyPolicy() {
  return (
    <div style={{
      backgroundColor: '#0b0b0a',
      color: '#ffffff',
      fontFamily: 'Lato, sans-serif',
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
          <Link href="/" style={{ color: '#f6b23a', textDecoration: 'none', fontSize: '14px', fontWeight: 600, transition: 'color 0.2s' }}>
            Back to Home
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main style={{
        flexGrow: 1,
        padding: '80px 8%',
        maxWidth: '900px',
        margin: '0 auto',
        width: '100%'
      }}>
        <h1 style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: '40px',
          fontWeight: 900,
          color: '#ffffff',
          marginBottom: '10px'
        }}>
          Privacy Policy
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '40px' }}>
          Last Updated: May 26, 2026
        </p>

        {/* Introduction */}
        <p style={{ fontSize: '16px', lineHeight: '1.7', color: '#e2e8f0', marginBottom: '32px' }}>
          At My Part Pros, we build wholesale optimization software that values your dealership data privacy. This Privacy Policy details what information we collect, how it is secured, and how it is used to deliver the Better OEC Price Optimizer services.
        </p>

        {/* Detailed Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontSize: '15px', lineHeight: '1.7', color: '#e2e8f0' }}>
          
          <section>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
              1. Information We Collect
            </h2>
            <p>
              To provide pricing suggestions and manage license allocations, we collect the following categories of information:
            </p>
            <ul style={{ paddingLeft: '20px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                <strong>Dealership Profile Data:</strong> Business email address, dealership corporate name, business phone number, city, and state, collected during registration.
              </li>
              <li>
                <strong>Pricing Rules Configuration:</strong> User-defined floor markups, global fallback margin percentages, brand-specific franchise overrides, and customer-specific markup exclusions.
              </li>
              <li>
                <strong>Audit & Logging History:</strong> Pricing log activities, including part numbers processed, wholesale costs, customer/bodyshop account numbers, original OEC list prices, calculated suggested prices, and manufacturer reimbursement estimations.
              </li>
              <li>
                <strong>Session and Access Metrics:</strong> Hardware device fingerprints, Chrome extension sync timestamps, and active user emails to manage multi-device seat compliance.
              </li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
              2. How We Use Collected Data
            </h2>
            <p>
              Your data is processed strictly for wholesaling operations and platform support:
            </p>
            <ul style={{ paddingLeft: '20px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                <strong>Pricing Recommendations:</strong> Custom overrides and fallback percentages are evaluated in real-time by database views to serve pricing suggestions back to your browser.
              </li>
              <li>
                <strong>Business Performance Auditing:</strong> Log entries enable you to generate CSV spreadsheets, audit bid trends, and check calculated savings metrics.
              </li>
              <li>
                <strong>Session Verification:</strong> Hardware device fingerprints are cross-referenced to block login conflicts and ensure license seat compliance.
              </li>
              <li>
                <strong>Transactional Alerting:</strong> Business emails are used to transmit welcome credentials, temporary passcodes, and contract change logs via third-party delivery services (Resend).
              </li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
              3. Data Security and Confidentiality
            </h2>
            <p>
              Wholesale pricing strategy is a dealership business secret. We secure your records by:
            </p>
            <ul style={{ paddingLeft: '20px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                <strong>Isolation:</strong> Pricing rules and quote activity logs are stored on isolated database schemas matching your specific dealership account ID.
              </li>
              <li>
                <strong>No Competitive Sharing:</strong> We do not sell, rent, or share your custom rules, part costs, or profit margins with other dealerships, collision networks, or third-party brokers.
              </li>
              <li>
                <strong>Encryption:</strong> Critical session credentials, passcodes, and transaction logs are encrypted in transit and at rest using standard security protocols.
              </li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
              4. Cookies and Web Storage
            </h2>
            <p>
              We utilize browser session storage (`sessionStorage` and `localStorage`) to maintain active administrator login states, switch active dealer tabs, and cache user session tokens. We do not place persistent advertising cookies or engage in cross-site behavioral tracking.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
              5. Third-Party Integrations
            </h2>
            <p>
              Our utilities operate on top of OEConnection (CollisionLink). While the browser extension scans OEC price elements to feed data to our calculation API, we do not store your master OEConnection account passwords, credentials, or proprietary OEC database schemas.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
              6. Policy Updates
            </h2>
            <p>
              We may update this Privacy Policy from time to time as platform configurations and data protocols evolve. If changes are material, we will post notice of updates directly on the dashboard login console.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
              7. Contact Us
            </h2>
            <p>
              For data access requests, account deletion requests, or questions regarding data protection policies, please contact us at <span style={{ color: '#f6b23a' }}>privacy@mypartpros.com</span>.
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer style={{
        padding: '40px 8%',
        backgroundColor: '#121211',
        borderTop: '1px solid #262624',
        textAlign: 'center',
        fontSize: '13px',
        color: '#9ca3af'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px' }}>
          <Link href="/privacy" style={{ color: '#9ca3af', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: '#9ca3af', textDecoration: 'none' }}>Terms of Service</Link>
        </div>
        <p style={{ margin: 0 }}>&copy; {new Date().getFullYear()} My Part Pros. All rights reserved.</p>
      </footer>
    </div>
  );
}
