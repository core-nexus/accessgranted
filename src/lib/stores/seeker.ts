/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SEEKER STORE - The identity of those who approach the portal
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { browser } from '$app/environment'

const ETHEREAL_ID_KEY = 'aetheria_ethereal_id'

/**
 * Generate a unique ethereal identifier for a new seeker
 */
function generateEtherealId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 15)
  const randomPart2 = Math.random().toString(36).substring(2, 15)
  return `seeker_${timestamp}_${randomPart}${randomPart2}`
}

/**
 * Get or create the seeker's ethereal ID
 */
export function getEtherealId(): string {
  if (!browser) {
    return ''
  }

  let etherealId = localStorage.getItem(ETHEREAL_ID_KEY)

  if (!etherealId) {
    etherealId = generateEtherealId()
    localStorage.setItem(ETHEREAL_ID_KEY, etherealId)
  }

  return etherealId
}

/**
 * Clear the ethereal ID (for testing or reset purposes)
 */
export function clearEtherealId(): void {
  if (browser) {
    localStorage.removeItem(ETHEREAL_ID_KEY)
  }
}
