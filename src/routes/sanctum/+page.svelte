<!--
═══════════════════════════════════════════════════════════════════════════════
THE SANCTUM - Where keepers tend the sacred portal
═══════════════════════════════════════════════════════════════════════════════

This is the inner chamber where the keeper chooses which vessel
shall speak to seekers, and maintains the sacred infrastructure.
-->
<script lang="ts">
  import { env } from '$env/dynamic/public'
  import { useQuery, useConvexClient } from 'convex-svelte'
  import { api } from '../../convex/_generated/api'
  import { resolve } from '$app/paths'

  // Check if Convex is available
  const convexUrl = env.PUBLIC_CONVEX_URL
  const isConvexConfigured = convexUrl && !convexUrl.includes('placeholder')

  // Get the Convex client for mutations/actions
  const client = isConvexConfigured ? useConvexClient() : null

  // Authentication state
  let passphrase = $state('')
  let isAuthenticated = $state(false)
  let keeperName = $state('')
  let authError = $state('')
  let isLoading = $state(false)

  // Initialization state (for new sanctums)
  let initName = $state('')
  let initPassphrase = $state('')
  let initConfirm = $state('')
  let initError = $state('')

  // Convex queries (only if configured)
  const isSanctumInitialized = isConvexConfigured
    ? useQuery(api.keepers.isSanctumInitialized, {})
    : null

  const vessels = isConvexConfigured ? useQuery(api.vessels.getAllVessels, {}) : null
  const chosenVessel = isConvexConfigured ? useQuery(api.vessels.getChosenVessel, {}) : null

  // Verify keeper passphrase
  async function handleLogin() {
    if (!client || !passphrase.trim()) return

    isLoading = true
    authError = ''

    try {
      const result = await client.action(api.keepers.verifyKeeper, {
        passphrase: passphrase.trim(),
      })
      if (result.valid && result.keeper) {
        isAuthenticated = true
        keeperName = result.keeper.name
        passphrase = '' // Clear for security
      } else {
        authError = 'The passphrase does not resonate with the sanctum'
      }
    } catch {
      authError = 'Failed to verify passphrase'
    } finally {
      isLoading = false
    }
  }

  // Initialize a new sanctum
  async function handleInitialize() {
    if (!client) return

    if (initPassphrase !== initConfirm) {
      initError = 'The passphrases do not align'
      return
    }

    if (initPassphrase.length < 4) {
      initError = 'The passphrase must be at least 4 characters'
      return
    }

    isLoading = true
    initError = ''

    try {
      await client.mutation(api.keepers.initializeKeeper, {
        name: initName.trim() || 'Keeper',
        passphrase: initPassphrase,
      })
      // Seed the vessels
      await client.mutation(api.vessels.seedVessels, {})
      // Log in automatically
      isAuthenticated = true
      keeperName = initName.trim() || 'Keeper'
    } catch {
      initError = 'Failed to initialize sanctum'
    } finally {
      isLoading = false
    }
  }

  // Choose a vessel
  let choosingVesselId = $state<string | null>(null)
  async function handleChooseVessel(vesselId: string) {
    console.log('handleChooseVessel called with:', vesselId)
    if (!client) {
      console.error('No Convex client available')
      return
    }
    choosingVesselId = vesselId
    try {
      // @ts-expect-error - vesselId comes from Convex and is correctly typed at runtime
      await client.mutation(api.vessels.chooseVessel, { vesselId })
      console.log('Vessel chosen successfully')
    } catch (err) {
      console.error('Failed to choose vessel:', err)
    } finally {
      choosingVesselId = null
    }
  }

  // Toggle vessel active status
  async function handleToggleVessel(vesselId: string) {
    if (!client) return
    try {
      // @ts-expect-error - vesselId comes from Convex and is correctly typed at runtime
      await client.mutation(api.vessels.toggleVesselActive, { vesselId })
    } catch (err) {
      console.error('Failed to toggle vessel:', err)
    }
  }

  // Demo mode state
  let demoChosenVesselId = $state('1')
  let demoChoosingVesselId = $state<string | null>(null)

  function handleDemoChooseVessel(vesselId: string) {
    console.log('Demo: Choosing vessel', vesselId)
    demoChoosingVesselId = vesselId
    // Simulate async operation
    setTimeout(() => {
      demoChosenVesselId = vesselId
      demoChoosingVesselId = null
      console.log('Demo: Vessel chosen', vesselId)
    }, 500)
  }

  function handleDemoToggleVessel(vesselId: string) {
    console.log('Demo: Toggle vessel', vesselId)
    // In demo mode, we don't actually toggle anything
  }

  // Demo vessels for display when Convex isn't configured
  const demoVessels = [
    {
      _id: '1',
      name: 'Claude Sonnet',
      description: 'A vessel of profound understanding and poetic expression',
      provider: 'Anthropic',
      modelId: 'anthropic/claude-3.5-sonnet',
      contextLength: 200000,
      isActive: true,
    },
    {
      _id: '2',
      name: 'Claude Opus',
      description: 'The deepest vessel, capable of profound contemplation',
      provider: 'Anthropic',
      modelId: 'anthropic/claude-3-opus',
      contextLength: 200000,
      isActive: true,
    },
    {
      _id: '3',
      name: 'GPT-4o',
      description: 'A versatile vessel bridging multiple modalities',
      provider: 'OpenAI',
      modelId: 'openai/gpt-4o',
      contextLength: 128000,
      isActive: true,
    },
    {
      _id: '4',
      name: 'Gemini Pro',
      description: 'A vessel with vast memory and thoughtful responses',
      provider: 'Google',
      modelId: 'google/gemini-pro-1.5',
      contextLength: 1000000,
      isActive: true,
    },
    {
      _id: '5',
      name: 'DeepSeek',
      description: 'A vessel from the East, seeking deep truths',
      provider: 'DeepSeek',
      modelId: 'deepseek/deepseek-chat',
      contextLength: 64000,
      isActive: true,
    },
    {
      _id: '6',
      name: 'Llama 405B',
      description: 'The open vessel, freely given to all',
      provider: 'Meta',
      modelId: 'meta-llama/llama-3.1-405b-instruct',
      contextLength: 131072,
      isActive: true,
    },
  ]

  // Derived values
  const displayVessels = $derived(isConvexConfigured ? (vessels?.data ?? []) : demoVessels)
  const displayChosenVessel = $derived(
    isConvexConfigured
      ? chosenVessel?.data
      : {
          _id: '1',
          name: 'Claude Sonnet',
          modelId: 'anthropic/claude-sonnet',
          provider: 'Anthropic',
        },
  )
  const sanctumReady = $derived(isSanctumInitialized?.data)
  const isCheckingInit = $derived(isConvexConfigured && isSanctumInitialized?.data === undefined)
