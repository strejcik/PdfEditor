import React from 'react';

const FontSelector = ({ selectedFont, onChange, disabled = false }) => {
  const fonts = [
    { value: "Lato", label: "Lato (Default)" },
    { value: "Arial", label: "Arial" },
    { value: "Times New Roman", label: "Times New Roman" },
    { value: "Georgia", label: "Georgia" },
    { value: "Verdana", label: "Verdana" },
    { value: "Courier New", label: "Courier New" },
    { value: "Comic Sans MS", label: "Comic Sans MS" },
    { value: "Impact", label: "Impact" },
    { value: "Trebuchet MS", label: "Trebuchet MS" },
    { value: "Palatino", label: "Palatino" },
  ];

  return (
    <>
      <label className="field-label">Font</label>
      <select
        value={selectedFont}
        onChange={onChange}
        className="input-text"
        disabled={disabled}
        style={{ fontFamily: selectedFont }}
      >
        {fonts.map((font) => (
          <option
            key={font.value}
            value={font.value}
            style={{ fontFamily: font.value }}
          >
            {font.label}
          </option>
        ))}
      </select>
    </>
  );
};

export default FontSelector;
