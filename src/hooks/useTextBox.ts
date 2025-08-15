import { useState } from "react";

export type TextBoxState = {
  x: number; y: number; width: number; height: number; content: string;
} | null;

export function useTextBox() {
  const [isTextBoxEditEnabled, setIsTextBoxEditEnabled] = useState(false);
  const [textBox, setTextBox] = useState<TextBoxState>(null);
  const [isTextBoxEditing, setIsTextBoxEditing] = useState(false);

  return { isTextBoxEditEnabled, setIsTextBoxEditEnabled, textBox, setTextBox, isTextBoxEditing, setIsTextBoxEditing };
}