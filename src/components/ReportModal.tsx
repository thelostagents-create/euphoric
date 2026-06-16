import { useState } from "react";
import { useStore } from "../store";
import { Modal } from "./Modal";

const REASONS = [
  "Harassment or bullying",
  "Spam or scam",
  "Hate speech",
  "Sexual or inappropriate content",
  "Threats or violence",
  "Other",
];

/** A small flow to report a user, message, or server to the developers. */
export function ReportModal({
  targetKind,
  targetId,
  context,
  onClose,
}: {
  targetKind: "user" | "message" | "server";
  targetId: string;
  /** Optional extra info (e.g. the reported message text). */
  context?: string;
  onClose: () => void;
}) {
  const { dispatch } = useStore();
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);

  function submit() {
    dispatch({
      type: "REPORT",
      targetKind,
      targetId,
      reason,
      context: [context, details.trim()].filter(Boolean).join(" — ") || undefined,
    });
    setDone(true);
  }

  return (
    <Modal title={`Report ${targetKind}`} onClose={onClose}>
      {done ? (
        <>
          <p style={{ fontSize: 14 }}>Thanks — your report has been sent to our team for review.</p>
          <button className="btn full" onClick={onClose} style={{ marginTop: 8 }}>
            Done
          </button>
        </>
      ) : (
        <>
          <div className="section-title">Reason</div>
          <div className="chips">
            {REASONS.map((r) => (
              <button
                key={r}
                className={`chip ${reason === r ? "accent" : ""}`}
                onClick={() => setReason(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>Details (optional)</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add any context that will help us review this."
              rows={3}
            />
          </div>
          <button className="btn danger full" onClick={submit} style={{ marginTop: 8 }}>
            Submit report
          </button>
        </>
      )}
    </Modal>
  );
}
