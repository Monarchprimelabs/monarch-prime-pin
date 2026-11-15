// Web build: the backup downloads as a .json file, and restoring opens the
// browser's file chooser. The file is the same format as the iPhone and
// Android apps, so a backup moves between the web app and the apps both ways.

export async function saveBackupFile(fileName: string, json: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser time to start the download before the URL goes away.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** The chosen backup file's text, or null if the person cancelled. */
export function pickBackupText(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    let settled = false;
    const finish = (value: string | null, error?: unknown) => {
      if (settled) return;
      settled = true;
      input.remove();
      if (error) reject(error); else resolve(value);
    };
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) { finish(null); return; }
      file.text().then(text => finish(text), error => finish(null, error));
    });
    input.addEventListener('cancel', () => finish(null));
    document.body.appendChild(input);
    input.click();
  });
}
