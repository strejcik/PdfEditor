// src/components/LiveShareModals.jsx
import { useMemo, useState, useEffect } from "react";

// --------------------------- password policy ---------------------------
// Adjust these to your needs (frontend-only gate; backend should also validate!)
const PW_MIN_LEN = 8;
const PW_MAX_LEN = 64;

// must contain at least: lower, upper, digit, symbol
function evaluatePassword(pw) {
  const v = String(pw || "");

  const lengthOk = v.length >= PW_MIN_LEN && v.length <= PW_MAX_LEN;
  const hasLower = /[a-z]/.test(v);
  const hasUpper = /[A-Z]/.test(v);
  const hasDigit = /\d/.test(v);
  const hasSymbol = /[^A-Za-z0-9]/.test(v);
  const noSpaces = !/\s/.test(v);

  const missing = [];
  if (!lengthOk) missing.push(`Length ${PW_MIN_LEN}-${PW_MAX_LEN}`);
  if (!noSpaces) missing.push("No spaces");
  if (!hasLower) missing.push("Lowercase");
  if (!hasUpper) missing.push("Uppercase");
  if (!hasDigit) missing.push("Number");
  if (!hasSymbol) missing.push("Symbol");

  const passed = lengthOk && hasLower && hasUpper && hasDigit && hasSymbol && noSpaces;

  // Simple score for UX (not security)
  let score = 0;
  if (v.length >= PW_MIN_LEN) score++;
  if (hasLower) score++;
  if (hasUpper) score++;
  if (hasDigit) score++;
  if (hasSymbol) score++;
  if (v.length >= 12) score++;

  let label = "";
  let tone = "muted"; // muted | danger | warn | success

  if (!v.trim()) {
    label = "";
    tone = "muted";
  } else if (!passed) {
    tone = "danger";
    label = `Password must include: ${missing.join(", ")}`;
  } else {
    tone = "success";
    label = score >= 6 ? "Strong password" : "Good password";
  }

  return { passed, missing, score, label, tone };
}

