import '@testing-library/jest-dom/vitest'

// Node 24+ exposes a built-in `localStorage` global that is unusable unless the
// process was started with `--localstorage-file`, and it shadows the working
// `Storage` jsdom installs on the window. The project targets Node 22, where
// jsdom wins and this guard is a no-op; on newer local toolchains it restores
// a usable Storage so `lib/session` behaves as it does in a browser.
if (typeof window.localStorage?.getItem !== 'function') {
  const entries = new Map<string, string>()

  const storage: Storage = {
    get length() {
      return entries.size
    },
    key: (index) => [...entries.keys()][index] ?? null,
    getItem: (key) => entries.get(String(key)) ?? null,
    setItem: (key, value) => void entries.set(String(key), String(value)),
    removeItem: (key) => void entries.delete(String(key)),
    clear: () => entries.clear(),
  }

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: storage,
  })
}
