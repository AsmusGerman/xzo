import type { ReadonlySignal, Signal } from '@preact/signals-core'
import type { Context } from './core/context'

export type Key = string | number
export type AnySignal<T = unknown> = Signal<T> | ReadonlySignal<T>

export type EachOptions = {
  lookup?: boolean
}

export type Unwrap<T> = {
  [K in keyof T]: T[K] extends AnySignal<infer V> ? V : T[K]
}

export type SourceChildren = {
  children?: unknown
}

export type EachSource<T> = {
  each: (props: { children?: (item: T, index: number) => unknown }) => Node
  empty: (props: SourceChildren) => Node
  first: (props: { children?: (item: T) => unknown }) => Node
  last: (props: { children?: (item: T) => unknown }) => Node
  add: (item: T) => void
  remove: (key: Key) => void
  update: (key: Key, patch: Partial<T>) => void
  set: (items: T[]) => void
}

export type AsyncSource<T> = {
  loading: (props: SourceChildren) => Node
  reloading: (props: SourceChildren) => Node
  data: (props: { children?: (data: T) => unknown }) => Node
  error: (props: { children?: (error: Error) => unknown }) => Node
}

export type ComponentResult = {
  template: Node
  styles?: string
  scope?: Record<string, unknown>
  [name: string]: unknown
}

export type ComponentFactory = (ctx: Context) => ComponentResult

export function isSignal<T = unknown>(value: unknown): value is AnySignal<T> {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'value' in (value as Record<string, unknown>) &&
    'subscribe' in (value as Record<string, unknown>)
  )
}

export function isWritableSignal<T = unknown>(value: unknown): value is Signal<T> {
  if (!isSignal<T>(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value) as object | null
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
  return typeof descriptor?.set === 'function'
}

export function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
}

export function toPropertyName(value: string): string {
  return value.replace(/-([a-z])/g, (_, character: string) => character.toUpperCase())
}