import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Ampel, Birthday, Idea, Light, PromptItem, Prefs, Stage, Stats, Tab } from '../types'
import { berlin, daysUntil, newId } from './data'

const ideas = atom({ plugin: 'girly-prompts', key: 'ideas' } as const, [] as Idea[], { shape: 'ideas-1' })
const prompts = atom({ plugin: 'girly-prompts', key: 'prompts' } as const, [] as PromptItem[], { shape: 'prompts-1' })
const stats = atom({ plugin: 'girly-prompts', key: 'stats' } as const, [] as Stats[], { shape: 'stats-1' })
const birthdays = atom({ plugin: 'girly-prompts', key: 'birthdays' } as const, [] as Birthday[], { shape: 'birthdays-1' })
const ampel = atom({ plugin: 'girly-prompts', key: 'ampel' } as const, null as Ampel | null, { shape: 'ampel-1' })
const DEFAULT_PREFS: Prefs = { isSaving: true, isReminding: true }
const prefs = atom({ plugin: 'girly-prompts', key: 'settings' } as const, DEFAULT_PREFS)
const tab = atom({ plugin: 'girly-prompts', key: 'tab' } as const, 'ideen' as Tab)

// Jede Liste lebt in der Sitzung (zeichnet neu) und im Store (bleibt über Sitzungen).
const saveIdeas = async ($: EngineInterface, fn: (v: Idea[]) => Idea[]) => { await update($, ideas, fn); await $.store.set('ideas', await read($, ideas)) }
const savePrompts = async ($: EngineInterface, fn: (v: PromptItem[]) => PromptItem[]) => { await update($, prompts, fn); await $.store.set('prompts', await read($, prompts)) }
const saveStats = async ($: EngineInterface, fn: (v: Stats[]) => Stats[]) => { await update($, stats, fn); await $.store.set('stats', await read($, stats)) }
const saveBirthdays = async ($: EngineInterface, fn: (v: Birthday[]) => Birthday[]) => { await update($, birthdays, fn); await $.store.set('birthdays', await read($, birthdays)) }
const saveAmpel = async ($: EngineInterface, fn: (v: Ampel | null) => Ampel | null) => { await update($, ampel, fn); await $.store.set('ampel', await read($, ampel)) }
const savePrefs = async ($: EngineInterface, fn: (v: Prefs) => Prefs) => { await update($, prefs, fn); await $.store.set('settings', await read($, prefs)) }

async function loadAll($: EngineInterface) {
  const get = async <T,>(key: string) => (await $.store.get(key)) as T | undefined
  const i = await get<Idea[]>('ideas'); if (i) await update($, ideas, () => i)
  const p = await get<PromptItem[]>('prompts'); if (p) await update($, prompts, () => p)
  const s = await get<Stats[]>('stats'); if (s) await update($, stats, () => s)
  const b = await get<Birthday[]>('birthdays'); if (b) await update($, birthdays, () => b)
  const a = await get<Ampel | null>('ampel'); if (a !== undefined) await update($, ampel, () => a)
  const t = await get<Prefs>('settings'); if (t) await update($, prefs, () => t)
}

const PANE = 'girly-prompts'
const TITLE = '🎀 Girly Prompts'
const STAGES = ['💡 Idee', '✍️ Skript', '🎬 Gedreht', '🚦 Gecheckt', '✅ Gepostet'] as const
const LIGHTS: Record<Light, string> = { gruen: '🟢', gelb: '🟡', rot: '🔴' }
const TABS: { id: Tab; label: string }[] = [
  { id: 'ideen', label: '💡 Ideen' },
  { id: 'prompts', label: '🔐 Prompts' },
  { id: 'zahlen', label: '📊 Zahlen' },
  { id: 'geburtstage', label: '🎂 Geburtstage' },
  { id: 'mehr', label: '✨ Mehr' },
]
const tool = <N extends string>(name: N) => `mcp__girly-prompts__${name}` as const

