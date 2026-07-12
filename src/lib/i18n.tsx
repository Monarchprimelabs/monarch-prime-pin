import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

export type Language = 'en' | 'es';

const KEY_LANGUAGE = '@mpp/language';

// Stored record data (site labels, compound names, ids) stays in English;
// translation happens only at display time so switching languages never
// rewrites or fragments a user's history.

const en: Record<string, string> = {
  // Common
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.done': 'Done',
  'common.tryAgain': 'Please try again.',

  // Settings shell
  'settings.title': 'Settings',
  'settings.backToTools': '‹ Tools',
  'settings.tabReminders': 'Reminders',
  'settings.tabAccess': 'Access',
  'settings.tabLegal': 'Legal',

  // Language card
  'settings.languageLabel': 'LANGUAGE',
  'settings.languageHelp': 'Choose the language for the app interface.',

  // Profile card
  'settings.profileLabel': 'PROFILE',
  'settings.profileHelp': 'This name is used for your dashboard greeting.',
  'settings.namePlaceholder': 'Name',
  'settings.saveName': 'Save Name',
  'settings.savingName': 'Saving...',
  'settings.missingNameTitle': 'Missing name',
  'settings.missingNameBody': 'Please enter the name you want shown on your dashboard.',
  'settings.nameSavedTitle': 'Saved',
  'settings.nameSavedBody': 'Your dashboard greeting has been updated.',
  'settings.saveFailedTitle': 'Save failed',

  // Notifications card
  'settings.notificationsLabel': 'NOTIFICATION SETTINGS',
  'settings.notificationsBody': 'Create and manage local notifications from Tools → Schedule & Reminders. Monarch only reminds you about dates and times that you enter yourself.',

  // Local data card
  'settings.localDataLabel': 'LOCAL DATA',
  'settings.localDataBody': 'Your research logs and organization-tool entries are stored locally on this device. Deleting your account removes the local profile, schedules, inventory, templates, and locally stored log data from this device.',

  // App lock card
  'settings.appLockLabel': 'PRIVACY & APP LOCK',
  'settings.appLockBody': 'Require Face ID or your device passcode to open the app. Content is also hidden in the app switcher.',
  'settings.appLockNeedPasscodeTitle': 'Set up a device passcode first',
  'settings.appLockNeedPasscodeBody': 'Add a passcode or Face ID in your device settings before turning on the app lock, so you cannot get locked out of your records.',

  // Backup card
  'settings.backupLabel': 'DATA BACKUP',
  'settings.backupBody': 'Export all records, schedules, inventory, and templates as a single backup file you control — for safekeeping or moving to a new phone. Photos, reminders, and Pro unlock status are not included; restore Pro with Restore Prior Purchase and re-create reminders after importing.',
  'settings.backupExport': 'Export Backup File',
  'settings.backupImport': 'Import Backup File',
  'settings.backupFailedTitle': 'Backup failed',
  'settings.restoreConfirmTitle': 'Restore this backup?',
  'settings.restoreConfirmBody': 'Backup from {date}:\n{inj} injection records\n{sch} schedule entries\n{inv} inventory items\n{tpl} templates\n\nThis replaces ALL current records, schedules, inventory, and templates on this device. Photos and reminders are not included.',
  'settings.restoreReplace': 'Replace Data',
  'settings.restoreDoneTitle': 'Backup restored',
  'settings.restoreDoneBody': 'Your data has been restored. Screens refresh the next time you open them.',
  'settings.restoreFailedTitle': 'Restore failed',
  'settings.importFailedTitle': 'Import failed',
  'settings.unknownDate': 'an unknown date',

  // Sign out / delete
  'settings.signOut': 'Sign Out',
  'settings.signOutConfirmTitle': 'Sign out?',
  'settings.signOutConfirmBody': 'You will need to sign back in to access this app.',
  'settings.deleteAccount': 'Delete Account & Local Data',
  'settings.deleteConfirmTitle': 'Delete account and local data?',
  'settings.deleteConfirmBody': 'This will remove your local account profile and all logs stored on this device. This action cannot be undone.',

  // Access tab
  'access.label': 'YOUR ACCESS',
  'access.founding': 'Founding purchaser · Lifetime Pro',
  'access.lifetime': 'Lifetime Pro',
  'access.earlyAccess': 'Early access · Pro preview',
  'access.freePlan': 'Free plan',
  'access.body': 'Free installs include app exploration and {n} saved injection records. Lifetime Pro unlocks unlimited usage for {price}. Prior paid-download customers keep full access permanently.',
  'access.earlyNote': 'All Pro tools are open during early access.',
  'access.viewDetails': 'View Access Details',

  // Legal tab
  'legal.banner': '⚠ FOR RESEARCH USE ONLY',
  'legal.disclaimerLabel': 'IMPORTANT DISCLAIMER',
  'legal.p1': 'All peptides, compounds, and substances referenced in this application are intended SOLELY for research purposes in controlled laboratory settings.',
  'legal.p2': 'These substances are NOT approved for human consumption, self-administration, or therapeutic use by any regulatory authority including the FDA, EMA, or equivalent bodies.',
  'legal.p3': 'MONARCH PRIME PIN TRACKER is a research data logging tool only. It does not constitute medical advice, diagnosis, or treatment recommendations.',
  'legal.p4': 'This application does not calculate, recommend, or prescribe dosages. The concentration worksheet only divides a user-entered total mass by a user-entered liquid volume and converts that user-entered volume into U-100 marking references. It is not connected to compounds, schedules, or saved records. All record and schedule entries are manually entered by the user.',
  'legal.ack': 'By using this application, you acknowledge:',
  'legal.li1': '• You are using this for legitimate research recordkeeping purposes only',
  'legal.li2': '• You will not use this application to facilitate human consumption of research compounds',
  'legal.li3': '• You accept full legal and ethical responsibility for your research activities',
  'legal.li4': '• The developers of this application bear no liability for misuse',
  'legal.p5': 'Misuse of research peptides may be illegal in your jurisdiction and can pose serious health risks.',
  'legal.p6': 'If you are experiencing a medical emergency, contact emergency services immediately.',
  'legal.footer': 'Monarch Prime Pin Tracker v1.2 — Research Use Only',
};

