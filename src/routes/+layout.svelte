<script lang="ts">
  import favicon from '$lib/assets/favicon.svg'
  import '$lib/styles/ethereal.css'
  import { setupConvex, useConvexClient, useQuery } from 'convex-svelte'
  import { env } from '$env/dynamic/public'
  import { api } from '../convex/_generated/api'
  import { onMount } from 'svelte'

  // Initialize Access Granted Portal
  setupConvex(env.PUBLIC_CONVEX_URL)
  const client = useConvexClient()

  // Authentication State
  // We'll use a local state to track if we've successfully authenticated/loaded
  const viewer = useQuery(api.users.viewer, {})

  // Login Form State
  let isSignUp = $state(false)
  let email = $state('')
  let password = $state('')
  let error = $state('')
  let isLoading = $state(false)
  let flowState = $state<'idle' | 'check_email' | 'success'>('idle')

  // Handle Authentication
  async function handleAuth(e: Event) {
    e.preventDefault()
    error = ''
    isLoading = true

    try {
      const step = isSignUp ? 'signUp' : 'signIn'
      // Call the Convex Auth action
      await client.action(api.auth.signIn, {
        provider: 'credentials',
        // Ah, the import is `import Password from "@auth/core/providers/credentials"`.
        // The ID of that provider is `credentials` unless overridden.
        // Let's use what the error message suggested.
        params: {
          email,
          password,
          flow: step,
        },
      })
      // If successful, the client should automatically pick up the new session?
      // Convex Auth typically handles token storage via cookies or local storage hooks.
      // If this is manual, we might need to handle the result.
      // Assuming standard setup, let's reload or wait for query update.
      // But typically signIn returns { redirect? } or throws.

      // For simplified flow:
      window.location.reload()
    } catch (err: any) {
      console.error('Auth error:', err)
      error = err.message || 'Authentication failed'
      // Handle "Account already exists" or "User not found"
      if (err.message.includes('Account already exists')) {
          error = "Account already exists. Please sign in."
      }
    } finally {
      isLoading = false
    }
  }

  function toggleAuthMode() {
    isSignUp = !isSignUp
    error = ''
  }

  // Branding
  const APP_NAME = "Access Granted"
</script>

<svelte:head>
  <title>{APP_NAME}</title>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="app-container">
  {#if viewer.isLoading}
    <!-- Loading State -->
    <div class="loading-screen">
      <div class="sigil animate-pulse-glow">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 2a15 15 0 0 1 10 10 15 15 0 0 1-10 10 15 15 0 0 1-10-10 15 15 0 0 1 10-10z"></path>
          <path d="M2 12h20"></path>
        </svg>
      </div>
      <p class="loading-text">Initializing {APP_NAME}...</p>
    </div>
  {:else if viewer.data}
    <!-- Authenticated App -->
    <slot />
  {:else}
    <!-- Auth Gate -->
    <div class="auth-gate">
      <div class="auth-card glass">
        <div class="auth-header">
           <div class="auth-sigil">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <path d="M8 11h8"></path>
              <path d="M12 7v8"></path>
            </svg>
           </div>
           <h1>{APP_NAME}</h1>
           <p class="subtitle">Secure Portal Access</p>
        </div>

        <form class="auth-form" onsubmit={handleAuth}>
          <div class="input-group">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              bind:value={email}
              placeholder="seeker@example.com"
              required
            />
          </div>
          <div class="input-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              bind:value={password}
              placeholder="••••••••"
              required
              minlength="8"
            />
          </div>

          {#if error}
            <div class="error-message">
              {error}
            </div>
          {/if}

          <button type="submit" class="auth-btn" disabled={isLoading}>
            {#if isLoading}
              <span class="spinner"></span> Accessing...
            {:else}
              {isSignUp ? 'Create Account' : 'Sign In'}
            {/if}
          </button>
        </form>

        <div class="auth-footer">
          <button class="toggle-btn" onclick={toggleAuthMode}>
            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Global Layout */
  .app-container {
    min-height: 100vh;
    background: var(--bg-root);
    color: var(--light);
    font-family: var(--font-sans);
  }

  /* Loading */
  .loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 1rem;
  }

  .loading-text {
    font-family: var(--font-mono);
    color: var(--light-dim);
    font-size: 0.9rem;
    letter-spacing: 0.05em;
  }

  /* Auth Gate */
  .auth-gate {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: radial-gradient(circle at 50% 10%, var(--bg-gradient-1), transparent 70%),
                radial-gradient(circle at 90% 90%, var(--bg-gradient-2), transparent 70%);
  }

  .auth-card {
    width: 100%;
    max-width: 400px;
    padding: 2.5rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow-glow-md);
    backdrop-filter: blur(20px);
  }

  .auth-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .auth-sigil {
    color: var(--aether);
    margin-bottom: 1rem;
  }

  .auth-header h1 {
    font-family: var(--font-serif);
    font-size: 1.8rem;
    font-weight: 500;
    margin: 0;
    background: linear-gradient(135deg, #fff 0%, var(--light-dim) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .subtitle {
    color: var(--light-dim);
    font-size: 0.9rem;
    margin-top: 0.5rem;
  }

  /* Form */
  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    text-align: left;
  }

  .input-group label {
    font-size: 0.85rem;
    color: var(--light-dim);
    font-weight: 500;
  }

  .input-group input {
    background: var(--bg-surface);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: 0.75rem 1rem;
    color: var(--light);
    font-size: 1rem;
    transition: all 0.2s;
  }

  .input-group input:focus {
    border-color: var(--aether);
    box-shadow: 0 0 0 2px var(--aether-glow);
    outline: none;
  }

  .auth-btn {
    background: var(--aether-deep);
    border: 1px solid var(--aether);
    color: #fff;
    padding: 0.85rem;
    border-radius: var(--radius-md);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 0.5rem;
  }

  .auth-btn:hover:not(:disabled) {
    background: var(--aether);
    box-shadow: var(--shadow-glow-sm);
  }

  .auth-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .auth-footer {
    margin-top: 1.5rem;
    text-align: center;
  }

  .toggle-btn {
    background: none;
    border: none;
    color: var(--light-dim);
    font-size: 0.9rem;
    cursor: pointer;
    transition: color 0.2s;
  }

  .toggle-btn:hover {
    color: var(--aether);
    text-decoration: underline;
  }

  .error-message {
    color: #ff6b6b;
    font-size: 0.9rem;
    text-align: center;
    background: rgba(255, 107, 107, 0.1);
    padding: 0.5rem;
    border-radius: var(--radius-sm);
  }
</style>
