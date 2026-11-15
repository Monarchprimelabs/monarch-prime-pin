import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { readAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// iPhone and Android: the backup is written to Caches and handed to the share
// sheet (Files, AirDrop, Drive, email). The web build has its own version.

export async function saveBackupFile(fileName: string, json: string): Promise<void> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Export Monarch Prime Pin backup',
    UTI: 'public.json',
  });
}

/** The chosen backup file's text, or null if the person cancelled. */
export async function pickBackupText(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'public.json'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return readAsStringAsync(result.assets[0].uri);
}