const es: Record<string, string> = {
  // Common
  'common.cancel': 'Cancelar',
  'common.delete': 'Eliminar',
  'common.done': 'Listo',
  'common.tryAgain': 'Inténtalo de nuevo.',

  // Settings shell
  'settings.title': 'Ajustes',
  'settings.backToTools': '‹ Herramientas',
  'settings.tabReminders': 'Recordatorios',
  'settings.tabAccess': 'Acceso',
  'settings.tabLegal': 'Legal',

  // Language card
  'settings.languageLabel': 'IDIOMA',
  'settings.languageHelp': 'Elige el idioma de la interfaz de la app.',

  // Profile card
  'settings.profileLabel': 'PERFIL',
  'settings.profileHelp': 'Este nombre se usa para el saludo de tu panel principal.',
  'settings.namePlaceholder': 'Nombre',
  'settings.saveName': 'Guardar nombre',
  'settings.savingName': 'Guardando...',
  'settings.missingNameTitle': 'Falta el nombre',
  'settings.missingNameBody': 'Escribe el nombre que quieres mostrar en tu panel.',
  'settings.nameSavedTitle': 'Guardado',
  'settings.nameSavedBody': 'El saludo de tu panel se actualizó.',
  'settings.saveFailedTitle': 'No se pudo guardar',

  // Notifications card
  'settings.notificationsLabel': 'NOTIFICACIONES',
  'settings.notificationsBody': 'Crea y administra notificaciones locales desde Herramientas → Horarios y recordatorios. Monarch solo te recuerda fechas y horas que tú mismo ingresas.',

  // Local data card
  'settings.localDataLabel': 'DATOS LOCALES',
  'settings.localDataBody': 'Tus registros de investigación y tus datos de organización se guardan localmente en este dispositivo. Eliminar tu cuenta borra el perfil local, los horarios, el inventario, las plantillas y los registros guardados en este dispositivo.',

  // App lock card
  'settings.appLockLabel': 'PRIVACIDAD Y BLOQUEO',
  'settings.appLockBody': 'Exige Face ID o el código de tu dispositivo para abrir la app. El contenido también se oculta en el selector de apps.',
  'settings.appLockNeedPasscodeTitle': 'Configura primero un código',
  'settings.appLockNeedPasscodeBody': 'Agrega un código o Face ID en los ajustes de tu dispositivo antes de activar el bloqueo, para que no pierdas acceso a tus registros.',

  // Backup card
  'settings.backupLabel': 'RESPALDO DE DATOS',
  'settings.backupBody': 'Exporta todos los registros, horarios, inventario y plantillas como un solo archivo de respaldo que tú controlas — para resguardo o para cambiar de teléfono. Las fotos, los recordatorios y el estado de Pro no se incluyen; restaura Pro con «Restaurar compra previa» y vuelve a crear los recordatorios después de importar.',
  'settings.backupExport': 'Exportar respaldo',
  'settings.backupImport': 'Importar respaldo',
  'settings.backupFailedTitle': 'Falló el respaldo',
  'settings.restoreConfirmTitle': '¿Restaurar este respaldo?',
  'settings.restoreConfirmBody': 'Respaldo del {date}:\n{inj} registros de inyección\n{sch} entradas de horario\n{inv} artículos de inventario\n{tpl} plantillas\n\nEsto reemplaza TODOS los registros, horarios, inventario y plantillas actuales en este dispositivo. Las fotos y los recordatorios no se incluyen.',
  'settings.restoreReplace': 'Reemplazar datos',
  'settings.restoreDoneTitle': 'Respaldo restaurado',
  'settings.restoreDoneBody': 'Tus datos fueron restaurados. Las pantallas se actualizan la próxima vez que las abras.',
  'settings.restoreFailedTitle': 'No se pudo restaurar',
  'settings.importFailedTitle': 'Falló la importación',
  'settings.unknownDate': 'una fecha desconocida',

  // Sign out / delete
  'settings.signOut': 'Cerrar sesión',
  'settings.signOutConfirmTitle': '¿Cerrar sesión?',
  'settings.signOutConfirmBody': 'Tendrás que iniciar sesión de nuevo para usar la app.',
  'settings.deleteAccount': 'Eliminar cuenta y datos locales',
  'settings.deleteConfirmTitle': '¿Eliminar cuenta y datos locales?',
  'settings.deleteConfirmBody': 'Esto eliminará tu perfil local y todos los registros guardados en este dispositivo. Esta acción no se puede deshacer.',

  // Access tab
  'access.label': 'TU ACCESO',
  'access.founding': 'Comprador fundador · Lifetime Pro',
  'access.lifetime': 'Lifetime Pro',
  'access.earlyAccess': 'Acceso anticipado · Vista previa Pro',
  'access.freePlan': 'Plan gratuito',
  'access.body': 'Las instalaciones gratuitas incluyen exploración de la app y {n} registros de inyección guardados. Lifetime Pro desbloquea uso ilimitado por {price}. Los clientes que compraron la versión de paga conservan acceso completo para siempre.',
  'access.earlyNote': 'Todas las herramientas Pro están abiertas durante el acceso anticipado.',
  'access.viewDetails': 'Ver detalles de acceso',

  // Legal tab — DRAFT translation; have a native speaker review before release.
  'legal.banner': '⚠ SOLO PARA USO EN INVESTIGACIÓN',
  'legal.disclaimerLabel': 'AVISO IMPORTANTE',
  'legal.p1': 'Todos los péptidos, compuestos y sustancias mencionados en esta aplicación están destinados EXCLUSIVAMENTE a fines de investigación en entornos de laboratorio controlados.',
  'legal.p2': 'Estas sustancias NO están aprobadas para consumo humano, autoadministración ni uso terapéutico por ninguna autoridad regulatoria, incluidas la FDA, la EMA u organismos equivalentes.',
  'legal.p3': 'MONARCH PRIME PIN TRACKER es únicamente una herramienta de registro de datos de investigación. No constituye consejo médico, diagnóstico ni recomendación de tratamiento.',
  'legal.p4': 'Esta aplicación no calcula, recomienda ni prescribe dosis. La hoja de concentración solo divide una masa total ingresada por el usuario entre un volumen de líquido ingresado por el usuario y convierte ese volumen en referencias de marcas U-100. No está conectada a compuestos, horarios ni registros guardados. Todas las entradas de registros y horarios son ingresadas manualmente por el usuario.',
  'legal.ack': 'Al usar esta aplicación, reconoces que:',
  'legal.li1': '• Usas esta aplicación únicamente con fines legítimos de registro de investigación',
  'legal.li2': '• No usarás esta aplicación para facilitar el consumo humano de compuestos de investigación',
  'legal.li3': '• Aceptas toda la responsabilidad legal y ética de tus actividades de investigación',
  'legal.li4': '• Los desarrolladores de esta aplicación no asumen responsabilidad por el mal uso',
  'legal.p5': 'El mal uso de péptidos de investigación puede ser ilegal en tu jurisdicción y puede representar riesgos graves para la salud.',
  'legal.p6': 'Si tienes una emergencia médica, contacta a los servicios de emergencia de inmediato.',
  'legal.footer': 'Monarch Prime Pin Tracker v1.2 — Solo para uso en investigación',
};

