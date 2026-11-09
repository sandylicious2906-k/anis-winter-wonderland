export type Stage = 0 | 1 | 2 | 3 | 4
export type Idea = { id: string; text: string; stage: Stage; postedAt?: string }
export type PromptItem = { id: string; title: string; text: string }
export type Stats = {
  id: string; title: string; format: string; date: string
  views: number; shares: number; saves: number; promptComments: number
}
export type Birthday = { id: string; name: string; date: string; gift?: string }
export type Light = 'gruen' | 'gelb' | 'rot'
export type Ampel = { light: Light; title: string; fixes: string[]; at: string }
export type Prefs = { isSaving: boolean; isReminding: boolean }
export type Tab = 'ideen' | 'prompts' | 'zahlen' | 'geburtstage' | 'mehr'

declare module 'claude-code' {
  interface PluginState {
    'girly-prompts': {
      ideas: Shaped<Idea[]>
      prompts: Shaped<PromptItem[]>
      stats: Shaped<Stats[]>
      birthdays: Shaped<Birthday[]>
      ampel: Shaped<Ampel | null>
      settings: Prefs
      tab: Tab
    }
  }
}