// --------------------------- UI bits ---------------------------
function StrengthHint({ value }) {
  const { label, tone } = useMemo(() => evaluatePassword(value), [value]);

  if (!label) return null;

  return (
    <div
      className={[
        "ls-hint",
        tone === "danger" ? "ls-hint--danger" : "",
        tone === "warn" ? "ls-hint--warn" : "",
        tone === "success" ? "ls-hint--success" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
    </div>
  );
}

function useResetOnOpen(open, setValue) {
  useEffect(() => {
    if (open) setValue("");
  }, [open, setValue]);
}

// --------------------------- Modals ---------------------------
export function HostPasswordModal({ open, pending, error, onCancel, onSubmit }) {
  const [pw, setPw] = useState("");
  useResetOnOpen(open, setPw);

  if (!open) return null;

  const verdict = evaluatePassword(pw);
  const disabled = pending || !verdict.passed;

return (
  <div className="ls-backdrop" onMouseDown={onCancel}>
    <div className="ls-card" onMouseDown={(e) => e.stopPropagation()}>
      <h3 className="ls-title">Protect your room</h3>
      <div className="ls-subtitle">
        Create a strong password. Viewers must enter it to join your live view.
      </div>

      {/* ✅ FORM wrapper fixes the DOM warning */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!disabled) onSubmit(pw);
        }}
      >
         {/* ✅ Hidden username field for accessibility & password managers */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            value="host"
            readOnly
            tabIndex={-1}
            style={{
              position: "absolute",
              opacity: 0,
              height: 0,
              width: 0,
              pointerEvents: "none",
            }}
          />
        <input
          className="ls-input"
          type="password"
          value={pw}
          autoFocus
          placeholder={`Min ${PW_MIN_LEN} chars • Upper/lower • Number • Symbol`}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="new-password"
          inputMode="text"
        />

        <StrengthHint value={pw} />

        {/* Optional compact checklist */}
        {pw.trim() ? (
          <div
            className="ls-checklist"
            style={{ marginTop: 10, fontSize: 12, color: "rgba(15,23,42,0.65)" }}
          >
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span>{pw.length >= PW_MIN_LEN && pw.length <= PW_MAX_LEN ? "✅" : "❌"} Length {PW_MIN_LEN}-{PW_MAX_LEN}</span>
              <span>{/[a-z]/.test(pw) ? "✅" : "❌"} Lowercase</span>
              <span>{/[A-Z]/.test(pw) ? "✅" : "❌"} Uppercase</span>
              <span>{/\d/.test(pw) ? "✅" : "❌"} Number</span>
              <span>{/[^A-Za-z0-9]/.test(pw) ? "✅" : "❌"} Symbol</span>
              <span>{!/\s/.test(pw) ? "✅" : "❌"} No spaces</span>
            </div>
          </div>
        ) : null}

        {error ? <div className="ls-error">{error}</div> : null}

        <div className="ls-actions">
          {/* type="button" so it does NOT submit the form */}
          <button
            type="button"
            className="ls-btn ls-btn--ghost"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </button>

          {/* type="submit" is now correct */}
          <button
            type="submit"
            className="ls-btn ls-btn--primary"
            disabled={disabled}
            title={
              verdict.passed
                ? ""
                : `Password must include: ${verdict.missing.join(", ")}`
            }
          >
            {pending ? "Creating…" : "Start sharing"}
          </button>
        </div>
      </form>
    </div>
  </div>
);
}

export function ViewerPasswordModal({ open, pending, error, onCancel, onSubmit }) {
  const [pw, setPw] = useState("");
  useResetOnOpen(open, setPw);

  if (!open) return null;

  const disabled = pending || !pw.trim();

  return (
    <div className="ls-backdrop" onMouseDown={onCancel}>
      <div className="ls-card" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="ls-title">Enter room password</h3>
        <div className="ls-subtitle">
          This live view is protected. Enter the password to continue.
        </div>

        <input
          className="ls-input"
          type="password"
          value={pw}
          autoFocus
          placeholder="Password"
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !disabled) onSubmit(pw);
          }}
          autoComplete="current-password"
        />

        {error ? <div className="ls-error">{error}</div> : null}

        <div className="ls-actions">
          <button className="ls-btn ls-btn--ghost" onClick={onCancel} disabled={pending}>
            Close
          </button>
          <button
            className="ls-btn ls-btn--primary"
            onClick={() => onSubmit(pw)}
            disabled={disabled}
          >
            {pending ? "Joining…" : "Join"}
          </button>
        </div>
      </div>
    </div>
  );
}



export function ShareLinkModal({
  open,
  link,
  copied = false,
  onClose,
  onCopyAgain,
}) {
  const [justCopied, setJustCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (copied) {
      setJustCopied(true);
      const t = setTimeout(() => setJustCopied(false), 1600);
      return () => clearTimeout(t);
    }
  }, [open, copied]);

  if (!open) return null;

  return (
    <div className="ls-backdrop" onMouseDown={onClose}>
      <div className="ls-card" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="ls-title">Share link ready</h3>
        <div className="ls-subtitle">
          {copied ? (
            <span className="ls-pill ls-pill--success">
              ✅ Copied to clipboard
            </span>
          ) : (
            <span className="ls-pill ls-pill--info">
              ℹ️ Copy this link to share
            </span>
          )}
          {justCopied ? (
            <span className="ls-subtle" style={{ marginLeft: 10 }}>
              (Copied!)
            </span>
          ) : null}
        </div>

        <label className="ls-field-label">Viewer link</label>
        <input
          className="ls-input"
          type="text"
          value={link || ""}
          readOnly
          onFocus={(e) => e.target.select()}
        />

        <div className="ls-actions">
          <button className="ls-btn ls-btn--ghost" onClick={onClose}>
            Close
          </button>
          <button
            className="ls-btn ls-btn--primary"
            onClick={onCopyAgain}
            disabled={!link}
          >
            Copy again
          </button>
        </div>
      </div>
    </div>
  );
}
