declare module 'stylis' {
  export function compile(css: string): unknown
  export function serialize(ast: unknown, middleware: unknown): string
  export const stringify: unknown
}