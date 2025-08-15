import { useState } from "react";

export function usePdf() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPdfDownloaded, setIsPdfDownloaded] = useState(false);
  return { selectedFile, setSelectedFile, isPdfDownloaded, setIsPdfDownloaded };
}