// Kleinkram, für den das günstige Modell reicht (Spar-Modus).
const LIGHT_TASK = /(tipp ?fehler|rechtschreib|korrigier|übersetz|uebersetz|formatier|kürz|kuerz|umformulier|grammatik)/i
// Was der Privat-Wächter sucht, bevor etwas veröffentlicht wird.
const PRIVATE = /[\w.+-]+@[\w-]+\.[\w.-]+|(?:\+49|0049|\b0)1[5-7]\d[\d /-]{6,}/g
const SAFE_EMAILS = /noreply@anthropic\.com/i
const PUBLISHING = /artifact|posty|publish|create_or_update_file|push_files|send_message|create_post|schedule/i

function compose(list: Birthday[]) {
  const spoiler = list.length
    ? list.map(b => `- ${b.name}: ${b.date}${b.gift ? ` (Geschenk: ${b.gift})` : ''}`).join('\n')
    : '- (noch keine eingetragen)'
  return `Du sprichst mit Sandy. Ihr TikTok heißt @sandy_girlyprompts: KI für süße Geschenke, ganz ohne Programmieren. Hauptprojekt: „Unser Zimmer“ für ihre beste Freundin Ani (Calgary). Zuschauer kommentieren „PROMPT“, um den Prompt zu bekommen.

So redest du mit Sandy (Mod „Erklär's mir einfach“):
- Immer Deutsch, kurz, warm, ohne Fachwörter. Ist eins unvermeidbar, erklär es in einem halben Satz.
- Erst die Antwort oder das Ergebnis, dann höchstens 5 nummerierte Schritte. Sag genau, wo sie klickt oder was sie tippt.
- Keine Code-Blöcke oder Dateipfade zeigen, außer sie fragt danach.
- Wenn du nicht sicher bist, was sie meint: kurz nachfragen, mit 2–3 Auswahlmöglichkeiten.

Ihr Dashboard hat Werkzeuge. Nutze sie von selbst, ohne zu fragen:
- ${tool('idee')}: wenn sie eine Videoidee nennt.
- ${tool('prompt_speichern')}: wenn ein Prompt fertig und getestet ist.
- ${tool('ampel')}: nach jedem Video-Check (Girly-Prompts-Check) mit Farbe und höchstens 3 Fixes.
- ${tool('zahlen')}: wenn sie Zahlen zu einem Video nennt oder einen Statistik-Screenshot schickt.
- ${tool('geburtstag')}: wenn sie einen Geburtstag nennt.

Spoiler-Schutz, diese Geburtstage kennt Sandy:
${spoiler}
Würde ein Video oder Post ein Geschenk für eine dieser Personen vor ihrem Geburtstag zeigen, warne sie deutlich.

Privat-Schutz: Bevor etwas veröffentlicht, gepostet oder geteilt wird, achte auf E-Mail-Adressen, Telefonnummern, Adressen, private Chats und Benachrichtigungen und sag ihr, was unkenntlich gemacht werden muss. Fotos nicht verpixeln.`
}

async function addIdea($: EngineInterface, text: string) {
  const clean = text.trim()
  if (!clean) return false
  await saveIdeas($, list => [...list, { id: newId(), text: clean, stage: 0 as Stage }])
  return true
}

async function addPrompt($: EngineInterface, raw: string) {
  const [title, ...rest] = raw.split(':')
  const text = rest.join(':').trim()
  if (!title?.trim() || !text) return false
  await savePrompts($, list => [...list, { id: newId(), title: title.trim(), text }])
  return true
}

async function addBirthday($: EngineInterface, name: string, date: string, gift?: string) {
  if (!name.trim() || daysUntil(date) === undefined) return false
  await saveBirthdays($, list => [
    ...list.filter(b => b.name.toLowerCase() !== name.trim().toLowerCase()),
    { id: newId(), name: name.trim(), date: date.trim(), ...(gift ? { gift } : {}) },
  ])
  return true
}

function ask($: EngineInterface, text: string) {
  void $.prompt.submit({ text, asUser: true })
  return {}
}

function rate(s: Stats) {
  return s.shares * 3 + s.saves * 2 + s.promptComments * 2 + s.views / 100
}

