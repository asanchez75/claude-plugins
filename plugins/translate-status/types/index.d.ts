export type Translation = { source: string; french: string }

declare module 'claude-code' {
  interface PluginState {
    'translate-status': {
      isEnabled: boolean
      // The last finished translation; null while one runs or when disabled.
      shown: Translation | null
      // The last finished translation, kept for /translate show.
      last: Translation | null
    }
  }
}
