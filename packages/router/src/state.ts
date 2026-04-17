import { signal } from '@preact/signals-core'

export const path = signal(location.pathname)
export const query = signal(new URLSearchParams(location.search))
export const pageParamsMap = new WeakMap<Element, Record<string, string>>()

export let activeRouteId: string | null = null

export function setActiveRouteId(id: string | null) { activeRouteId = id }