# App Store listing: Monarch Prime Pin (personal-log release)

Copy each block into App Store Connect. Every field passed `listing.py` (store limits, ranking or price claims in short fields, emoji, and no competitor names). The description mentions Apple Health, so publish it with the release that includes PR #24. Before then, delete that one line.

## Name (30)
```
Monarch Prime Pin
```

## Subtitle (30)
```
Private injection & site log
```

## Promotional text (170)
```
New: plans with reminders, a Today view, vial tracking and Apple Health weight. Your records stay on your phone, with no account and no tracking.
```

## Keywords (100, comma-separated, no spaces)
```
peptide,tracker,shot,reminder,schedule,vial,rotation,diary,body,map,glp-1,history,weight,journal
```
Words already in the name and subtitle ("monarch", "prime", "pin", "private", "injection", "site", "log") are left out because Apple already indexes them. Nothing promises dosing ("dose calculator", "dosage"), per guideline 1.4.2.

## Description (4000)
```
Monarch Prime Pin is a private log for the injections you plan and take. Set up a plan once, get a reminder at the time you chose, log it in a couple of taps, and see where you injected last.

Everything stays on your phone. There is no account to create, no cloud copy and no ad tracking.

PLAN AND REMINDERS
• Protocols with daily, every other day, twice a week, days on and off, specific days or every N days, plus optional cycles
• Up to four times a day, with reminders at the times you set
• Today's plan shows what you planned, what you logged and what you skipped, with a week strip and your progress so far
• Edit a plan without changing your past records

LOGGING
• Log a planned entry in a couple of taps: compound, amount and time are already filled in
• mcg, mg, IU or mL
• Backdate or edit any record
• Side-effect notes, severity, weight and progress photos

INJECTION SITES
• Front and back body map
• Heat map of the sites you've used recently
• See when each site was last logged before you pick it

VIALS
• Track what's left in each vial from the doses you log
• See how far a vial covers your plan, with an alert a week before it runs short

REPORTS AND TOOLS
• Weekly and monthly summaries, site usage and weight trend
• Concentration worksheet with syringe sizes: unit conversion on the numbers you enter
• Optional Apple Health: read your weight and body fat (read-only)
• Export every record to CSV, or back up everything (photos included) to a file you keep

PRICING
Start free with 5 saved logs. Monarch Pro is a one-time purchase that unlocks unlimited logs, protocols and reminders, vials, reports, the worksheet, the calendar and the photo gallery. No subscription.

Monarch Prime Pin is a personal log for adults. It does not give medical advice, and it never suggests or calculates a dose: every amount comes from you. Talk to a licensed clinician about anything you take.
```

## What's New
```
• Protocols: plan days and times, with reminders
• Today's plan: log or skip planned entries, see your week
• Vials: what's left and how far it covers your plan
• See when each site was last logged
• Optional Apple Health weight and body fat (read-only)
• Photos are now kept safely through app updates, and backups can include them
• CSV export includes plans, vials and skipped entries
• Syringe sizes in the concentration worksheet
• Clearer wording: a personal log, not medical advice
• No account needed: your records stay on this phone
```

## Fact check (every claim is backed by the code)
- No account, no cloud, records stay on the phone: Supabase isn't configured; data is in AsyncStorage (src/lib/storage.ts).
- No ad tracking: no analytics or attribution SDK in package.json; funnel counters are local (src/lib/funnel.ts).
- 5 free logs, one-time Pro: FREE_INJECTION_LIMIT = 5 and the lifetime product (src/lib/entitlements.native.tsx). No price in the text, because it varies by country.
- Pro list matches the gates in ToolsScreen (protocols, vials, worksheet, schedule, inventory, templates), BottomTabs (reports) and HistoryScreen (calendar, photo gallery). Export and backup stay free.
- Never suggests a dose: amounts start empty everywhere; the worksheet is unit conversion only.

## Also in App Store Connect
See docs/APP_STORE_CONNECT_CHANGES.md: 18+ age rating, screenshots without the old banner, privacy label, privacy-policy line for Apple Health, review notes.

Google Play text is in replica/launch/listing.json, for if the Android app ships (not confirmed).

## Screenshot captions

The first three screenshots carry the listing, because they are all most people see in search. Each caption is a short headline and an optional smaller line, written to sit above a real screen from this build. Use the order below.

