import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Idea, Stage } from '../types'

const PANE = 'girly-prompts'
const TITLE = '🎀 Girly Prompts'
const STORE_KEY = 'ideas'
const STAGES = ['💡 Idee', '✍️ Skript', '🎬 Gedreht', '🚦 Gecheckt', '✅ Gepostet'] as const

const ideas = atom({ plugin: 'girly-prompts', key: 'ideas' } as const, [], {
  shape: 'ideas-1',
})

const today = () => new Date().toISOString().slice(0, 10)

// Every change lands in the session state (redraws the pane) and in the
// store, so the board is still there in the next session.
async function change($: EngineInterface, fn: (list: Idea[]) => Idea[]) {
  await update($, ideas, list => fn([...list]))
  await $.store.set(STORE_KEY, await read($, ideas))
}

async function addIdea($: EngineInterface, text: string) {
  const clean = text.trim()
  if (!clean) return false
  const idea: Idea = { id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`, text: clean, stage: 0 }
  await change($, list => [...list, idea])
  return true
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const saved = await $.store.get(STORE_KEY)
    if (Array.isArray(saved)) await update($, ideas, () => saved as Idea[])

    await $.command.register({ name: 'girly', description: 'Girly-Prompts-Dashboard öffnen' })
    await $.command.register({ name: 'idee', description: 'Neue Girly-Prompts-Videoidee speichern: /idee <Text>' })
    void $.ui.open({ id: PANE, title: TITLE })

    return next(e)
  })

  on('command.run', { command: 'girly' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'Girly-Prompts-Dashboard ist offen 🎀' }
  })

  on('command.run', { command: 'idee' }, async ($, e) => {
    const isAdded = await addIdea($, e.args)
    if (isAdded) void $.ui.open({ id: PANE, title: TITLE })
    return { text: isAdded ? `Idee gespeichert: „${e.args.trim()}“ 💡` : 'Schreib die Idee direkt dahinter: /idee <Text>' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Input } = $.ui.resolve(e)
    const list = await read($, ideas)
    const open = list.filter(i => i.stage < 4)
    const posted = list.filter(i => i.stage === 4)
    const postedToday = posted.some(i => i.postedAt === today())

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text bold>Heute posten?</Text>
          {postedToday
            ? <Text color="yellow">Heute ist schon ein Video raus – das nächste lieber morgen.</Text>
            : <Text>Frei! Beste Zeit: 18–20 Uhr.</Text>}
        </Box>

        <Input key="new" label="Neue Idee" placeholder="z. B. Tamagotchi für die beste Freundin" submitLabel="speichern"
          onSubmit={value => void addIdea($, value)} />

        <Box flexDirection="column">
          <Text bold>In Arbeit ({open.length})</Text>
          {open.length === 0 && <Text dimColor>Noch keine Ideen. Tipp oben eine ein oder nutz /idee.</Text>}
          {open.map(idea => (
            <Box flexDirection="row" gap={1}>
              <Text>{STAGES[idea.stage]} · {idea.text}</Text>
              <Button key={`next-${idea.id}`} label={`→ ${STAGES[idea.stage + 1]}`}
                onPress={() => void change($, l => l.map(i => i.id === idea.id
                  ? { ...i, stage: (i.stage + 1) as Stage, ...(i.stage + 1 === 4 ? { postedAt: today() } : {}) }
                  : i))} />
              <Button key={`del-${idea.id}`} label="✕"
                onPress={() => void change($, l => l.filter(i => i.id !== idea.id))} />
            </Box>
          ))}
        </Box>

        <Box flexDirection="column">
          <Text bold>Vor dem Upload 🚦</Text>
          <Text>• Erstes Bild = Ergebnis, hell, Funktionen sichtbar</Text>
          <Text>• Ein Text in den ersten 2 s, max. 2 Zeilen</Text>
          <Text>• 8–15 s, ein Stil pro Video</Text>
          <Text>• Suchbegriffe: Claude, Geschenk, beste Freundin</Text>
          <Text>• „Kommentier PROMPT“ nur, wenn der Prompt bereitliegt</Text>
          <Text>• Privates unkenntlich, kein Geschenk-Spoiler</Text>
          <Text dimColor>Ausführlich: Video schicken und „Check“ sagen.</Text>
        </Box>

        {posted.length > 0 && (
          <Text dimColor>Schon gepostet: {posted.length} · Ein Format braucht ca. 4 Versuche.</Text>
        )}
      </Box>
    )
  })
}
