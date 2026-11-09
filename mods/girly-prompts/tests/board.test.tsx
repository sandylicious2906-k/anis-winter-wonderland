import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'girly-prompts', component: 'Pane', requestId: 'girly-prompts',
  props: { title: 'Girly Prompts', isFocused: true, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 60 }, view: {} },
} as const

async function start($: any, on: any) {
  mock.store(on)
  on('command.register', (_: unknown, e: { name: string }) => ({ value: { command: e.name } }))
  on('tool.register', () => ({ value: {} }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.toast', () => ({ value: undefined }))
  on('clock.every', () => ({ value: undefined }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
}

test('Ideen: eintippen und weiterschieben', async ($, on) => {
  await start($, on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    if (surface === 'terminal') await ui.input({ key: 'new-idea', text: 'Tamagotchi für Ani' })
    expect((await ui.find({ type: 'Text', text: /Tamagotchi/ }))?.text).toContain('Idee')
    await ui.unmount()
  }
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const next = await ui.find({ type: 'Button', text: /Skript/ })
  await ui.press({ key: next!.key! })
  expect((await ui.find({ type: 'Text', text: /Tamagotchi/ }))?.text).toContain('Skript')
  await ui.unmount()
})

test('Prompt-Tresor und Geburtstage per Befehl', async ($, on) => {
  await start($, on)
  expect((await $.command.run({ command: 'prompt', args: 'Zimmer: Bau mir ein Zimmer' })).text).toContain('Tresor')
  expect((await $.command.run({ command: 'geburtstag', args: 'Ani 12.03.' })).text).toContain('Ani')
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'tab-prompts' })
  expect(await ui.find({ type: 'Text', text: /^Zimmer$/ })).toBeDefined()
  await ui.press({ key: 'tab-geburtstage' })
  expect((await ui.find({ type: 'Text', text: /Ani/ }))?.text).toContain('12.03.')
  await ui.unmount()
})

test('Claude setzt die Ampel, sie steht über dem Eingabefeld', async ($, on) => {
  await start($, on)
  await $.tool.call({ tool: 'mcp__girly-prompts__ampel', farbe: 'gelb', video: 'Zimmer-Tour', fixes: ['Heller machen'] } as never)
  const ui = await $.ui.mount({ plugin: 'girly-prompts', component: 'AbovePrompt', surface: 'desktop', props: { hasSurvey: false } } as never)
  expect((await ui.find({ type: 'Text', text: /Zimmer-Tour/ }))?.text).toContain('🟡')
  await ui.unmount()
})

test('Erklär-Regel steht im Systemprompt', async ($, on) => {
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'x', scope: 'shared' }] }))
  await start($, on)
  const r = await $.prompt.compose({ model: 'm', promptModel: 'm', surfaces: [], tools: [], outputStyle: null, traits: [] } as never)
  expect(r.sections.at(-1)?.text).toContain('ohne Fachwörter')
})

test('Privat-Wächter hält eine E-Mail vor dem Veröffentlichen an', async ($, on) => {
  on('tool.call', () => ({ result: {} }))
  await start($, on)
  const r = await $.tool.call({ tool: 'mcp__posty__create_post', text: 'Schreib mir: sandy@example.com' } as never)
  expect(r.deny).toContain('Privat-Wächter')
})
