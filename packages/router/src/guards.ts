import { addCleanup } from 'xzo'
import type { Owner } from 'xzo'
import type { GuardFn, GuardPhase } from './types'

export const routeEnterGuards = new Map<string, GuardFn[]>()
export const routeLeaveGuards = new Map<string, GuardFn[]>()

const enterGuardInitedForOwner = new WeakSet<object>()
const leaveGuardInitedForOwner = new WeakSet<object>()

export async function runGuards(
    guards: GuardFn[] | undefined,
): Promise<{ cancel: boolean; redirect?: string }> {
    if (!guards || guards.length === 0) return { cancel: false }
    const results = await Promise.allSettled(
        guards.map((fn) => Promise.resolve().then(fn)),
    )

    for (const result of results) {
        if (result.status === 'rejected') return { cancel: true }
        if (result.value === false) return { cancel: true }
        if (typeof result.value === 'object' && 'redirect' in result.value) {
            return { cancel: true, redirect: result.value.redirect }
        }
    }
    return { cancel: false }
}

/**
 * Registers an enter or leave guard for the given owner (route component).
 * Called internally by the `ctx.guard` context extension.
 */
export function registerGuard(
    owner: Owner,
    phase: GuardPhase,
    guardFn: GuardFn,
): void {
    if (phase === 'enter') {
        if (!enterGuardInitedForOwner.has(owner)) {
            routeEnterGuards.set(owner.name, [])
            enterGuardInitedForOwner.add(owner)
        }
        routeEnterGuards.get(owner.name)!.push(guardFn)
        return;

    }

    if (!leaveGuardInitedForOwner.has(owner)) {
        routeLeaveGuards.set(owner.name, [])
        leaveGuardInitedForOwner.add(owner)
    }

    routeLeaveGuards.get(owner.name)!.push(guardFn)

    addCleanup(owner, () => {
        const g = routeLeaveGuards.get(owner.name)
        if (g) {
            const i = g.indexOf(guardFn)
            if (i >= 0) g.splice(i, 1)
        }
    })
}