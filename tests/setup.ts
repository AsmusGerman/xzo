// Declare the __DEV__ global injected by Vite's `define` plugin.
// Tests run outside Vite so we provide it here.
(globalThis as unknown as { __DEV__: boolean }).__DEV__ = false
