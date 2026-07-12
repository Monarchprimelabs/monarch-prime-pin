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

  // OK button
  'common.ok': 'OK',

  // Severity levels (ids stored in data; labels display-only)
  'sev.none': 'None',
  'sev.mild': 'Mild',
  'sev.mod': 'Moderate',
  'sev.sev': 'Severe',

  // Time-of-day periods (ids stored in data; labels display-only)
  'period.morning': 'Morning',
  'period.midday': 'Midday',
  'period.afternoon': 'Afternoon',
  'period.evening': 'Evening',
  'period.night': 'Night',

  // Symptom tags (English tag strings stored in data; labels display-only)
  'symptom.Nausea': 'Nausea',
  'symptom.Headache': 'Headache',
  'symptom.Fatigue': 'Fatigue',
  'symptom.Injection site redness': 'Injection site redness',
  'symptom.Injection site swelling': 'Injection site swelling',
  'symptom.Injection site itching': 'Injection site itching',
  'symptom.Flushing': 'Flushing',
  'symptom.GI upset': 'GI upset',
  'symptom.Dizziness': 'Dizziness',
  'symptom.Water retention': 'Water retention',
  'symptom.Appetite change': 'Appetite change',
  'symptom.Insomnia': 'Insomnia',
  'symptom.Joint pain': 'Joint pain',

  // Body zones (ids stored in data; labels display-only)
  'zone.sh_l': 'Left Shoulder',
  'zone.sh_r': 'Right Shoulder',
  'zone.arm_l': 'Left Outer Arm',
  'zone.arm_r': 'Right Outer Arm',
  'zone.abd_ul': 'Upper Left Abdomen',
  'zone.abd_ur': 'Upper Right Abdomen',
  'zone.abd_ll': 'Lower Left Abdomen',
  'zone.abd_lr': 'Lower Right Abdomen',
  'zone.flk_l': 'Left Flank',
  'zone.flk_r': 'Right Flank',
  'zone.th_l': 'Left Thigh',
  'zone.th_r': 'Right Thigh',
  'zone.b_sh_l': 'Left Rear Shoulder',
  'zone.b_sh_r': 'Right Rear Shoulder',
  'zone.b_arm_l': 'Left Tricep',
  'zone.b_arm_r': 'Right Tricep',
  'zone.glute_l': 'Left Glute',
  'zone.glute_r': 'Right Glute',
  'zone.b_th_l': 'Left Hamstring',
  'zone.b_th_r': 'Right Hamstring',
  'zoneShort.sh_l': 'L Shoulder',
  'zoneShort.sh_r': 'R Shoulder',
  'zoneShort.arm_l': 'L Arm',
  'zoneShort.arm_r': 'R Arm',
  'zoneShort.abd_ul': 'Upper L Abs',
  'zoneShort.abd_ur': 'Upper R Abs',
  'zoneShort.abd_ll': 'Lower L Abs',
  'zoneShort.abd_lr': 'Lower R Abs',
  'zoneShort.flk_l': 'L Flank',
  'zoneShort.flk_r': 'R Flank',
  'zoneShort.th_l': 'L Thigh',
  'zoneShort.th_r': 'R Thigh',
  'zoneShort.b_sh_l': 'L Rear Shoulder',
  'zoneShort.b_sh_r': 'R Rear Shoulder',
  'zoneShort.b_arm_l': 'L Tricep',
  'zoneShort.b_arm_r': 'R Tricep',
  'zoneShort.glute_l': 'L Glute',
  'zoneShort.glute_r': 'R Glute',
  'zoneShort.b_th_l': 'L Hamstring',
  'zoneShort.b_th_r': 'R Hamstring',

  // Log Injection screen
  'log.titleNew': 'Log Injection',
  'log.titleEdit': 'Edit Record',
  'log.backdated': ' · Backdated Entry',
  'log.backHistory': '‹ History',
  'log.backDetails': '‹ Record Details',
  'log.freeTrialLabel': 'FREE TRIAL',
  'log.freeTrialTitle': '{n} of {max} free logs remaining',
  'log.freeTrialBody': 'Try the tracker with {max} saved injection records. Unlock unlimited usage for {price}.',
  'log.selectPeptide': 'Select peptide…',
  'log.useTemplate': 'Use Record Template',
  'log.unlockTemplates': 'Unlock Record Templates',
  'log.dose': 'DOSE',
  'log.time': 'TIME',
  'log.timeNow': 'Now',
  'log.timeExact': 'Exact…',
  'log.timeHintNow': 'Records the time when you save (now {time}).',
  'log.timeHintPeriod': 'Shown as “{label}” in your history.',
  'log.timeHintExact': 'Recorded exactly as entered.',
  'log.site': 'INJECTION SITE',
  'log.anterior': 'ANTERIOR',
  'log.posterior': 'POSTERIOR',
  'log.sideEffects': 'SIDE EFFECTS',
  'log.photo': 'PROGRESS PHOTO',
  'log.photoTap': 'Tap to add progress photo',
  'log.photoRemove': 'Remove',
  'log.photoTitle': 'Add Progress Photo',
  'log.photoSource': 'Choose a source',
  'log.photoTake': 'Take Photo',
  'log.photoLibrary': 'Choose from Library',
  'log.permTitle': 'Permission needed',
  'log.permPhotos': 'Monarch Prime Pin needs photo library access to attach progress photos. You can enable this in Settings.',
  'log.permCamera': 'Monarch Prime Pin needs camera access to capture progress photos. You can enable this in Settings.',
  'log.weight': 'WEIGHT (LBS)',
  'log.weightPlaceholder': 'Enter weight…',
  'log.notes': 'NOTES',
  'log.notesPlaceholder': 'Add notes…',
  'log.save': 'SAVE INJECTION',
  'log.saveChanges': 'SAVE CHANGES',
  'log.saving': 'SAVING…',
  'log.missingPeptideTitle': 'Missing peptide',
  'log.missingPeptideBody': 'Please select a peptide.',
  'log.missingDoseTitle': 'Missing dose',
  'log.missingDoseBody': 'Please enter a dose.',
  'log.missingSiteTitle': 'Missing site',
  'log.missingSiteBody': 'Please select at least one injection site.',
  'log.badTimeTitle': 'Check the time',
  'log.badTimeBody': 'Enter an hour from 1 to 12 and minutes from 00 to 59.',
  'log.accessCheckFailed': 'Unable to check access',
  'log.savedTitle': 'Saved!',
  'log.updatedTitle': 'Record updated',
  'log.savedBody': 'Your injection has been logged.',
  'log.updatedBody': 'Your changes have been saved.',
  'log.freeSavedLast': 'Your free log has been saved. Unlock unlimited usage for {price} whenever you are ready.',
  'log.freeSavedOne': 'Your free log has been saved. You have 1 free log remaining.',
  'log.freeSavedMany': 'Your free log has been saved. You have {n} free logs remaining.',
  'log.invTitle': 'Update inventory?',
  'log.invBody': '{name}: {qty} {unit} on hand. Deduct 1 for this record?',
  'log.invNotNow': 'Not Now',
  'log.invDeduct': 'Deduct 1',

  // Peptide picker / templates sheets
  'picker.title': 'Select Peptide',
  'picker.search': 'Search peptides…',
  'picker.blends': 'BLENDS',
  'picker.customSection': 'CUSTOM',
  'picker.customName': 'Custom Peptide',
  'picker.customPlaceholder': 'Enter peptide name…',
  'picker.useName': 'Use This Name',
  'picker.chooseList': 'Choose from list instead',
  'templates.title': 'Record Templates',
  'templates.empty': 'No templates saved. Create one from Tools.',

  // History screen
  'history.title': 'History',
  'history.tabLog': 'Log',
  'history.tabCalendar': 'Calendar',
  'history.tabPhotos': 'Photos',
  'history.search': 'Search logs…',
  'history.filterAll': 'All',
  'history.empty': 'No injections logged yet',
  'history.emptyDay': 'No injections logged',
  'history.viewDetails': 'View details ›',
  'history.deleteTitle': 'Delete record?',
  'history.deleteBody': '{peptide} from {date} will be permanently deleted.',
  'history.deleteFailed': 'Delete failed',
  'history.loadFailed': 'Unable to load records',
  'history.detailTitle': 'Record Details',
  'history.edit': 'Edit',
  'history.recordedSite': 'Recorded site',
  'history.sideEffects': 'Side effects',
  'history.symptoms': 'Symptoms',
  'history.weight': 'Weight',
  'history.notes': 'Notes',
  'history.deleteRecord': 'Delete Record',
  'history.logForDate': '+ Log for {date}',
  'history.compare': 'Compare Two Photos',
  'history.compareCancel': 'Cancel Compare',
  'history.compareSelectOne': 'Select 1 photo to compare',
  'history.compareSelectTwo': 'Select 2 photos to compare',
  'history.comparing': 'Comparing',
  'history.compareTitle': 'Photo Comparison',
  'history.close': 'Close',
  'history.noPhotos': 'No progress photos yet',
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

  // OK button
  'common.ok': 'OK',

  // Severity levels (ids stored in data; labels display-only)
  'sev.none': 'Ninguno',
  'sev.mild': 'Leve',
  'sev.mod': 'Moderado',
  'sev.sev': 'Grave',

  // Time-of-day periods (ids stored in data; labels display-only)
  'period.morning': 'Mañana',
  'period.midday': 'Mediodía',
  'period.afternoon': 'Tarde',
  'period.evening': 'Tarde-noche',
  'period.night': 'Noche',

  // Symptom tags (English tag strings stored in data; labels display-only)
  'symptom.Nausea': 'Náuseas',
  'symptom.Headache': 'Dolor de cabeza',
  'symptom.Fatigue': 'Fatiga',
  'symptom.Injection site redness': 'Enrojecimiento en el sitio',
  'symptom.Injection site swelling': 'Hinchazón en el sitio',
  'symptom.Injection site itching': 'Comezón en el sitio',
  'symptom.Flushing': 'Sofocos',
  'symptom.GI upset': 'Malestar gastrointestinal',
  'symptom.Dizziness': 'Mareo',
  'symptom.Water retention': 'Retención de líquidos',
  'symptom.Appetite change': 'Cambio de apetito',
  'symptom.Insomnia': 'Insomnio',
  'symptom.Joint pain': 'Dolor articular',

  // Body zones (ids stored in data; labels display-only)
  'zone.sh_l': 'Hombro izquierdo',
  'zone.sh_r': 'Hombro derecho',
  'zone.arm_l': 'Brazo externo izquierdo',
  'zone.arm_r': 'Brazo externo derecho',
  'zone.abd_ul': 'Abdomen superior izquierdo',
  'zone.abd_ur': 'Abdomen superior derecho',
  'zone.abd_ll': 'Abdomen inferior izquierdo',
  'zone.abd_lr': 'Abdomen inferior derecho',
  'zone.flk_l': 'Flanco izquierdo',
  'zone.flk_r': 'Flanco derecho',
  'zone.th_l': 'Muslo izquierdo',
  'zone.th_r': 'Muslo derecho',
  'zone.b_sh_l': 'Hombro posterior izquierdo',
  'zone.b_sh_r': 'Hombro posterior derecho',
  'zone.b_arm_l': 'Tríceps izquierdo',
  'zone.b_arm_r': 'Tríceps derecho',
  'zone.glute_l': 'Glúteo izquierdo',
  'zone.glute_r': 'Glúteo derecho',
  'zone.b_th_l': 'Isquiotibial izquierdo',
  'zone.b_th_r': 'Isquiotibial derecho',
  'zoneShort.sh_l': 'Hombro izq',
  'zoneShort.sh_r': 'Hombro der',
  'zoneShort.arm_l': 'Brazo izq',
  'zoneShort.arm_r': 'Brazo der',
  'zoneShort.abd_ul': 'Abs sup izq',
  'zoneShort.abd_ur': 'Abs sup der',
  'zoneShort.abd_ll': 'Abs inf izq',
  'zoneShort.abd_lr': 'Abs inf der',
  'zoneShort.flk_l': 'Flanco izq',
  'zoneShort.flk_r': 'Flanco der',
  'zoneShort.th_l': 'Muslo izq',
  'zoneShort.th_r': 'Muslo der',
  'zoneShort.b_sh_l': 'Hombro post izq',
  'zoneShort.b_sh_r': 'Hombro post der',
  'zoneShort.b_arm_l': 'Tríceps izq',
  'zoneShort.b_arm_r': 'Tríceps der',
  'zoneShort.glute_l': 'Glúteo izq',
  'zoneShort.glute_r': 'Glúteo der',
  'zoneShort.b_th_l': 'Isquio izq',
  'zoneShort.b_th_r': 'Isquio der',

  // Log Injection screen
  'log.titleNew': 'Registrar inyección',
  'log.titleEdit': 'Editar registro',
  'log.backdated': ' · Entrada retroactiva',
  'log.backHistory': '‹ Historial',
  'log.backDetails': '‹ Detalles del registro',
  'log.freeTrialLabel': 'PRUEBA GRATUITA',
  'log.freeTrialTitle': '{n} de {max} registros gratuitos restantes',
  'log.freeTrialBody': 'Prueba la app con {max} registros de inyección guardados. Desbloquea uso ilimitado por {price}.',
  'log.selectPeptide': 'Selecciona un péptido…',
  'log.useTemplate': 'Usar plantilla de registro',
  'log.unlockTemplates': 'Desbloquear plantillas',
  'log.dose': 'DOSIS',
  'log.time': 'HORA',
  'log.timeNow': 'Ahora',
  'log.timeExact': 'Exacta…',
  'log.timeHintNow': 'Registra la hora al guardar (ahora {time}).',
  'log.timeHintPeriod': 'Se muestra como «{label}» en tu historial.',
  'log.timeHintExact': 'Se registra exactamente como la ingresaste.',
  'log.site': 'SITIO DE INYECCIÓN',
  'log.anterior': 'ANTERIOR',
  'log.posterior': 'POSTERIOR',
  'log.sideEffects': 'EFECTOS SECUNDARIOS',
  'log.photo': 'FOTO DE PROGRESO',
  'log.photoTap': 'Toca para agregar una foto de progreso',
  'log.photoRemove': 'Quitar',
  'log.photoTitle': 'Agregar foto de progreso',
  'log.photoSource': 'Elige una fuente',
  'log.photoTake': 'Tomar foto',
  'log.photoLibrary': 'Elegir de la galería',
  'log.permTitle': 'Se necesita permiso',
  'log.permPhotos': 'Monarch Prime Pin necesita acceso a tu galería para adjuntar fotos de progreso. Puedes activarlo en Ajustes.',
  'log.permCamera': 'Monarch Prime Pin necesita acceso a la cámara para capturar fotos de progreso. Puedes activarlo en Ajustes.',
  'log.weight': 'PESO (LBS)',
  'log.weightPlaceholder': 'Ingresa tu peso…',
  'log.notes': 'NOTAS',
  'log.notesPlaceholder': 'Agrega notas…',
  'log.save': 'GUARDAR INYECCIÓN',
  'log.saveChanges': 'GUARDAR CAMBIOS',
  'log.saving': 'GUARDANDO…',
  'log.missingPeptideTitle': 'Falta el péptido',
  'log.missingPeptideBody': 'Selecciona un péptido.',
  'log.missingDoseTitle': 'Falta la dosis',
  'log.missingDoseBody': 'Ingresa una dosis.',
  'log.missingSiteTitle': 'Falta el sitio',
  'log.missingSiteBody': 'Selecciona al menos un sitio de inyección.',
  'log.badTimeTitle': 'Revisa la hora',
  'log.badTimeBody': 'Ingresa una hora de 1 a 12 y minutos de 00 a 59.',
  'log.accessCheckFailed': 'No se pudo verificar el acceso',
  'log.savedTitle': '¡Guardado!',
  'log.updatedTitle': 'Registro actualizado',
  'log.savedBody': 'Tu inyección quedó registrada.',
  'log.updatedBody': 'Tus cambios se guardaron.',
  'log.freeSavedLast': 'Tu registro gratuito se guardó. Desbloquea uso ilimitado por {price} cuando quieras.',
  'log.freeSavedOne': 'Tu registro gratuito se guardó. Te queda 1 registro gratuito.',
  'log.freeSavedMany': 'Tu registro gratuito se guardó. Te quedan {n} registros gratuitos.',
  'log.invTitle': '¿Actualizar inventario?',
  'log.invBody': '{name}: {qty} {unit} disponibles. ¿Descontar 1 por este registro?',
  'log.invNotNow': 'Ahora no',
  'log.invDeduct': 'Descontar 1',

  // Peptide picker / templates sheets
  'picker.title': 'Seleccionar péptido',
  'picker.search': 'Buscar péptidos…',
  'picker.blends': 'MEZCLAS',
  'picker.customSection': 'PERSONALIZADO',
  'picker.customName': 'Péptido personalizado',
  'picker.customPlaceholder': 'Escribe el nombre del péptido…',
  'picker.useName': 'Usar este nombre',
  'picker.chooseList': 'Elegir de la lista',
  'templates.title': 'Plantillas de registro',
  'templates.empty': 'No hay plantillas guardadas. Crea una desde Herramientas.',

  // History screen
  'history.title': 'Historial',
  'history.tabLog': 'Registro',
  'history.tabCalendar': 'Calendario',
  'history.tabPhotos': 'Fotos',
  'history.search': 'Buscar registros…',
  'history.filterAll': 'Todos',
  'history.empty': 'Aún no hay inyecciones registradas',
  'history.emptyDay': 'Sin inyecciones registradas',
  'history.viewDetails': 'Ver detalles ›',
  'history.deleteTitle': '¿Eliminar registro?',
  'history.deleteBody': 'El registro de {peptide} del {date} se eliminará permanentemente.',
  'history.deleteFailed': 'No se pudo eliminar',
  'history.loadFailed': 'No se pudieron cargar los registros',
  'history.detailTitle': 'Detalles del registro',
  'history.edit': 'Editar',
  'history.recordedSite': 'Sitio registrado',
  'history.sideEffects': 'Efectos secundarios',
  'history.symptoms': 'Síntomas',
  'history.weight': 'Peso',
  'history.notes': 'Notas',
  'history.deleteRecord': 'Eliminar registro',
  'history.logForDate': '+ Registrar para {date}',
  'history.compare': 'Comparar dos fotos',
  'history.compareCancel': 'Cancelar comparación',
  'history.compareSelectOne': 'Selecciona 1 foto para comparar',
  'history.compareSelectTwo': 'Selecciona 2 fotos para comparar',
  'history.comparing': 'Comparando',
  'history.compareTitle': 'Comparación de fotos',
  'history.close': 'Cerrar',
  'history.noPhotos': 'Aún no hay fotos de progreso',
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
