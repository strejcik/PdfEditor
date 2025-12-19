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
    <div className="color-picker-container">
      <label className="field-label">Text color</label>

      <div className="color-picker-row">
        <input
          type="color"
          className="input-color"
          value={normalizedColor}
          onChange={(e) => onChange(normalizeColor(e.target.value))}
          disabled={disabled}
        />

        <div className="color-picker-info">
          <div>Selected: {normalizedColor}</div>
          <div
            className="color-picker-preview"
            style={{ background: normalizedColor }}
          />
        </div>
      </div>

      {/* Preset swatch palette */}
      <div className="color-picker-presets-label">Preset colors</div>
      <div className="color-picker-swatches">
        {PRESET_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`color-swatch ${normalizedColor === normalizeColor(c.value) ? 'active' : ''}`}
            disabled={disabled}
            onClick={() => onChange(normalizeColor(c.value))}
            style={{ background: normalizeColor(c.value) }}
            title={c.label}
          />
        ))}
      </div>
    </div>
  );
};

export default ColorPicker;
