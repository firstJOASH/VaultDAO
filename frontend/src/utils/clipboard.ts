/**
 * Copies text to the clipboard using the Navigator API.
 * Falls back to execCommand for unsupported browsers if needed.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!navigator.clipboard) {
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      return false;
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Async: Could not copy text: ', err);
    return false;
  }
};
