import { compile, serialize, stringify } from 'stylis'

const injected = new Set<string>()

export function scopeHash(name: string): string {
  let hash = 5381
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 33) ^ name.charCodeAt(index)
  }
  return (hash >>> 0).toString(36).slice(0, 6)
}

export function injectStyles(name: string, css: string): void {
  if (!css || injected.has(name)) {
    return
  }

  injected.add(name)

  const hash = scopeHash(name)
  const scoped = serialize(compile(`[data-xz-${hash}]{${css}}`), stringify)
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(scoped)
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
}

export function applyScope(element: Element, name: string): void {
  element.setAttribute(`data-xz-${scopeHash(name)}`, '')
}