| # | Screen to capture | Headline | Smaller line |
| --- | --- | --- | --- |
| 1 | Home: Today's plan, week strip, two planned cards (one Logged, one Planned) | Your plan, every day | See what's planned, logged and skipped this week |
| 2 | Log screen opened from a planned entry, site picked, "last logged" line visible | Log it in a couple of taps | Compound, amount and time are already filled in |
| 3 | Home: site heat map, front view, a few bands lit | Know where you went last | Recent sites at a glance, and when each was last used |
| 4 | Protocol builder: Days on / off picked, cycle on, summary line showing | Any schedule you follow | Every other day, 5 on / 2 off, specific days, cycles |
| 5 | Lock screen with a "Protocol reminder" notification | Reminders at your times | Private: they never show what you take |
| 6 | Vials: one vial card with the remaining bar and "covers entries through" | Know when a vial runs low | What's left, and how far it covers your plan |
| 7 | Reports: weekly summary and weight trend "from Apple Health" | Your history, clearly | Summaries, site usage and weight from Apple Health |
| 8 | Settings: data card ("Everything you log stays on this phone") with Export and Backup | Stays on your phone | No account. No cloud. No ad tracking. Export anytime. |
| 9 | Upgrade screen | Pay once. No subscription. | Start free with 5 logs. Pro is a one-time purchase. |

### Rules for the screenshots

- **No old banner.** Capture from the PR #24 build, so the banner reads "PERSONAL LOG — Not medical advice". Leave it visible; it helps in review.
- **Sample data:** use a test install with made-up records. Amounts in screenshots can read as dose advice (guideline 1.4.2), so:
  - keep amounts small and varied rather than showing one "standard" number many times
  - leave the concentration worksheet out of the screenshots entirely
  - never put an amount in a caption
