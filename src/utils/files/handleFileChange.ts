/**
 * Handle file input change event for PDF files
 * Validates that the selected file is a PDF
 */
export const handleFileChange = ({
  event,
  setSelectedFile,
}: {
  event: React.ChangeEvent<HTMLInputElement>;
  setSelectedFile: (file: File) => void;
}) => {
  const file = event.target.files?.[0];
  if (!file) {
    alert("Please select a file.");
    return;
  }
  // accept only PDFs
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    alert("Please select a valid PDF file.");
    return;
  }
  setSelectedFile(file);
};
