/** Privacy Policy text, shown as a dismissible overlay. */
export function PrivacyPolicy({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "80vh", overflowY: "auto" }}>
        <h2 style={{ marginTop: 0 }}>Privacy Policy</h2>
        <p className="muted" style={{ fontSize: 12 }}>Last updated: June 2026</p>

        <h3>1. What we collect</h3>
        <p style={{ fontSize: 13 }}>
          When you create an account we store your email address, a username, and any profile
          details you choose to add (avatar, banner, bio). We store the messages, parties, and
          content you create so the service can function.
        </p>

        <h3>2. How we use it</h3>
        <p style={{ fontSize: 13 }}>
          Your data is used only to operate Youphoric — to show your messages to the people you
          send them to, display your profile, and maintain your account. We do not sell your
          personal data to third parties.
        </p>

        <h3>3. Service providers</h3>
        <p style={{ fontSize: 13 }}>
          We use Supabase to host our database and authentication, and Patreon to process
          subscription payments. These providers process data on our behalf under their own
          privacy policies. We never receive your full payment-card details.
        </p>

        <h3>4. Content moderation</h3>
        <p style={{ fontSize: 13 }}>
          Images you upload are automatically screened for explicit content on your device before
          being sent. Reports you file are stored so our team can review and act on them.
        </p>

        <h3>5. Your rights</h3>
        <p style={{ fontSize: 13 }}>
          You can edit your profile at any time and permanently delete your account and all
          associated data from Settings. Deletion is immediate and irreversible.
        </p>

        <h3>6. Children</h3>
        <p style={{ fontSize: 13 }}>
          Youphoric is not directed at children under 13 (or the minimum digital-consent age in
          your country). We do not knowingly collect data from them.
        </p>

        <h3>7. Contact</h3>
        <p style={{ fontSize: 13 }}>
          Questions about this policy? Email us at thelostagents@gmail.com.
        </p>

        <button className="btn full" onClick={onClose} style={{ marginTop: 12 }}>
          Close
        </button>
      </div>
    </div>
  );
}
