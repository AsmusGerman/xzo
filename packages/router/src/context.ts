import { registerContextExtension, registerLibExtension } from 'xzo'
import type { GuardFn } from './types'
import { path, query, pageParamsMap } from './state'
import { registerGuard } from './guards'
import { navigate } from './signals'
import { routerFactory } from './outlet'
import { page } from './page'

// No exports — this file is imported for its side effects only.
// Each call to registerContextExtension wires up the context properties for every page component.

//todo: the reserved keywords to const.ts

registerContextExtension('navigate', () => navigate)
registerContextExtension('path', () => path)
registerContextExtension('query', () => query)
registerContextExtension('params', (_owner, host) => pageParamsMap.get(host as Element) ?? {})

registerContextExtension('guard', (owner) => {
    // todo: enter | leave to type.ts
    return (phaseOrFn: GuardFn | 'enter' | 'leave', fn?: GuardFn): void => {
        const phase: 'enter' | 'leave' = typeof phaseOrFn === 'string' ? phaseOrFn : 'enter'
        const guardFn = typeof phaseOrFn === 'function' ? phaseOrFn : fn!
        registerGuard(owner, phase, guardFn)
    }
})

registerContextExtension('redirect', () => {
    return (id: string): { redirect: string } => ({ redirect: id })
})

registerLibExtension('router', routerFactory)
registerLibExtension('page', page)