- **No brand-name drugs** (Ozempic, Mounjaro and so on) on screen or in captions. Use peptide names from the built-in list, or a custom name.
- **No faces or real people**, and no other app's name, icon or look.
- **Sizes:** App Store Connect asks for the 6.9-inch iPhone set (1320 × 2868) and scales it for smaller phones. Check the upload page, because the required sizes change. The app is iPhone-only (`supportsTablet: false`), so no iPad set.
- **Light or dark:** pick one for all nine so they look like a set. Dark matches the app icon.
- **Screenshot 7 needs Apple Health** (PR #24). If that release ships without it, swap the smaller line for "Weekly summaries, site usage and weight trend".

### Spanish (México / Latin America)

Wording matches the app's Spanish text: protocolo, vial, Apple Salud, "registro".

| # | Headline | Smaller line |
| --- | --- | --- |
| 1 | Tu plan, cada día | Ve lo planificado, registrado y omitido esta semana |
| 2 | Regístralo en un par de toques | Compuesto, cantidad y hora ya vienen llenos |
| 3 | Sabe dónde aplicaste la última vez | Tus sitios recientes de un vistazo, y cuándo usaste cada uno |
| 4 | Cualquier horario que sigas | Un día sí y uno no, 5 sí / 2 no, días específicos, ciclos |
| 5 | Recordatorios a tus horas | Privados: nunca muestran lo que usas |
| 6 | Sabe cuándo se acaba un vial | Lo que queda y hasta cuándo cubre tu plan |
| 7 | Tu historial, claro | Resúmenes, uso de sitios y peso de Apple Salud |
| 8 | Se queda en tu teléfono | Sin cuenta. Sin nube. Sin rastreo publicitario. Exporta cuando quieras. |
| 9 | Paga una vez. Sin suscripción. | Empieza gratis con 5 registros. Pro es un pago único. |

### Portuguese (Brazil)

Wording matches the app's Portuguese text: protocolo, frasco, Apple Saúde, "registro".

| # | Headline | Smaller line |
| --- | --- | --- |
| 1 | Seu plano, todo dia | Veja o que foi planejado, registrado e pulado nesta semana |
| 2 | Registre em poucos toques | Composto, quantidade e horário já vêm preenchidos |
| 3 | Saiba onde você aplicou por último | Seus locais recentes num relance, e quando usou cada um |
| 4 | Qualquer agenda que você siga | Dia sim, dia não, 5 sim / 2 não, dias específicos, ciclos |
| 5 | Lembretes nos seus horários | Privados: nunca mostram o que você usa |
| 6 | Saiba quando um frasco está acabando | O que resta e até quando ele cobre seu plano |
| 7 | Seu histórico, claro | Resumos, uso de locais e peso do Apple Saúde |
| 8 | Fica no seu celular | Sem conta. Sem nuvem. Sem rastreamento de anúncios. Exporte quando quiser. |
| 9 | Pague uma vez. Sem assinatura. | Comece grátis com 5 registros. O Pro é uma compra única. |

Spanish and Portuguese run 20–30% longer than English. Check that line 3 and line 8 fit on two lines at the caption size you use; if not, the smaller line can drop its last clause ("…de un vistazo" / "…num relance", "Exporta cuando quieras" / "Exporte quando quiser").

Screenshots for these locales should come from the app in that language (Settings > Language), so the screen matches the caption.

## Spanish (México) and Portuguese (Brazil) listings
Add these as localizations in App Store Connect (App Information > Localizable Information, then each version page). Both passed `listing.py` with 0 errors. Its one warning ("wasted: n" / "o") is a false positive: the checker splits words on accented letters, so "aplicación" reads as "aplicaci" + "n".
Choices made:
- **Spanish** uses Mexican and Latin American usage, matching the app's `es-MX` dates and its Spanish text. "Aplicación" in the subtitle means the injection, as it does in the app.
- **Portuguese** is Brazilian, matching `pt-BR`. "Aplicação" is used the same way, and "frasco" for vial, as in the app.
- **Keywords** leave out dose words ("dosis", "dose") on purpose, per guideline 1.4.2, and skip words already in the name and subtitle.

### Spanish (México)

**Name** (17 characters)
```
Monarch Prime Pin
```

**Subtitle** (30 characters)
```
Registro privado de aplicación
```

**Promotional text** (150 characters)
```
Nuevo: planes con recordatorios, vista de hoy, control de viales y peso de Apple Salud. Tus registros se quedan en tu teléfono, sin cuenta ni rastreo.
```

**Keywords** (100 characters)
```
péptido,inyección,jeringa,recordatorio,horario,vial,rotación,diario,mapa,cuerpo,glp-1,peso,historial
```

**Description** (2136 characters)
```
Monarch Prime Pin es un registro privado de las aplicaciones que planificas y haces. Configura un plan una vez, recibe un recordatorio a la hora que elegiste, regístralo en un par de toques y ve dónde aplicaste la última vez.

Todo se queda en tu teléfono. No hay cuenta que crear, ni copia en la nube, ni rastreo publicitario.

PLAN Y RECORDATORIOS
• Protocolos diarios, un día sí y uno no, dos veces por semana, días sí y días no, días específicos o cada N días, con ciclos opcionales
• Hasta cuatro horas al día, con recordatorios a las horas que elijas
• El plan de hoy muestra lo planificado, lo registrado y lo omitido, con una tira semanal y tu avance
• Edita un plan sin cambiar tus registros anteriores

REGISTRO
• Registra una entrada planificada en un par de toques: compuesto, cantidad y hora ya vienen llenos
• mcg, mg, UI o mL
• Registra días pasados o edita cualquier registro
• Notas de efectos secundarios, intensidad, peso y fotos de progreso

SITIOS DE APLICACIÓN
• Mapa corporal de frente y espalda
• Mapa de calor de los sitios que usaste recientemente
• Ve cuándo registraste cada sitio por última vez antes de elegirlo

VIALES
• Lleva la cuenta de lo que queda en cada vial con las dosis que registras
• Ve hasta cuándo cubre tu plan un vial, con un aviso una semana antes de que se acabe

REPORTES Y HERRAMIENTAS
• Resúmenes semanales y mensuales, uso de sitios y tendencia de peso
• Hoja de concentración con tamaños de jeringa: conversión de unidades con los números que ingresas
• Apple Salud opcional: lee tu peso y grasa corporal (solo lectura)
• Exporta todos tus registros a CSV o respalda todo (fotos incluidas) en un archivo que tú guardas

PRECIO
Empieza gratis con 5 registros guardados. Monarch Pro es un pago único que desbloquea registros ilimitados, protocolos y recordatorios, viales, reportes, la hoja de concentración, el calendario y la galería de fotos. Sin suscripción.

Monarch Prime Pin es un registro personal para adultos. No da consejo médico y nunca sugiere ni calcula una dosis: cada cantidad la pones tú. Habla con un profesional de la salud autorizado sobre cualquier cosa que uses.
```

**What's New** (606 characters)
```
• Protocolos: planifica días y horas, con recordatorios
• Plan de hoy: registra u omite entradas planificadas y ve tu semana
• Viales: lo que queda y hasta cuándo cubre tu plan
• Ve cuándo registraste cada sitio por última vez
• Peso y grasa corporal de Apple Salud, opcional (solo lectura)
• Las fotos ahora se conservan con las actualizaciones y los respaldos pueden incluirlas
• La exportación CSV incluye planes, viales y entradas omitidas
• Tamaños de jeringa en la hoja de concentración
• Texto más claro: un registro personal, no consejo médico
• Sin cuenta: tus registros se quedan en este teléfono
```

### Portuguese (Brazil)

**Name** (17 characters)
```
Monarch Prime Pin
```

**Subtitle** (29 characters)
```
Registro privado de aplicação
```

**Promotional text** (152 characters)
```
Novo: planos com lembretes, visão de hoje, controle de frascos e peso do Apple Saúde. Seus registros ficam no seu celular, sem conta e sem rastreamento.
```

**Keywords** (94 characters)
```
peptídeo,injeção,lembrete,agenda,frasco,rodízio,diário,mapa,corpo,glp-1,peso,histórico,seringa
```

**Description** (2151 characters)
```
O Monarch Prime Pin é um registro privado das aplicações que você planeja e faz. Configure um plano uma vez, receba um lembrete no horário que escolheu, registre em poucos toques e veja onde aplicou por último.

Tudo fica no seu celular. Não há conta para criar, nem cópia na nuvem, nem rastreamento de anúncios.

PLANO E LEMBRETES
• Protocolos diários, dia sim e dia não, duas vezes por semana, dias sim e dias não, dias específicos ou a cada N dias, com ciclos opcionais
• Até quatro horários por dia, com lembretes nos horários que você definir
• O plano de hoje mostra o que foi planejado, registrado e pulado, com uma faixa da semana e seu progresso
• Edite um plano sem mudar seus registros anteriores

REGISTRO
• Registre uma entrada planejada em poucos toques: composto, quantidade e horário já vêm preenchidos
• mcg, mg, UI ou mL
• Registre dias passados ou edite qualquer registro
• Notas de efeitos colaterais, intensidade, peso e fotos de progresso

LOCAIS DE APLICAÇÃO
• Mapa do corpo de frente e de costas
• Mapa de calor dos locais usados recentemente
• Veja quando cada local foi registrado por último antes de escolher

FRASCOS
• Acompanhe o que resta em cada frasco a partir das doses registradas
• Veja até quando um frasco cobre seu plano, com um aviso uma semana antes de acabar

RELATÓRIOS E FERRAMENTAS
• Resumos semanais e mensais, uso de locais e tendência de peso
• Planilha de concentração com tamanhos de seringa: conversão de unidades com os números que você informa
• Apple Saúde opcional: leia seu peso e gordura corporal (somente leitura)
• Exporte todos os registros em CSV ou faça backup de tudo (com fotos) em um arquivo que você guarda

PREÇO
Comece grátis com 5 registros salvos. O Monarch Pro é uma compra única que libera registros ilimitados, protocolos e lembretes, frascos, relatórios, a planilha de concentração, o calendário e a galeria de fotos. Sem assinatura.

O Monarch Prime Pin é um registro pessoal para adultos. Ele não oferece aconselhamento médico e nunca sugere nem calcula uma dose: cada quantidade vem de você. Converse com um profissional de saúde habilitado sobre qualquer coisa que você use.
```

**What's New** (600 characters)
```
• Protocolos: planeje dias e horários, com lembretes
• Plano de hoje: registre ou pule entradas planejadas e veja sua semana
• Frascos: o que resta e até quando cobre seu plano
• Veja quando cada local foi registrado por último
• Peso e gordura corporal do Apple Saúde, opcional (somente leitura)
• As fotos agora são mantidas nas atualizações e os backups podem incluí-las
• A exportação CSV inclui planos, frascos e entradas puladas
• Tamanhos de seringa na planilha de concentração
• Texto mais claro: um registro pessoal, não aconselhamento médico
• Sem conta: seus registros ficam neste aparelho
```
