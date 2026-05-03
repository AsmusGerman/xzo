import { registerContextExtension, registerLibExtension } from 'xzo'
import type { GuardFn, GuardPhase } from './types'
import { path, query, pageParamsMap } from './state'
import { registerGuard } from './guards'
import { navigate } from './signals'
import { routerFactory } from './outlet'
import { page } from './page'
import {
    CTX_NAVIGATE,
    CTX_PATH,
    CTX_QUERY,
    CTX_PARAMS,
    CTX_GUARD,
    CTX_REDIRECT,
    LIB_ROUTER,
    LIB_PAGE,
} from './const'

// No exports — this file is imported for its side effects only.
// Each call to registerContextExtension wires up the context properties for every page component.

registerContextExtension(CTX_NAVIGATE, () => navigate)
registerContextExtension(CTX_PATH,     () => path)
registerContextExtension(CTX_QUERY,    () => query)
registerContextExtension(CTX_PARAMS,   (_owner, host) => pageParamsMap.get(host as Element) ?? {})

registerContextExtension(CTX_GUARD, (owner) => {
    return (phaseOrFn: GuardFn | GuardPhase, fn?: GuardFn): void => {
        const phase: GuardPhase = typeof phaseOrFn === 'string' ? phaseOrFn : 'enter'
        const guardFn = typeof phaseOrFn === 'function' ? phaseOrFn : fn!
        registerGuard(owner, phase, guardFn)
    }
})

registerContextExtension(CTX_REDIRECT, () => {
    return (id: string): { redirect: string } => ({ redirect: id })
})

registerLibExtension(LIB_ROUTER, routerFactory)
registerLibExtension(LIB_PAGE,   page)