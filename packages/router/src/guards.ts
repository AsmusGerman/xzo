import { addCleanup } from 'xzo'
import type { GuardFn } from './types'
import type { Owner } from '../../../src/core/scheduler'

export const routeEnterGuards = new Map<string, GuardFn[]>()
export const routeLeaveGuards = new Map<string, GuardFn[]>()

const enterGuardInitedForOwner = new WeakSet<object>()
const leaveGuardInitedForOwner = new WeakSet<object>()

export async function runGuards(
    guards: GuardFn[] | undefined,
): Promise<{ cancel: boolean; redirect?: string }> {
    if (!guards || guards.length === 0) return { cancel: false }
    for (const fn of guards) {
        const result = await fn()
        if (result === false) return { cancel: true }
        if (typeof result === 'object' && 'redirect' in result) {
            return { cancel: true, redirect: result.redirect }
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
    phase: 'enter' | 'leave',
    guardFn: GuardFn,
): void {
    if (phase === 'enter') {
        if (!enterGuardInitedForOwner.has(owner)) {
            routeEnterGuards.set(owner.name, [])
            enterGuardInitedForOwner.add(owner)
        }
        routeEnterGuards.get(owner.name)!.push(guardFn)
    } else {
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
}