const dictionaries: Record<Language, Record<string, string>> = { en, es };

export function detectDeviceLanguage(): Language {
  try {
    const raw = Platform.OS === 'ios'
      ? NativeModules.SettingsManager?.settings?.AppleLocale
        || NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
      : NativeModules.I18nManager?.localeIdentifier;
    if (typeof raw === 'string' && raw.toLowerCase().startsWith('es')) return 'es';
  } catch {
    // Fall through to English on any detection failure.
  }
  return 'en';
}

type I18nContextValue = {
  language: Language;
  /** Locale string for toLocaleDateString / toLocaleTimeString calls. */
  dateLocale: string;
  setLanguage: (language: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    AsyncStorage.getItem(KEY_LANGUAGE)
      .then(saved => {
        setLanguageState(saved === 'es' || saved === 'en' ? saved : detectDeviceLanguage());
      })
      .catch(() => setLanguageState(detectDeviceLanguage()));
  }, []);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    AsyncStorage.setItem(KEY_LANGUAGE, next).catch(() => undefined);
  };

  const value = useMemo<I18nContextValue>(() => ({
    language,
    dateLocale: language === 'es' ? 'es-MX' : 'en-US',
    setLanguage,
    t: (key, vars) => {
      let text = dictionaries[language][key] ?? en[key] ?? key;
      if (vars) {
        for (const [name, replacement] of Object.entries(vars)) {
          text = text.split(`{${name}}`).join(String(replacement));
        }
      }
      return text;
    },
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside LanguageProvider');
  return value;
}
