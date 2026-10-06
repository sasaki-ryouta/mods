/** The relative age label of the latest completed main-loop turn (`7m ago`). */
export type AgeLabel = string

declare module 'claude-code' {
  interface PluginState {
    turn: { completedAt: number | null; age: AgeLabel | null }
  }
}