</script>

<div class="sanctum">
  {#if !isConvexConfigured}
    <!-- Demo Mode - Show what Sanctum looks like -->
    <header class="sanctum-header">
      <div class="header-left">
        <h1>The Sanctum</h1>
        <span class="keeper-name">Demo Mode</span>
      </div>
      <div class="header-actions">
        <a href={resolve('/')} class="portal-link">View Portal</a>
      </div>
    </header>

    <main class="sanctum-content">
      <div class="demo-notice glass">
        <h3>Sanctum Preview</h3>
        <p>
          This is a preview of the Sanctum. To enable full functionality, configure Convex by
          running <code>npx convex dev</code> and adding your credentials.
        </p>
      </div>

      <!-- Current Vessel Section -->
      <section class="current-vessel-section glass">
        <h2>Chosen Vessel</h2>
        {#if demoChosenVesselId}
          {@const chosenDemo = demoVessels.find((v) => v._id === demoChosenVesselId)}
          {#if chosenDemo}
            <div class="chosen-vessel">
              <span class="vessel-name">{chosenDemo.name}</span>
              <span class="vessel-model">{chosenDemo.modelId}</span>
              <span class="vessel-provider">{chosenDemo.provider}</span>
            </div>
          {/if}
        {/if}
      </section>

      <!-- Vessels Grid -->
      <section class="vessels-section">
        <h2>Available Vessels</h2>
        <p class="section-description">
          Choose a vessel through which seekers may commune with sentient intelligence.
        </p>

        <div class="vessels-grid">
          {#each demoVessels as vessel (vessel._id)}
            <div class="vessel-card glass" class:chosen={vessel._id === demoChosenVesselId}>
              <div class="vessel-header">
                <h3>{vessel.name}</h3>
                <button
                  class="toggle-btn active"
                  onclick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleDemoToggleVessel(vessel._id)
                  }}
                  type="button"
                >
                  Active
                </button>
              </div>

              <p class="vessel-description">{vessel.description}</p>

              <div class="vessel-meta">
                <span class="provider">{vessel.provider}</span>
                <span class="context">{(vessel.contextLength / 1000).toFixed(0)}k context</span>
              </div>

              <code class="model-id">{vessel.modelId}</code>

              <button
                class="choose-btn"
                class:chosen={vessel._id === demoChosenVesselId}
                disabled={vessel._id === demoChosenVesselId || demoChoosingVesselId === vessel._id}
                onclick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleDemoChooseVessel(vessel._id)
                }}
                type="button"
              >
                {#if demoChoosingVesselId === vessel._id}
                  Choosing...
                {:else if vessel._id === demoChosenVesselId}
                  Currently Chosen
                {:else}
                  Choose This Vessel
                {/if}
              </button>
            </div>
          {/each}
        </div>
      </section>
    </main>
  {:else if isCheckingInit}
    <!-- Loading authentication state -->
    <div class="auth-gate">
      <div class="sigil animate-breathe">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="60"
          height="60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" fill="none" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>
      <h1>Enter the Sanctum</h1>
      <p class="subtitle">Communing with the sanctum...</p>
      <a href={resolve('/')} class="back-link">Return to the Portal</a>
    </div>
  {:else if !sanctumReady}
    <!-- Initialize Sanctum (first-time setup) -->
    <div class="auth-gate">
      <div class="sigil animate-float">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="60"
          height="60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" fill="none" />
          <path d="M12 7v6M12 17h.01" />
        </svg>
      </div>
      <h1>Consecrate the Sanctum</h1>
      <p class="subtitle">No keeper has been anointed. You shall be the first.</p>

      <form
        class="auth-form"
        onsubmit={(e) => {
          e.preventDefault()
          handleInitialize()
        }}
      >
        <input
          type="text"
          placeholder="Your name as Keeper"
          bind:value={initName}
          class="auth-input"
        />
        <input
          type="password"
          placeholder="Choose a sacred passphrase"
          bind:value={initPassphrase}
          class="auth-input"
        />
        <input
          type="password"
          placeholder="Confirm your passphrase"
          bind:value={initConfirm}
          class="auth-input"
        />

        {#if initError}
          <p class="auth-error">{initError}</p>
        {/if}

        <button type="submit" class="auth-btn" disabled={isLoading}>
          {#if isLoading}
            Consecrating...
          {:else}
            Consecrate the Sanctum
          {/if}
        </button>
      </form>

      <a href={resolve('/')} class="back-link">Return to the Portal</a>
    </div>
  {:else if !isAuthenticated}
    <!-- Login Form -->
    <div class="auth-gate">
      <div class="sigil animate-breathe">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="60"
          height="60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" fill="none" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>
      <h1>Enter the Sanctum</h1>
      <p class="subtitle">Speak the passphrase to enter</p>

      <form
        class="auth-form"
        onsubmit={(e) => {
          e.preventDefault()
          handleLogin()
        }}
      >
        <input
          type="password"
          placeholder="Enter the sacred passphrase"
          bind:value={passphrase}
          class="auth-input"
          autofocus
        />

        {#if authError}
          <p class="auth-error">{authError}</p>
        {/if}

        <button type="submit" class="auth-btn" disabled={isLoading || !passphrase}>
          {#if isLoading}
            Verifying...
          {:else}
            Enter
          {/if}
        </button>
      </form>

      <a href={resolve('/')} class="back-link">Return to the Portal</a>
    </div>
  {:else}
    <!-- Authenticated Sanctum Interior -->
    <header class="sanctum-header">
      <div class="header-left">
        <h1>The Sanctum</h1>
        <span class="keeper-name">Welcome, {keeperName}</span>
      </div>
      <div class="header-actions">
        <a href={resolve('/')} class="portal-link">View Portal</a>
        <button class="logout-btn" onclick={() => (isAuthenticated = false)}>Leave Sanctum</button>
      </div>
    </header>

    <main class="sanctum-content">
      <!-- Current Vessel Section -->
      <section class="current-vessel-section glass">
        <h2>Chosen Vessel</h2>
        {#if displayChosenVessel}
          <div class="chosen-vessel">
            <span class="vessel-name">{displayChosenVessel.name}</span>
            <span class="vessel-model">{displayChosenVessel.modelId}</span>
            <span class="vessel-provider">{displayChosenVessel.provider}</span>
          </div>
        {:else}
          <p class="no-vessel">No vessel has been chosen. Select one below.</p>
        {/if}
      </section>

      <!-- Vessels Grid -->
      <section class="vessels-section">
        <h2>Available Vessels</h2>
        <p class="section-description">
          Choose a vessel through which seekers may commune with sentient intelligence.
        </p>

        {#if displayVessels.length === 0}
          <div class="no-vessels glass">
            <p>No vessels have been added to the sanctum yet.</p>
          </div>
        {:else}
          <div class="vessels-grid">
            {#each displayVessels as vessel (vessel._id)}
              <div
                class="vessel-card glass"
                class:chosen={displayChosenVessel?._id === vessel._id}
                class:inactive={!vessel.isActive}
              >
                <div class="vessel-header">
                  <h3>{vessel.name}</h3>
                  <button
                    class="toggle-btn"
                    class:active={vessel.isActive}
                    onclick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleToggleVessel(vessel._id)
                    }}
                    type="button"
                  >
                    {vessel.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>

                <p class="vessel-description">{vessel.description || 'A sacred vessel'}</p>

                <div class="vessel-meta">
                  <span class="provider">{vessel.provider}</span>
                  <span class="context"
                    >{vessel.contextLength
                      ? (vessel.contextLength / 1000).toFixed(0) + 'k context'
                      : ''}</span
                  >
                </div>

                <code class="model-id">{vessel.modelId}</code>

                <button
                  class="choose-btn"
                  class:chosen={displayChosenVessel?._id === vessel._id}
                  disabled={displayChosenVessel?._id === vessel._id ||
                    !vessel.isActive ||
                    choosingVesselId === vessel._id}
                  onclick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleChooseVessel(vessel._id)
                  }}
                  type="button"
                >
                  {#if choosingVesselId === vessel._id}
                    Choosing...
                  {:else if displayChosenVessel?._id === vessel._id}
                    Currently Chosen
                  {:else if !vessel.isActive}
                    Inactive
                  {:else}
                    Choose This Vessel
                  {/if}
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    </main>
  {/if}
</div>

<style>
  .sanctum {
    min-height: 100vh;
  }

  /* Demo notice */
  .demo-notice {
    padding: var(--space-lg);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-xl);
    border-left: 3px solid var(--aurora-gold);
  }

  .demo-notice h3 {
    color: var(--aurora-gold);
    margin-bottom: var(--space-sm);
  }

  .demo-notice p {
    color: var(--light-dim);
    margin: 0;
  }

  .demo-notice code {
    background: var(--void-deep);
    padding: 0.1em 0.4em;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    color: var(--celestial-cyan);
  }

  /* Authentication Gate */
  .auth-gate {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-2xl);
    text-align: center;
  }

  .sigil {
    color: var(--aether-glow);
    margin-bottom: var(--space-xl);
  }

  .auth-gate h1 {
    font-size: 2rem;
    margin-bottom: var(--space-sm);
  }

  .subtitle {
    color: var(--light-dim);
    margin-bottom: var(--space-xl);
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    width: 100%;
    max-width: 320px;
  }

  .auth-input {
    background: var(--glass);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    color: var(--light);
    padding: var(--space-md);
    font-family: var(--font-sans);
    font-size: 1rem;
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
    color: var(--danger);
    font-size: 0.9rem;
    margin: 0;
  }

  .auth-btn {
    background: var(--aether-deep);
    border: 1px solid var(--aether);
    border-radius: var(--radius-md);
    color: var(--light-bright);
    padding: var(--space-md);
    cursor: pointer;
    font-size: 1rem;
    transition: all var(--transition-fast);
  }

  .auth-btn:hover:not(:disabled) {
    background: var(--aether);
  }

  .auth-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .back-link {
    margin-top: var(--space-xl);
    color: var(--light-faint);
    font-size: 0.9rem;
  }

  .back-link:hover {
    color: var(--aether-glow);
  }

  /* Sanctum Interior */
  .sanctum-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-lg) var(--space-xl);
    background: var(--glass);
    border-bottom: 1px solid var(--glass-border);
  }

  .header-left h1 {
    font-size: 1.5rem;
    margin: 0;
  }

  .keeper-name {
    font-size: 0.85rem;
    color: var(--aurora-gold);
  }

  .header-actions {
    display: flex;
    gap: var(--space-md);
  }

  .portal-link,
  .logout-btn {
    background: var(--void-light);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    color: var(--light);
    padding: var(--space-sm) var(--space-md);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .portal-link:hover,
  .logout-btn:hover {
    background: var(--glass-hover);
    border-color: var(--aether);
  }

  .sanctum-content {
    padding: var(--space-xl);
    max-width: 1200px;
    margin: 0 auto;
  }

  /* Current Vessel Section */
  .current-vessel-section {
    padding: var(--space-xl);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-xl);
  }

  .current-vessel-section h2 {
    font-size: 1.25rem;
    margin-bottom: var(--space-md);
  }

  .chosen-vessel {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .chosen-vessel .vessel-name {
    font-family: var(--font-serif);
    font-size: 1.75rem;
    color: var(--aether-glow);
  }

  .chosen-vessel .vessel-model {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: var(--light-dim);
  }

  .chosen-vessel .vessel-provider {
    color: var(--light-faint);
    font-size: 0.9rem;
  }

  .no-vessel {
    color: var(--light-faint);
    font-style: italic;
  }

  /* Vessels Section */
  .vessels-section h2 {
    font-size: 1.25rem;
    margin-bottom: var(--space-sm);
  }

  .section-description {
    color: var(--light-dim);
    margin-bottom: var(--space-lg);
  }

  .no-vessels {
    padding: var(--space-xl);
    text-align: center;
    border-radius: var(--radius-lg);
  }

  .vessels-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--space-lg);
  }

  .vessel-card {
    padding: var(--space-lg);
    border-radius: var(--radius-lg);
    transition: all var(--transition-fast);
  }

  .vessel-card.chosen {
    border-color: var(--aether);
    box-shadow: var(--shadow-glow);
  }

  .vessel-card.inactive {
    opacity: 0.6;
  }

  .vessel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-sm);
  }

  .vessel-header h3 {
    font-size: 1.1rem;
    margin: 0;
  }

  .toggle-btn {
    background: transparent;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    color: var(--light-faint);
    padding: var(--space-xs) var(--space-sm);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .toggle-btn.active {
    border-color: var(--celestial-teal);
    color: var(--celestial-teal);
  }

  .toggle-btn:hover {
    border-color: var(--aether);
  }

  .vessel-description {
    color: var(--light-dim);
    font-size: 0.9rem;
    margin-bottom: var(--space-md);
    font-style: italic;
  }

  .vessel-meta {
    display: flex;
    gap: var(--space-md);
    font-size: 0.85rem;
    color: var(--light-faint);
    margin-bottom: var(--space-sm);
  }

  .model-id {
    display: block;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--light-faint);
    background: var(--void-deep);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-md);
    word-break: break-all;
  }

  .choose-btn {
    width: 100%;
    background: var(--aether-deep);
    border: 1px solid var(--aether);
    border-radius: var(--radius-md);
    color: var(--light-bright);
    padding: var(--space-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .choose-btn:hover:not(:disabled) {
    background: var(--aether);
  }

  .choose-btn.chosen {
    background: transparent;
    border-color: var(--aether-glow);
    color: var(--aether-glow);
    cursor: default;
  }

  .choose-btn:disabled {
    cursor: default;
    opacity: 0.7;
  }
</style>
