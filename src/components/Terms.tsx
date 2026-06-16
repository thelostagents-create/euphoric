/** Terms of Service text, shown as a dismissible overlay on signup. */
export function Terms({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "80vh", overflowY: "auto" }}>
        <h2 style={{ marginTop: 0 }}>Terms of Service</h2>
        <p className="muted" style={{ fontSize: 12 }}>Last updated: June 2026</p>

        <h3>1. Acceptance</h3>
        <p style={{ fontSize: 13 }}>
          By creating an account on Euphoric you agree to these Terms. If you do not agree, do
          not use the service. You must be at least 13 years old (or the minimum digital-consent
          age in your country) to use Euphoric.
        </p>

        <h3>2. Conduct</h3>
        <p style={{ fontSize: 13 }}>
          You agree not to use Euphoric to harass, threaten, or abuse others; to post illegal
          content, sexual content involving minors, or content that infringes others' rights; to
          spam, scam, or distribute malware; or to evade bans. You are responsible for everything
          posted from your account.
        </p>

        <h3>3. Content &amp; reporting</h3>
        <p style={{ fontSize: 13 }}>
          You retain ownership of what you post but grant Euphoric a license to host and display
          it so the service can function. Users may report content or accounts that violate these
          Terms, and we may remove content or suspend accounts at our discretion.
        </p>

        <h3>4. Subscriptions</h3>
        <p style={{ fontSize: 13 }}>
          Paid tiers are billed through Patreon. Billing, renewals, and cancellations are governed
          by Patreon's terms. Cosmetic perks may change over time.
        </p>

        <h3>5. Disclaimer</h3>
        <p style={{ fontSize: 13 }}>
          Euphoric is provided "as is" without warranties of any kind. We are not liable for any
          damages arising from your use of the service, to the maximum extent permitted by law.
        </p>

        <h3>6. Changes</h3>
        <p style={{ fontSize: 13 }}>
          We may update these Terms; continued use after changes means you accept the updated
          Terms.
        </p>

        <button className="btn full" onClick={onClose} style={{ marginTop: 12 }}>
          Close
        </button>
      </div>
    </div>
  );
}
