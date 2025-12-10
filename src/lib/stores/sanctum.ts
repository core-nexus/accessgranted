/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SANCTUM STORE - Keeper authentication state
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { writable } from 'svelte/store'
import { browser } from '$app/environment'

const SANCTUM_KEY = 'aetheria_sanctum_key'

interface KeeperSession {
  keeperId: string
  name: string
  authenticatedAt: number
}

/**
 * Create the keeper session store
 */
function createSanctumStore() {
  const { subscribe, set } = writable<KeeperSession | null>(null)

  // Initialize from localStorage on browser
  if (browser) {
    const stored = localStorage.getItem(SANCTUM_KEY)
    if (stored) {
      try {
        const session = JSON.parse(stored) as KeeperSession
        // Session expires after 24 hours
        if (Date.now() - session.authenticatedAt < 24 * 60 * 60 * 1000) {
          set(session)
        } else {
          localStorage.removeItem(SANCTUM_KEY)
        }
      } catch {
        localStorage.removeItem(SANCTUM_KEY)
      }
    }
  }

  return {
    subscribe,
    authenticate: (keeperId: string, name: string) => {
      const session: KeeperSession = {
        keeperId,
        name,
        authenticatedAt: Date.now(),
      }
      set(session)
      if (browser) {
        localStorage.setItem(SANCTUM_KEY, JSON.stringify(session))
      }
    },
    depart: () => {
      set(null)
      if (browser) {
        localStorage.removeItem(SANCTUM_KEY)
      }
    },
  }
}

export const sanctumStore = createSanctumStore()
