import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'girly-prompts', component: 'Pane', requestId: 'girly-prompts',
  props: { title: 'Girly Prompts', isFocused: true, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

test('eine Idee wird gespeichert und wandert weiter', async ($, on) => {
  mock.store(on)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    if (surface === 'terminal') await ui.input({ key: 'new', text: 'Tamagotchi für Ani' })
    expect((await ui.find({ type: 'Text', text: /Tamagotchi/ }))?.text).toContain('Idee')
    await ui.unmount()
  }
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const next = await ui.find({ type: 'Button', label: /Skript/ })
  await ui.press({ key: next!.key! })
  expect((await ui.find({ type: 'Text', text: /Tamagotchi/ }))?.text).toContain('Skript')
  await ui.unmount()
})
