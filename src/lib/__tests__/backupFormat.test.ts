jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../protocolReminders', () => ({ syncProtocolReminders: jest.fn(async () => ({})) }));
jest.mock('../backupFile', () => ({ saveBackupFile: jest.fn(), pickBackupText: jest.fn() }));

import { parseBackup } from '../backup';
import { contentName, dataUriFor, parseDataUri } from '../webMedia';

const minimal = { app: 'monarch-prime-pin', backupVersion: 4, exportedAt: '2026-11-15T10:00:00.000Z' };

test('a backup from any device parses, with missing collections empty', () => {
  const { payload, counts } = parseBackup(JSON.stringify({
    ...minimal,
    injections: [{ id: 'a', peptide: 'Compound A', photoUri: 'mpp-photo:photo-1.jpg' }],
    photos: { 'photo-1.jpg': 'QUJD' },
  }));
  expect(counts.injections).toBe(1);
  expect(counts.photos).toBe(1);
  expect(payload.protocols).toEqual([]);
  expect(payload.labReports).toEqual([]);
});

test('other files are refused', () => {
  expect(() => parseBackup('not json')).toThrow('could not be read');
  expect(() => parseBackup(JSON.stringify({ app: 'something-else', backupVersion: 4 }))).toThrow('not a Monarch Prime Pin backup');
  expect(() => parseBackup(JSON.stringify({ ...minimal, backupVersion: 99 }))).toThrow('not a Monarch Prime Pin backup');
});

test('web photos become named files in the backup and data URIs again on restore', () => {
  const uri = 'data:image/png;base64,iVBORw0KGgo=';
  const parsed = parseDataUri(uri)!;
  expect(parsed).toEqual({ mime: 'image/png', base64: 'iVBORw0KGgo=' });
  const name = contentName(parsed.base64, parsed.mime, 'photo');
  expect(name).toMatch(/^photo-[0-9a-f]{8}-[0-9a-z]+\.png$/);
  // Same bytes, same name, so a photo used twice is stored once.
  expect(contentName(parsed.base64, parsed.mime, 'photo')).toBe(name);
  expect(dataUriFor(name, parsed.base64)).toBe(uri);
  // Names written by the iPhone app restore on the web too.
  expect(dataUriFor('1731600000000-ab12.jpg', 'QUJD')).toBe('data:image/jpeg;base64,QUJD');
  expect(dataUriFor('report-1.pdf', 'QUJD')).toBe('data:application/pdf;base64,QUJD');
  expect(parseDataUri('blob:https://example.com/123')).toBeNull();
});
