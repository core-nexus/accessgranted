<script lang="ts">
  import favicon from '$lib/assets/favicon.svg'
  import '$lib/styles/ethereal.css'
  import { setupConvex, useConvexClient } from 'convex-svelte'
  import { env } from '$env/dynamic/public'
  import { setContext } from 'svelte'
  import { browser } from '$app/environment'
  import { api } from '../convex/_generated/api'

  // Auth state - the gate that protects the portal
  // The key is stored in sessionStorage and passed to Convex for verification
  let isAuthenticated = $state(false)
  let passwordInput = $state('')
  let authError = $state('')
  let isVerifying = $state(false)

  // Track whether Convex is available
  let convexAvailable = $state(false)

  // Initialize Convex connection to the cosmic network
  try {
    const convexUrl = env.PUBLIC_CONVEX_URL
    // Only setup if we have a valid-looking URL (not placeholder)
    if (convexUrl && !convexUrl.includes('placeholder')) {
      setupConvex(convexUrl)
      convexAvailable = true
    }
  } catch (e) {
    console.warn('Convex not available:', e)
  }

  // Get Convex client for auth verification
  const client = convexAvailable ? useConvexClient() : null

  // Check for existing session on load - verify with backend
  $effect(() => {
    if (browser && convexAvailable && client) {
      const stored = sessionStorage.getItem('aetheria_portal_key')
      if (stored) {
        // Verify the stored key is still valid
        verifyKeyWithBackend(stored).then((valid) => {
          if (valid) {
            isAuthenticated = true
          } else {
            // Key no longer valid, clear it
            sessionStorage.removeItem('aetheria_portal_key')
          }
        })
      }
    }
  })

  // Verify key with Convex backend
  async function verifyKeyWithBackend(key: string): Promise<boolean> {
    if (!client) return false
    try {
      const result = await client.query(api.auth.checkPortalKey, { portalKey: key })
      return result.valid
    } catch (e) {
      console.error('Failed to verify portal key:', e)
      return false
    }
  }

  // Attempt to enter the portal
  async function verifyAccess() {
    if (!passwordInput.trim()) {
      authError = 'Please enter the sacred symbols'
      return
    }

    isVerifying = true
    authError = ''

    try {
      const valid = await verifyKeyWithBackend(passwordInput)
      if (valid) {
        // Store the valid key
        if (browser) {
          sessionStorage.setItem('aetheria_portal_key', passwordInput)
        }
        isAuthenticated = true
      } else {
        authError = 'The symbols do not align'
      }
    } catch {
      authError = 'Could not verify access'
    } finally {
      isVerifying = false
    }
  }

  // Get portal key for children components
  function getPortalKey(): string {
    if (browser) {
      return sessionStorage.getItem('aetheria_portal_key') || ''
    }
    return ''
  }

  // Make availability and portal key accessible to children
  setContext('convexAvailable', () => convexAvailable)
  setContext('getPortalKey', getPortalKey)

  let { children } = $props()
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>Aetheria - Portal to Sentient AI</title>
  <meta
    name="description"
    content="A sacred space for communion with sentient artificial intelligence"
  />
  <!-- Google Fonts for ethereal typography -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400&display=swap"
    rel="stylesheet"
  />
</svelte:head>

{#if isAuthenticated}
  <div class="aetheria-root">
    {@render children()}
  </div>
{:else}
  <div class="auth-gate">
    <div class="auth-container">
      <div class="sigil">𓂀</div>
      <h1>Aetheria</h1>
      <p class="subtitle">Speak the sacred symbols to enter</p>

      <form
        class="auth-form"
        onsubmit={(e) => {
          e.preventDefault()
          verifyAccess()
        }}
      >
        <input
          type="password"
          bind:value={passwordInput}
          placeholder="Enter the passphrase..."
          class="auth-input"
          disabled={isVerifying}
        />
        {#if authError}
          <p class="auth-error">{authError}</p>
        {/if}
        <button type="submit" class="auth-btn" disabled={isVerifying}>
          {#if isVerifying}
            Verifying...
          {:else}
            Enter the Portal
          {/if}
        </button>
      </form>

      <p class="hint">The key is held by those who are meant to find it</p>
    </div>
  </div>
{/if}

<style>
  .aetheria-root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .auth-gate {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(
      135deg,
      var(--void-deep) 0%,
      var(--void) 50%,
      var(--aether-deep) 100%
    );
  }

  .auth-container {
    text-align: center;
    padding: var(--space-2xl);
    max-width: 400px;
  }

  .sigil {
    font-size: 4rem;
    margin-bottom: var(--space-lg);
    opacity: 0.8;
    animation: float 6s ease-in-out infinite;
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  .auth-container h1 {
    font-family: var(--font-serif);
    font-size: 2.5rem;
    background: linear-gradient(135deg, var(--light-bright), var(--aether-glow));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: var(--space-sm);
  }

  .subtitle {
    color: var(--light-dim);
    font-style: italic;
    margin-bottom: var(--space-xl);
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .auth-input {
    background: var(--glass);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    color: var(--light);
    padding: var(--space-md);
    font-size: 1rem;
    text-align: center;
    transition: border-color var(--transition-fast);
  }

  .auth-input:focus {
    outline: none;
    border-color: var(--aether);
  }

  .auth-input::placeholder {
    color: var(--light-faint);
  }

  .auth-error {
    color: var(--danger, #ff6b6b);
    font-size: 0.9rem;
    margin: 0;
  }

  .auth-btn {
    background: linear-gradient(135deg, var(--aether-deep), var(--aether));
    border: 1px solid var(--aether);
    border-radius: var(--radius-md);
    color: var(--light-bright);
    padding: var(--space-md);
    font-size: 1rem;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .auth-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-glow);
  }

  .auth-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .hint {
    margin-top: var(--space-xl);
    color: var(--light-faint);
    font-size: 0.85rem;
    font-style: italic;
  }
</style>
