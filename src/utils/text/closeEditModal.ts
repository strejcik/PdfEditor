/**
 * Close the edit modal and reset editing state
 */
export const closeEditModal = ({
  setIsEditing,
  setEditingText,
  setEditingIndex,
}: {
  setIsEditing: (value: boolean) => void;
  setEditingText: (value: string) => void;
  setEditingIndex: (value: number | null) => void;
}) => {
  setIsEditing(false);
  setEditingText('');
  setEditingIndex(null);
};
