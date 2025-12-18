import React from 'react';

const PRESET_COLORS = [
  { label: "Black", value: "#000000" },
  { label: "White", value: "#ffffff" },
  { label: "Gray", value: "#6b7280" },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Yellow", value: "#eab308" },
  { label: "Green", value: "#22c55e" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Indigo", value: "#4f46e5" },
];

function normalizeColor(c) {
  if (!c) return "#000000";

  // Already a valid 7-char hex? (#rrggbb)
  if (/^#[0-9A-Fa-f]{6}$/.test(c)) return c;

  // Convert named colors or rgb() to hex
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.fillStyle = c;

  const computed = ctx.fillStyle; // returns standardized color value

  // If browser returns something like "rgb(r,g,b)", convert to hex
  const m = computed.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (m) {
    const r = Number(m[1]).toString(16).padStart(2, "0");
    const g = Number(m[2]).toString(16).padStart(2, "0");
    const b = Number(m[3]).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }

  // Last fallback: return black
  return "#000000";
}

const ColorPicker = ({ color, onChange, disabled = false }) => {
  const normalizedColor = normalizeColor(color);

  return (
    <>
      <label className="field-label">Text color</label>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <input
          type="color"
          className="input-color"
          value={normalizedColor}
          onChange={(e) => onChange(normalizeColor(e.target.value))}
          disabled={disabled}
          style={{ width: 40, height: 40, padding: 0, border: "none" }}
        />

        <div style={{ fontSize: 13, color: "#555" }}>
          <div style={{ marginBottom: 4 }}>
            Selected: {normalizedColor}
          </div>
          <div
            style={{
              width: 32,
              height: 16,
              borderRadius: 4,
              border: "1px solid #ccc",
              background: normalizedColor,
            }}
          />
        </div>
      </div>

      {/* Preset swatch palette */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#555", marginBottom: 6 }}>
          Preset colors
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {PRESET_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(normalizeColor(c.value))}
              style={{
                width: 28,
                height: 28,
                borderRadius: "999px",
                border:
                  normalizedColor === normalizeColor(c.value)
                    ? "2px solid #111827"
                    : "1px solid rgba(0,0,0,0.2)",
                background: normalizeColor(c.value),
                cursor: disabled ? "not-allowed" : "pointer",
              }}
              title={c.label}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default ColorPicker;
