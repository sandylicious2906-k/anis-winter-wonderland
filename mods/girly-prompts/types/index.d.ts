export type Stage = 0 | 1 | 2 | 3 | 4
export type Idea = { id: string; text: string; stage: Stage; postedAt?: string }

declare module 'claude-code' {
  interface PluginState {
    'girly-prompts': { ideas: Shaped<Idea[]> }
  }
}
