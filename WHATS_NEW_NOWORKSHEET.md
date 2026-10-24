# No-worksheet build (Option B)

Branch `feature/no-worksheet`. Use it only if App Review decides the
concentration worksheet falls under Guideline 1.4.2. The default 2.0 build
is unchanged.

## Build

```sh
eas build --platform ios --profile ios-production-no-worksheet
eas submit --platform ios --profile ios-production-no-worksheet
```

The profile sets `EXPO_PUBLIC_REMOVE_WORKSHEET=true`. With it:

- `metro.config.js` resolves `src/screens/WorksheetTool` to an empty stub, so
  the worksheet's code (concentration math, U-100 scale, "Show math") is not
  in the bundle. `node scripts/check-no-worksheet.js` exports both bundles
  and confirms it (default: present; no-worksheet: absent).
- Tools shows **Unit conversion** (mg ↔ mcg for a number the user types) in
  the worksheet's place. No concentration math, no syringe scale.
- The worksheet's translated strings stay in the shared dictionary; nothing
  displays them.

## What's New text (for App Store Connect)

```text
- The concentration worksheet has been removed. Tools now has a simple mg ↔ mcg unit conversion. Your logs, plans and vials are unchanged.
```

ES:

```text
- Se eliminó la hoja de concentración. Herramientas ahora tiene una conversión simple de mg ↔ mcg. Tus registros, planes y viales no cambian.
```

PT:

```text
- A planilha de concentração foi removida. Ferramentas agora tem uma conversão simples de mg ↔ mcg. Seus registros, planos e frascos não mudam.
```

## Before submitting

- Take new screenshots without the worksheet.
- Reply to App Review that the worksheet is removed in this build.
- Vials still show "concentration = total ÷ liquid" for converting a
  logged mL amount; review it with the reviewer's note in mind.