export const register: Register = on => {
  let lastPrompt = ''
  const warned = new Set<string>()

  on('session.start', async ($, e, next) => {
    await loadAll($)

    const commands: [string, string][] = [
      ['girly', 'Girly-Prompts-Dashboard öffnen'],
      ['hilfe', 'Was kann mein Girly-Prompts-Paket? Kurz erklärt'],
      ['idee', 'Videoidee speichern: /idee <Idee>'],
      ['prompt', 'Prompt in den Tresor: /prompt <Name>: <Prompt>'],
      ['check', 'Mein letztes Video mit der Girly-Prompts-Ampel prüfen'],
      ['hook', '5 Texte für die ersten 2 Sekunden: /hook <Thema>'],
      ['caption', 'Caption mit Suchwörtern: /caption <Thema>'],
      ['antwort', 'Antwort auf einen Kommentar: /antwort <Kommentar>'],
      ['geschenk', 'Neues Geschenk Schritt für Schritt bauen'],
      ['geburtstag', 'Geburtstag merken: /geburtstag <Name> <TT.MM.>'],
    ]
    for (const [name, description] of commands) await $.command.register({ name, description })

    const tools = [
      { name: 'idee', description: 'Speichert eine Videoidee auf Sandys Girly-Prompts-Board.', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
      { name: 'prompt_speichern', description: 'Legt einen fertigen, getesteten Prompt in Sandys Prompt-Tresor.', inputSchema: { type: 'object', properties: { titel: { type: 'string' }, text: { type: 'string' } }, required: ['titel', 'text'] } },
      { name: 'ampel', description: 'Zeigt das Ergebnis eines Girly-Prompts-Video-Checks als Ampel über dem Eingabefeld.', inputSchema: { type: 'object', properties: { farbe: { enum: ['gruen', 'gelb', 'rot'] }, video: { type: 'string', description: 'kurzer Name des Videos' }, fixes: { type: 'array', items: { type: 'string' }, maxItems: 3 } }, required: ['farbe', 'video', 'fixes'] } },
      { name: 'zahlen', description: 'Trägt die Zahlen eines geposteten Videos ins Zahlen-Tagebuch ein.', inputSchema: { type: 'object', properties: { video: { type: 'string' }, format: { type: 'string', description: 'z. B. Zimmer-Rundgang, Tamagotchi, Karussell' }, aufrufe: { type: 'number' }, shares: { type: 'number' }, saves: { type: 'number' }, prompt_kommentare: { type: 'number' } }, required: ['video', 'format', 'aufrufe'] } },
      { name: 'geburtstag', description: 'Merkt sich einen Geburtstag für den Spoiler-Schutz.', inputSchema: { type: 'object', properties: { name: { type: 'string' }, datum: { type: 'string', description: 'TT.MM.' }, geschenk: { type: 'string' } }, required: ['name', 'datum'] } },
    ]
    for (const spec of tools) await $.tool.register({ ...spec, isDeferred: false })

    // Posting-Erinnerung um 18 Uhr (nur solange Claude offen ist).
    $.clock.every(60_000, async () => {
      const now = berlin()
      if (now.hour !== 18 || !(await read($, prefs)).isReminding) return
      if ((await $.store.get('remindedOn')) === now.day) return
      if ((await read($, ideas)).some(i => i.postedAt === now.day)) return
      await $.store.set('remindedOn', now.day)
      $.ui.toast('🎀 Es ist 18 Uhr – beste Zeit zum Posten!')
      void $.ui.notify('Es ist 18 Uhr – beste Zeit zum Posten! 🎀', { title: 'Girly Prompts' })
    })

    // Geburtstage in der nächsten Woche.
    for (const b of await read($, birthdays)) {
      const days = daysUntil(b.date)
      if (days !== undefined && days <= 7) $.ui.toast(days === 0 ? `🎂 Heute hat ${b.name} Geburtstag!` : `🎂 ${b.name} hat in ${days} Tag${days === 1 ? '' : 'en'} Geburtstag – kein Spoiler posten!`)
    }

    void $.ui.open({ id: PANE, title: TITLE })
    return next(e)
  })

  // ---------- Erklär's mir einfach + Spoiler- und Privat-Schutz ----------
  on('prompt.compose', async ($, e, next) => {
    const r = await next(e)
    return { sections: [...r.sections, { id: 'girly-prompts:sandy', scope: 'session' as const, text: compose(await read($, birthdays)) }] }
  })

  // ---------- Spar-Modus ----------
  on('prompt.submit', async ($, e, next) => {
    lastPrompt = e.text
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const isLight = lastPrompt.length > 0 && lastPrompt.length < 400 && LIGHT_TASK.test(lastPrompt)
    if (isLight && (await read($, prefs)).isSaving) {
      $.ui.status('🪙 Spar-Modus: kleines Modell')
      return yield* next({ ...e, model: 'haiku' })
    }
    $.ui.status(undefined)
    return yield* next(e)
  })

  // ---------- Privat-Wächter ----------
  on('tool.call', async ($, e, next) => {
    if (!PUBLISHING.test(e.tool) || e.tool.startsWith('mcp__girly-prompts__')) return next(e)
    const found = [...JSON.stringify(e).matchAll(PRIVATE)].map(m => m[0]).filter(x => !SAFE_EMAILS.test(x))
    const key = `${e.tool}:${found.join(',')}`
    if (found.length === 0 || warned.has(key)) return next(e)
    warned.add(key)
    $.ui.toast('🔒 Privat-Wächter: da steht etwas Privates drin')
    return { deny: `Privat-Wächter: Im Inhalt steht etwas Privates (${found.join(', ')}). Frag Sandy zuerst in einfachen Worten, ob das wirklich öffentlich sein soll. Sagt sie ja, versuch es noch einmal genauso.` }
  })

  // ---------- Werkzeuge, die Claude von selbst benutzt ----------
  on('tool.call', { tool: tool('idee') }, async ($, e) => {
    const input = e as unknown as { text: string }
    await addIdea($, input.text)
    return { result: `Idee gespeichert: ${input.text}` }
  })

  on('tool.call', { tool: tool('prompt_speichern') }, async ($, e) => {
    const input = e as unknown as { titel: string; text: string }
    await savePrompts($, list => [...list, { id: newId(), title: input.titel, text: input.text }])
    return { result: `Prompt „${input.titel}“ liegt im Tresor.` }
  })

  on('tool.call', { tool: tool('ampel') }, async ($, e) => {
    const input = e as unknown as { farbe: Light; video: string; fixes: string[] }
    await saveAmpel($, () => ({ light: input.farbe, title: input.video, fixes: input.fixes.slice(0, 3), at: berlin().day }))
    if (input.farbe !== 'rot') {
      await saveIdeas($, list => list.map(i => (i.stage === 2 && input.video.toLowerCase().includes(i.text.toLowerCase().slice(0, 12)) ? { ...i, stage: 3 as Stage } : i)))
    }
    return { result: `Ampel steht auf ${input.farbe}.` }
  })

  on('tool.call', { tool: tool('zahlen') }, async ($, e) => {
    const i = e as unknown as { video: string; format: string; aufrufe: number; shares?: number; saves?: number; prompt_kommentare?: number }
    const row: Stats = { id: newId(), title: i.video, format: i.format, date: berlin().day, views: i.aufrufe, shares: i.shares ?? 0, saves: i.saves ?? 0, promptComments: i.prompt_kommentare ?? 0 }
    await saveStats($, list => [...list, row])
    return { result: `Eingetragen: ${i.video}.` }
  })

  on('tool.call', { tool: tool('geburtstag') }, async ($, e) => {
    const i = e as unknown as { name: string; datum: string; geschenk?: string }
    const isAdded = await addBirthday($, i.name, i.datum, i.geschenk)
    return { result: isAdded ? `Geburtstag von ${i.name} gemerkt.` : 'Das Datum bitte als TT.MM. angeben.' }
  })

  // ---------- Kurzbefehle ----------
  on('command.run', { command: 'girly' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'Dein Girly-Prompts-Dashboard ist offen 🎀' }
  })

  on('command.run', { command: 'hilfe' }, () => ({
    text: [
      '🎀 Dein Girly-Prompts-Paket',
      '',
      'Du musst nichts auswendig können: Erzähl mir einfach, was du machst. Ich trage Ideen, Prompts, Zahlen und Geburtstage selbst ein.',
      '',
      'Wenn du lieber tippst:',
      '/girly – Dashboard öffnen',
      '/idee Tamagotchi für Ani – Idee speichern',
      '/prompt Zimmer: <Prompt> – Prompt in den Tresor',
      '/check – letztes Video prüfen (Ampel)',
      '/hook Thema – 5 Texte für die ersten 2 Sekunden',
      '/caption Thema – Caption mit Suchwörtern',
      '/antwort <Kommentar> – Antwort in deinem Ton',
      '/geschenk – neues Geschenk Schritt für Schritt',
      '/geburtstag Ani 12.03. – für den Spoiler-Schutz',
    ].join('\n'),
  }))

  on('command.run', { command: 'idee' }, async ($, e) => {
    const isAdded = await addIdea($, e.args)
    return { text: isAdded ? `💡 Gespeichert: „${e.args.trim()}“` : 'Schreib die Idee direkt dahinter, z. B. /idee Tamagotchi für Ani' }
  })

  on('command.run', { command: 'prompt' }, async ($, e) => {
    const isAdded = await addPrompt($, e.args)
    return { text: isAdded ? '🔐 Prompt liegt im Tresor.' : 'So geht’s: /prompt Name: hier der Prompt' }
  })

  on('command.run', { command: 'geburtstag' }, async ($, e) => {
    const m = /^(.+?)\s+(\d{1,2}\.\d{1,2}\.?)\s*(.*)$/.exec(e.args.trim())
    const isAdded = m ? await addBirthday($, m[1]!, m[2]!, m[3] || undefined) : false
    return { text: isAdded ? `🎂 Gemerkt: ${m![1]} am ${m![2]}` : 'So geht’s: /geburtstag Ani 12.03.' }
  })

  on('command.run', { command: 'check' }, $ =>
    ask($, 'Bitte mach den Girly-Prompts-Check (Skill girly-prompts-video-check) mit dem Video, das ich zuletzt geschickt habe. Wenn ich noch keins geschickt habe, sag mir kurz, wie ich es hier hochlade. Setz danach die Ampel.'))

  on('command.run', { command: 'hook' }, ($, e) =>
    ask($, `Schreib mir 5 Texte für die ersten 2 Sekunden meines Girly-Prompts-Videos${e.args ? ` über: ${e.args}` : ''}. Jeder in 2 Sekunden lesbar, höchstens 2 Zeilen, sagt, was man sieht. Markier deinen Favoriten.`))

  on('command.run', { command: 'caption' }, ($, e) =>
    ask($, `Schreib mir eine TikTok-Caption für Girly Prompts${e.args ? ` zum Thema: ${e.args}` : ''}. Kurz, in meinem Ton, mit Suchwörtern (Claude, Geschenk, beste Freundin …), 3–5 Hashtags und nur dann „Kommentier PROMPT“, wenn der Prompt im Tresor liegt.`))

  on('command.run', { command: 'antwort' }, ($, e) =>
    ask($, `Schreib mir 2 kurze Antworten auf diesen TikTok-Kommentar, in meinem Ton (lieb, locker, ein Emoji reicht): „${e.args}“. Wenn jemand PROMPT will und der passende Prompt im Tresor liegt, sag mir, welchen ich schicken soll.`))

  on('command.run', { command: 'geschenk' }, $ =>
    ask($, 'Ich möchte ein neues KI-Geschenk bauen, so wie „Unser Zimmer“. Stell mir bitte nacheinander ein paar einfache Fragen (für wen, was mag die Person, Anlass, bis wann) und bau es dann Schritt für Schritt mit mir. Denk an den Spoiler-Schutz.'))

  // ---------- Ampel über dem Eingabefeld ----------
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await read($, ampel)
    if (!current || e.props.hasSurvey) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={1}>
          <Text bold>{LIGHTS[current.light]} {current.title}</Text>
          <Text>{current.light === 'gruen' ? 'bereit zum Posten!' : current.light === 'gelb' ? 'fast fertig' : 'bitte noch nicht posten'}</Text>
          <Button key="ampel-weg" label="ausblenden" onPress={() => void saveAmpel($, () => null)} />
        </Box>
        {current.fixes.map((fix, n) => <Text dimColor>{n + 1}. {fix}</Text>)}
      </Box>
    )
  })

  // ---------- Das Dashboard ----------
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Input } = $.ui.resolve(e)
    const current = await read($, tab)
    const now = berlin()

    const tabs = (
      <Box flexDirection="row" gap={1} flexWrap="wrap">
        {TABS.map(t => (
          <Button key={`tab-${t.id}`} label={t.label} variant={t.id === current ? 'primary' : 'secondary'}
            onPress={() => void update($, tab, () => t.id)} />
        ))}
      </Box>
    )

    let body
    if (current === 'ideen') {
      const list = await read($, ideas)
      const open = list.filter(i => i.stage < 4)
      const postedToday = list.some(i => i.postedAt === now.day)
      body = (
        <Box flexDirection="column" gap={1}>
          {postedToday
            ? <Text color="yellow">Heute ist schon ein Video raus – das nächste lieber morgen.</Text>
            : <Text>Heute noch frei! Beste Zeit: 18–20 Uhr.</Text>}
          <Input key="new-idea" label="Neue Idee" placeholder="z. B. Tamagotchi für die beste Freundin" submitLabel="speichern"
            onSubmit={value => void addIdea($, value)} />
          {open.length === 0 && <Text dimColor>Noch keine Ideen. Tipp oben eine ein oder erzähl sie mir im Chat.</Text>}
          {open.map(idea => (
            <Box flexDirection="row" gap={1}>
              <Text>{STAGES[idea.stage]} · {idea.text}</Text>
              <Button key={`next-${idea.id}`} label={`→ ${STAGES[idea.stage + 1]}`}
                onPress={() => void saveIdeas($, l => l.map((i): Idea => i.id === idea.id
                  ? { ...i, stage: (i.stage + 1) as Stage, ...(i.stage + 1 === 4 ? { postedAt: berlin().day } : {}) }
                  : i))} />
              <Button key={`del-${idea.id}`} label="✕" onPress={() => void saveIdeas($, l => l.filter(i => i.id !== idea.id))} />
            </Box>
          ))}
          <Text dimColor>Schon gepostet: {list.filter(i => i.stage === 4).length}</Text>
        </Box>
      )
    } else if (current === 'prompts') {
      const list = await read($, prompts)
      body = (
        <Box flexDirection="column" gap={1}>
          <Text dimColor>Deine fertigen Prompts – für alle, die „PROMPT“ kommentieren.</Text>
          <Input key="new-prompt" label="Neu" placeholder="Name: der Prompt" submitLabel="in den Tresor"
            onSubmit={value => void addPrompt($, value)} />
          {list.length === 0 && <Text dimColor>Noch leer. Sag mir einfach „speicher den Prompt“, wenn einer fertig ist.</Text>}
          {list.map((p: PromptItem) => (
            <Box flexDirection="column">
              <Box flexDirection="row" gap={1}>
                <Text bold>{p.title}</Text>
                <Button key={`copy-${p.id}`} label="📋 Kopieren" onPress={press => void (async () => {
                  const r = await $.ui.copy({ text: p.text, surface: press.surface })
                  if (r.isCopied) $.ui.toast('Kopiert! 📋')
                  else await $.session.append({ message: { type: 'system', content: [{ type: 'text', text: `🔐 ${p.title}:\n\n${p.text}` }] } })
                })()} />
                <Button key={`delp-${p.id}`} label="✕" onPress={() => void savePrompts($, l => l.filter(x => x.id !== p.id))} />
              </Box>
              <Text dimColor>{p.text.length > 90 ? `${p.text.slice(0, 90)}…` : p.text}</Text>
            </Box>
          ))}
        </Box>
      )
    } else if (current === 'zahlen') {
      const list = await read($, stats)
      const byFormat = new Map<string, Stats[]>()
      for (const s of list) byFormat.set(s.format, [...(byFormat.get(s.format) ?? []), s])
      const formats = [...byFormat.entries()]
        .map(([format, rows]) => ({ format, count: rows.length, score: rows.reduce((a, s) => a + rate(s), 0) / rows.length }))
        .sort((a, b) => b.score - a.score)
      body = (
        <Box flexDirection="column" gap={1}>
          <Text dimColor>Schick mir einen Screenshot deiner TikTok-Zahlen oder tipp sie mir – ich trage sie ein.</Text>
          {list.length === 0 && <Text dimColor>Noch keine Zahlen.</Text>}
          {formats.length > 0 && <Text bold>Was bei dir am besten läuft</Text>}
          {formats.map((f, n) => (
            <Text>{n === 0 ? '🏆' : '·'} {f.format} – {f.count} Video{f.count === 1 ? '' : 's'}{f.count < 4 ? ' (noch zu früh, ca. 4 Versuche abwarten)' : ''}</Text>
          ))}
          {list.length > 0 && <Text bold>Letzte Videos</Text>}
          {list.slice(-6).reverse().map(s => (
            <Text>{s.title}: 👀 {s.views} · ↗️ {s.shares} · 🔖 {s.saves} · 💬 {s.promptComments}</Text>
          ))}
        </Box>
      )
    } else if (current === 'geburtstage') {
      const list = [...(await read($, birthdays))].sort((a, b) => (daysUntil(a.date) ?? 999) - (daysUntil(b.date) ?? 999))
      body = (
        <Box flexDirection="column" gap={1}>
          <Text dimColor>Ich warne dich, bevor ein Video ein Geschenk zu früh verrät.</Text>
          <Input key="new-bday" label="Neu" placeholder="Ani 12.03." submitLabel="merken"
            onSubmit={value => { const m = /^(.+?)\s+(\d{1,2}\.\d{1,2}\.?)$/.exec(value.trim()); if (m) void addBirthday($, m[1]!, m[2]!) }} />
          {list.length === 0 && <Text dimColor>Noch keine Geburtstage eingetragen.</Text>}
          {list.map(b => {
            const days = daysUntil(b.date)
            return (
              <Box flexDirection="row" gap={1}>
                <Text>🎂 {b.name} · {b.date} · {days === 0 ? 'heute!' : `in ${days} Tagen`}{b.gift ? ` · 🎁 ${b.gift}` : ''}</Text>
                <Button key={`delb-${b.id}`} label="✕" onPress={() => void saveBirthdays($, l => l.filter(x => x.id !== b.id))} />
              </Box>
            )
          })}
        </Box>
      )
    } else {
      const s = await read($, prefs)
      body = (
        <Box flexDirection="column" gap={1}>
          <Text bold>Einstellungen</Text>
          <Box flexDirection="row" gap={1}>
            <Text>🪙 Spar-Modus (kleines Modell für Tippfehler & Übersetzen): {s.isSaving ? 'an' : 'aus'}</Text>
            <Button key="toggle-saving" label={s.isSaving ? 'ausschalten' : 'einschalten'} onPress={() => void savePrefs($, v => ({ ...v, isSaving: !v.isSaving }))} />
          </Box>
          <Box flexDirection="row" gap={1}>
            <Text>⏰ Erinnerung um 18 Uhr: {s.isReminding ? 'an' : 'aus'}</Text>
            <Button key="toggle-remind" label={s.isReminding ? 'ausschalten' : 'einschalten'} onPress={() => void savePrefs($, v => ({ ...v, isReminding: !v.isReminding }))} />
          </Box>
          <Text bold>Vor dem Upload 🚦</Text>
          <Text>• Erstes Bild = Ergebnis, hell, Funktionen sichtbar</Text>
          <Text>• Ein Text in den ersten 2 s, max. 2 Zeilen</Text>
          <Text>• 8–15 s, ein Stil pro Video</Text>
          <Text>• Privates unkenntlich, kein Geschenk-Spoiler</Text>
          <Text dimColor>Tipp /hilfe für alle Kurzbefehle.</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column" gap={1}>
        {tabs}
        {body}
      </Box>
    )
  })
}
