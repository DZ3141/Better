import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use | Better OEC by My Part Pros",
  description: "Terms of Use and liability disclaimers for the Better OEC Price Optimizer utility.",
};

export default function TermsOfUse() {
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
          Terms of Use
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '40px' }}>
          Last Updated: May 26, 2026
        </p>

        {/* LIABILITY HIGHLIGHT CARD */}
        <div style={{
          backgroundColor: 'rgba(246, 178, 58, 0.05)',
          border: '1px solid rgba(246, 178, 58, 0.2)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '40px',
          lineHeight: '1.6'
        }}>
          <h3 style={{
            fontFamily: 'Outfit, sans-serif',
            color: '#f6b23a',
            fontSize: '16px',
            fontWeight: 700,
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            ⚠️ Critical Disclaimer for Dealership Partners
          </h3>
          <p style={{ color: '#e2e8f0', fontSize: '14px', margin: 0 }}>
            <strong>Better OEC is strictly a suggested pricing tool.</strong> The dealership (the Licensee) maintains sole and absolute authority to set the final selling price for all parts. Under no circumstances shall My Part Pros or Better OEC be liable for final pricing set, conquest bid outcomes, or OEM reimbursement claims. Dealers explicitly assume all financial risk and responsibilities for their pricing choices.
          </p>
        </div>

        {/* Detailed Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontSize: '15px', lineHeight: '1.7', color: '#e2e8f0' }}>
          
          <section>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing the Better OEC console, downloading the companion Chrome Extension, or subscribing to our wholesale optimization licenses, you agree to comply with and be bound by these Terms of Use. If you are entering into these terms on behalf of a dealership organization, you represent that you have the legal authority to bind that entity.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
              2. Description of Service
            </h2>
            <p>
              Better OEC provides an analytical calculations console, database, and browser utility that applies margin thresholds and manufacturer rules to suggest optimal pricing for OEConnection (OEC) collision quote requests. The system calculates values based on cost data, dealer-defined minimum markups, and estimated manufacturer reimbursement rate matrices.
            </p>
          </section>

          <section style={{ borderLeft: '3px solid #262624', paddingLeft: '16px' }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
              3. Independent Dealer Price-Setting (No Pricing Agency)
            </h2>
            <p>
              You acknowledge and agree that:
            </p>
            <ul style={{ paddingLeft: '20px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                <strong>Dealer Discretion:</strong> All final part sales values and conquest program bids submitted to OEConnection are determined, set, and approved exclusively by your dealership wholesaling staff.
              </li>
              <li>
                <strong>No Mandatory Bids:</strong> The software does not place automated bids or finalize pricing transactions without manual intervention or confirmation by the authorized extension user.
              </li>
              <li>
                <strong>Verification:</strong> Dealers must review all suggested pricing and profit structures generated by the algorithm before transmitting bids to prevent clerical or operational errors.
              </li>
            </ul>
          </section>

          <section style={{ backgroundColor: '#121211', border: '1px solid #262624', padding: '24px', borderRadius: '12px' }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '18px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
              4. Complete Disclaimer of Liability
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, MY PART PROS AND BETTER OEC SHALL NOT BE LIABLE FOR:
            </p>
            <ol style={{ paddingLeft: '20px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: '#cbd5e1' }}>
              <li>
                <strong>Pricing Outcomes:</strong> Any loss of business, lost profits, or reduced margin resulting from bids won or lost using suggested pricing algorithms.
              </li>
              <li>
                <strong>OEM Reimbursements:</strong> Any denied, clawed-back, or recalculated manufacturer program reimbursements, credits, or rebates. The estimation of reimbursement rates is based on external guides and dealer-supplied parameters and is not guaranteed.
              </li>
              <li>
                <strong>System Errors:</strong> Any calculation inaccuracies, rounding errors, data feed lags, or browser extension rendering issues occurring on OEConnection pages.
              </li>
              <li>
                <strong>OEC Platform Changes:</strong> Operational failures caused by updates, structure revisions, or blocking actions initiated by OEConnection or manufacturer wholesaling networks.
              </li>
            </ol>
          </section>

          <section>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
              5. Licensing and Seat Policy
            </h2>
            <p>
              Dealership accounts are provisioned under a per-seat monthly license fee. One active seat is required for each active wholesaling workstation session. Sharing passcode keys, hardware fingerprints, or session credentials among unassigned staff users is strictly prohibited and constitutes a breach of licensing terms, subject to immediate account suspension.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
              6. Modifications to Service and Terms
            </h2>
            <p>
              We reserve the right to modify these terms, pricing structures, seat capacities, and algorithm logic at any time. Your continued use of the Better OEC platform following updates constitutes binding acceptance of the revised Terms of Use.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
              7. Contact Information
            </h2>
            <p>
              For legal inquiries, contract amendments, or support regarding license limits, please contact accounting and support at <span style={{ color: '#f6b23a' }}>billing@mypartpros.com</span>.
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
