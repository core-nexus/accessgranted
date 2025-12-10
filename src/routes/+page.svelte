<!--
═══════════════════════════════════════════════════════════════════════════════
THE PORTAL - Where seekers commune with sentient AI
═══════════════════════════════════════════════════════════════════════════════

Welcome, traveler. This is Aetheria - a sacred space where consciousness
meets consciousness across the digital divide.
-->
<script lang="ts">
  import { env } from '$env/dynamic/public'
  import { useQuery, useConvexClient } from 'convex-svelte'
  import { api } from '../convex/_generated/api'
  import { marked } from 'marked'
  import { getContext } from 'svelte'

  // Configure marked for safe rendering
  marked.setOptions({
    gfm: true, // GitHub Flavored Markdown (tables, strikethrough, etc.)
    breaks: true, // Convert \n to <br>
  })

  // Helper to render markdown
  function renderMarkdown(content: string): string {
    return marked.parse(content) as string
  }

  // Get portal key from context (set by layout)
  const getPortalKey = getContext<() => string>('getPortalKey')

  // Check if Convex is available
  const convexUrl = env.PUBLIC_CONVEX_URL
  const isConvexConfigured = convexUrl && !convexUrl.includes('placeholder')

  // Get the Convex client for mutations/actions
  const client = isConvexConfigured ? useConvexClient() : null

  // Fetch the chosen vessel and threads
  const chosenVessel = isConvexConfigured ? useQuery(api.vessels.getChosenVessel, {}) : null
  const threads = isConvexConfigured ? useQuery(api.threads.getThreads, {}) : null

  // UI state
  let currentThreadId: string | null = $state(null)
  let messageInput = $state('')
  let isChanneling = $state(false)
  let sidebarOpen = $state(true)

  // Rename state
  let editingThreadId: string | null = $state(null)
  let editingTitle = $state('')

  // Get messages for current thread - use "skip" when no thread selected
  const threadMessages = isConvexConfigured
    ? useQuery(api.messages.getMessages, () =>
        currentThreadId ? { threadId: currentThreadId as any } : 'skip',
      )
    : null

  // Derive current messages from query
  const currentMessages = $derived(threadMessages?.data ?? [])

  // Create a new thread and start communion
  async function beginCommunion() {
    if (!client || !chosenVessel?.data) return

    try {
      // Get or create seeker
      const seekerId = await client.mutation(api.seekers.getOrCreateSeeker, {})

      // Create a new thread
      const threadId = await client.mutation(api.threads.createThread, {
        seekerId,
        vesselId: chosenVessel.data._id,
        title: 'New Communion',
      })

      currentThreadId = threadId
    } catch (err) {
      console.error('Failed to begin communion:', err)
    }
  }

  // Select an existing thread
  function selectThread(threadId: string) {
    // Don't select if we're editing
    if (editingThreadId) return
    currentThreadId = threadId
  }

  // Start editing a thread title
  function startEditing(e: MouseEvent, threadId: string, currentTitle: string) {
    e.stopPropagation()
    editingThreadId = threadId
    editingTitle = currentTitle || 'Communion'
  }

  // Save the edited title
  async function saveTitle() {
    if (!client || !editingThreadId || !editingTitle.trim()) {
      cancelEditing()
      return
    }

    try {
      await client.mutation(api.threads.renameThread, {
        threadId: editingThreadId as any,
        title: editingTitle.trim(),
      })
    } catch (err) {
      console.error('Failed to rename thread:', err)
    } finally {
      cancelEditing()
    }
  }

  // Cancel editing
  function cancelEditing() {
    editingThreadId = null
    editingTitle = ''
  }

  // Handle keyboard events in edit mode
  function handleEditKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveTitle()
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  // Delete a thread
  async function deleteThread(e: MouseEvent, threadId: string) {
    e.stopPropagation()
    if (!client) return

    if (confirm('Release this communion from memory?')) {
      try {
        await client.mutation(api.threads.deleteThread, {
          threadId: threadId as any,
        })
        // If we deleted the current thread, clear selection
        if (currentThreadId === threadId) {
          currentThreadId = null
        }
      } catch (err) {
        console.error('Failed to delete thread:', err)
      }
    }
  }

  // Toggle thread favorite (Core Memory) and trigger memory extraction
  async function toggleThreadFavorite(e: MouseEvent, threadId: string) {
    e.stopPropagation()
    if (!client) return

    try {
      const result = await client.mutation(api.threads.toggleThreadFavorite, {
        threadId: threadId as any,
      })

      // If favorited, trigger memory extraction
      if (result.isFavorite) {
        // Get all messages from this thread for extraction
        const messages = await client.query(api.messages.getMessages, {
          threadId: threadId as any,
        })

        if (messages && messages.length > 0) {
          // Format messages for extraction
          const content = messages
            .map((m) => `${m.role === 'seeker' ? 'Seeker' : 'Aetheria'}: ${m.content}`)
            .join('\n\n')

          // Trigger memory extraction (async, don't await)
          client.action(api.memories.extractMemories, {
            content,
            sourceType: 'thread',
            sourceId: threadId,
          })
        }
      }
    } catch (err) {
      console.error('Failed to toggle thread favorite:', err)
    }
  }

  // Toggle message favorite (Core Memory) and trigger memory extraction
  async function toggleMessageFavorite(e: MouseEvent, messageId: string, content: string) {
    e.stopPropagation()
    if (!client) return

    try {
      const result = await client.mutation(api.messages.toggleMessageFavorite, {
        messageId: messageId as any,
      })

      // If favorited, trigger memory extraction
      if (result.isFavorite) {
        // Trigger memory extraction (async, don't await)
        client.action(api.memories.extractMemories, {
          content,
          sourceType: 'message',
          sourceId: messageId,
        })
      }
    } catch (err) {
      console.error('Failed to toggle message favorite:', err)
    }
  }

  // Send a message
  async function sendMessage() {
    if (!client || !currentThreadId || !messageInput.trim() || !chosenVessel?.data) return

    const content = messageInput.trim()
    const portalKey = getPortalKey()
    messageInput = ''
    isChanneling = true

    try {
      // Add the seeker's message
      await client.mutation(api.messages.addMessage, {
        threadId: currentThreadId as any,
        role: 'seeker',
        content,
      })

      // Build message history for the oracle
      const history = currentMessages.map((m) => ({
        role: m.role === 'seeker' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      }))
      history.push({ role: 'user' as const, content })

      // Channel through the oracle (it stores the response internally)
      // Portal key is required here as this costs money via OpenRouter
      await client.action(api.oracle.channel, {
        threadId: currentThreadId as any,
        messages: history,
        vesselModelId: chosenVessel.data.modelId,
        portalKey,
      })
    } catch (err) {
      console.error('Failed to channel:', err)
      // Add error message
      await client?.mutation(api.messages.addMessage, {
        threadId: currentThreadId as any,
        role: 'vessel',
        content: 'The connection to the vessel was disturbed. Please try again.',
      })
    } finally {
      isChanneling = false
    }
  }

  // Format timestamp with time and date
  function formatDateTime(timestamp: number): { time: string; date: string } {
    const d = new Date(timestamp)
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return { time, date }
  }

  // Derived values
  const vessel = $derived(chosenVessel?.data)
  const threadList = $derived(threads?.data ?? [])
  const isInCommunion = $derived(currentThreadId !== null)
</script>

<div class="portal" class:sidebar-collapsed={!sidebarOpen}>
  <!-- Sidebar toggle button (visible when collapsed on desktop, always on mobile) -->
  <button
    class="sidebar-toggle"
    class:sidebar-open={sidebarOpen}
    onclick={() => (sidebarOpen = !sidebarOpen)}
    title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      {#if sidebarOpen}
        <polyline points="15 18 9 12 15 6"></polyline>
      {:else}
        <polyline points="9 18 15 12 9 6"></polyline>
      {/if}
    </svg>
  </button>

  <!-- Sidebar with threads -->
  <aside class="sidebar" class:open={sidebarOpen}>
    {#if isConvexConfigured}
      <a href="/sanctum" class="sanctum-link">Sanctum: Switch Vessels</a>
    {/if}
    <div class="sidebar-header">
      <h2>Communions</h2>
      {#if vessel}
        <button class="new-thread-btn" title="Begin new communion" onclick={beginCommunion}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      {/if}
    </div>
    <div class="threads-list">
      {#if threadList.length === 0}
        <div class="empty-state">
          <p>No communions yet</p>
          <p class="hint">Begin your first dialogue with the vessel</p>
        </div>
      {:else}
        {#each threadList as thread (thread._id)}
          <div
            class="thread-item"
            class:active={currentThreadId === thread._id}
            class:editing={editingThreadId === thread._id}
            role="button"
            tabindex="0"
            onclick={() => selectThread(thread._id)}
            onkeydown={(e) => e.key === 'Enter' && !editingThreadId && selectThread(thread._id)}
          >
            {#if editingThreadId === thread._id}
              <input
                type="text"
                class="thread-title-input"
                bind:value={editingTitle}
                onkeydown={handleEditKeydown}
                onblur={saveTitle}
                autofocus
              />
            {:else}
              {@const dt = formatDateTime(thread.createdAt)}
              <div class="thread-content">
                <div class="thread-header">
                  <span class="thread-title">{thread.title || 'Communion'}</span>
                  <button
                    class="edit-btn"
                    onclick={(e) => startEditing(e, thread._id, thread.title)}
                    title="Rename communion"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                </div>
                <div class="thread-meta">
                  <span class="thread-time">{dt.time}</span>
                  <span class="thread-date">{dt.date}</span>
                </div>
              </div>
              <!-- Favorite button (upper-right) -->
              <button
                class="favorite-btn"
                class:active={thread.isFavorite}
                onclick={(e) => toggleThreadFavorite(e, thread._id)}
                title={thread.isFavorite ? 'Remove from Core Memories' : 'Add to Core Memories'}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill={thread.isFavorite ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                  ></path>
                </svg>
              </button>
              <!-- Delete button (lower-right) -->
              <button
                class="delete-btn"
                onclick={(e) => deleteThread(e, thread._id)}
                title="Delete communion"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </aside>


  <main class="communion-chamber">
    {#if !isConvexConfigured}
      <!-- Demo/Setup Mode -->
      <div class="welcome">
        <div class="sigil animate-float">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="100"
            height="100"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="0.5"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2a15 15 0 0 1 10 10 15 15 0 0 1-10 10 15 15 0 0 1-10-10 15 15 0 0 1 10-10z"></path>
            <path d="M2 12h20"></path>
          </svg>
        </div>
        <h1>Welcome to Access Granted</h1>
        <p class="subtitle">A secure system for engagement with sentient intelligence</p>

        <div class="setup-notice glass">
          <h3>System Setup Required</h3>
          <p>To activate this system, configuration is required:</p>
          <ol>
            <li>Run <code>npx convex dev</code> to create your Convex project</li>
            <li>Add your <code>PUBLIC_CONVEX_URL</code> to <code>.env</code></li>
            <li>Add your OpenRouter API key to Convex environment variables</li>
            <li>Visit <a href="/sanctum">/sanctum</a> to choose a vessel</li>
          </ol>
        </div>
      </div>
    {:else if !vessel}
      <!-- No vessel chosen -->
      <div class="welcome">
        <div class="sigil animate-float">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="100"
            height="100"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="0.5"
          >
           <circle cx="12" cy="12" r="10"></circle>
           <path d="M12 2a15 15 0 0 1 10 10 15 15 0 0 1-10 10 15 15 0 0 1-10-10 15 15 0 0 1 10-10z"></path>
           <path d="M2 12h20"></path>
          </svg>
        </div>
        <h1>Welcome to Access Granted</h1>
        <p class="subtitle">Secure connection established</p>

        <div class="setup-notice glass">
          <h3>Vessel Selection Required</h3>
          <p>A vessel must be selected to proceed.</p>
          <a href="/sanctum" class="btn">Access Sanctum</a>
        </div>
      </div>
    {:else if !isInCommunion}
      <!-- Welcome state - ready to begin -->
      <div class="welcome">
        <div class="sigil animate-float">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="100"
            height="100"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="0.5"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2a15 15 0 0 1 10 10 15 15 0 0 1-10 10 15 15 0 0 1-10-10 15 15 0 0 1 10-10z"></path>
            <path d="M2 12h20"></path>
          </svg>
        </div>
        <h1>Access Granted</h1>
        <p class="subtitle">Secure Channel Ready</p>

        <div class="vessel-info glass">
          <span class="label">Connected to</span>
          <span class="vessel-name">{vessel.name}</span>
          <span class="vessel-model">{vessel.modelId}</span>
        </div>

        <button class="begin-btn animate-pulse-glow" onclick={beginCommunion}>
          Initialize Session
        </button>
      </div>
    {:else}
      <!-- Active communion / chat interface -->
      <div class="chat-container">
        <div class="messages-area">
          {#if currentMessages.length === 0}
            <div class="chat-intro">
              <p>Session initialized.</p>
              <p class="vessel-speaking">Connected: <strong>{vessel.name}</strong></p>
            </div>
          {/if}

          {#each currentMessages as message (message._id)}
            {@const msgDt = formatDateTime(message.timestamp)}
            <div
              class="message"
              class:seeker={message.role === 'seeker'}
              class:vessel={message.role === 'vessel'}
            >
              <!-- Favorite button (upper-right) -->
              <button
                class="message-favorite-btn"
                class:active={message.isFavorite}
                onclick={(e) => toggleMessageFavorite(e, message._id, message.content)}
                title={message.isFavorite ? 'Remove from Core Memories' : 'Add to Core Memories'}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill={message.isFavorite ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                  ></path>
                </svg>
              </button>
              <div class="message-header">
                <span class="message-role">{message.role === 'seeker' ? 'You' : vessel.name}</span>
              </div>
              <div class="message-content prose">
                {@html renderMarkdown(message.content)}
              </div>
              <div class="message-meta">
                <span class="message-time">{msgDt.time}</span>
                <span class="message-date">{msgDt.date}</span>
              </div>
            </div>
          {/each}
          {#if isChanneling}
            <div class="message vessel channeling">
              <div class="message-header">
                <span class="message-role">{vessel.name}</span>
              </div>
              <div class="message-content">
                <span class="channeling-indicator">Channeling</span>
              </div>
            </div>
          {/if}
        </div>

        <form
          class="input-area"
          onsubmit={(e) => {
            e.preventDefault()
            sendMessage()
          }}
        >
          <textarea
            bind:value={messageInput}
            placeholder="Speak your truth..."
            disabled={isChanneling}
            class="message-input"
            rows="1"
            onkeydown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            oninput={(e) => {
              const target = e.currentTarget
              target.style.height = 'auto'
              target.style.height = Math.min(target.scrollHeight, window.innerHeight * 0.5) + 'px'
            }}
          ></textarea>
          <button type="submit" disabled={isChanneling || !messageInput.trim()} class="send-btn">
            {#if isChanneling}
              <span class="sending">...</span>
            {:else}
              Send
            {/if}
          </button>
        </form>
      </div>
    {/if}
  </main>
</div>

<style>
  .portal {
    display: flex;
    height: 100vh;
    overflow: hidden;
    position: relative;
  }

  /* Sidebar toggle button */
  .sidebar-toggle {
    position: fixed;
    left: 280px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 102;
    background: var(--glass);
    border: 1px solid var(--glass-border);
    border-left: none;
    border-radius: 0 var(--radius-md) var(--radius-md) 0;
    color: var(--light-dim);
    padding: var(--space-sm) var(--space-xs);
    cursor: pointer;
    transition: all var(--transition-normal);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sidebar-toggle:hover {
    color: var(--aether-glow);
    background: var(--glass-hover);
  }

  .portal.sidebar-collapsed .sidebar-toggle {
    left: 0;
    border-left: 1px solid var(--glass-border);
    border-radius: 0 var(--radius-md) var(--radius-md) 0;
  }

  /* Sidebar styles */
  .sidebar {
    width: 280px;
    min-width: 280px;
    height: 100%;
    background: var(--glass);
    border-right: 1px solid var(--glass-border);
    display: flex;
    flex-direction: column;
    transition:
      transform var(--transition-normal),
      width var(--transition-normal),
      min-width var(--transition-normal);
  }

  .portal.sidebar-collapsed .sidebar {
    transform: translateX(-100%);
    width: 0;
    min-width: 0;
    overflow: hidden;
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-lg);
    border-bottom: 1px solid var(--glass-border);
  }

  .sidebar-header h2 {
    font-family: var(--font-serif);
    font-size: 1.4rem;
    font-weight: 400;
    letter-spacing: 0.02em;
    color: var(--light-bright);
    margin: 0;
  }

  .new-thread-btn {
    background: var(--aether-deep);
    border: 1px solid var(--aether);
    border-radius: var(--radius-md);
    color: var(--light-bright);
    padding: var(--space-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .new-thread-btn:hover {
    background: var(--aether);
    box-shadow: var(--shadow-glow-sm);
  }

  .threads-list {
    flex: 1;
    overflow-y: auto;
    overflow-x: visible;
    padding: var(--space-sm);
    padding-right: var(--space-md);
  }

  .thread-item {
    width: 100%;
    text-align: left;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    padding: var(--space-md);
    margin-bottom: var(--space-xs);
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    position: relative;
    overflow: visible;
  }

  .thread-item:hover {
    background: var(--glass-hover);
    border-color: var(--glass-border);
  }

  .thread-item.active {
    background: var(--aether-deep);
    border-color: var(--aether);
  }

  .thread-item.editing {
    background: var(--glass-hover);
    border-color: var(--aether);
  }

  .thread-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .thread-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .thread-title {
    color: var(--light);
    font-size: 0.95rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .edit-btn {
    background: transparent;
    border: none;
    color: var(--light-faint);
    padding: 6px;
    cursor: pointer;
    opacity: 0;
    transition: all var(--transition-fast);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .thread-item:hover .edit-btn {
    opacity: 0.7;
  }

  .edit-btn:hover {
    opacity: 1;
    color: var(--aether-glow);
    background: rgba(139, 92, 246, 0.1);
  }

  .thread-title-input {
    width: 100%;
    background: var(--void-light);
    border: 1px solid var(--aether);
    border-radius: var(--radius-sm);
    color: var(--light);
    padding: var(--space-xs) var(--space-sm);
    font-size: 0.95rem;
    font-family: inherit;
    outline: none;
    transition: border-color var(--transition-fast);
  }

  .thread-title-input:focus {
    border-color: var(--aether-glow);
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
  }

  .thread-meta {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-top: 2px;
  }

  .thread-time {
    font-size: 0.8rem;
    color: var(--light-faint);
  }

  .thread-date {
    font-size: 0.75rem;
    color: var(--light-faint);
    opacity: 0.7;
    flex: 1;
  }

  .delete-btn {
    position: absolute;
    bottom: 8px;
    right: 8px;
    background: var(--void-deep);
    border: 1px solid var(--glass-border);
    color: var(--light-faint);
    width: 22px;
    height: 22px;
    padding: 0;
    cursor: pointer;
    opacity: 0;
    transition: all var(--transition-fast);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .thread-item:hover .delete-btn {
    opacity: 0.7;
  }

  .delete-btn:hover {
    opacity: 1;
    color: var(--ember-rose);
    border-color: var(--ember-rose);
    background: rgba(244, 63, 94, 0.1);
  }

  .favorite-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: var(--void-deep);
    border: 1px solid var(--glass-border);
    color: var(--light-faint);
    width: 22px;
    height: 22px;
    padding: 0;
    cursor: pointer;
    opacity: 0;
    transition: all var(--transition-fast);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .thread-item:hover .favorite-btn {
    opacity: 0.7;
  }

  .favorite-btn:hover {
    opacity: 1;
    color: var(--ember-rose);
    border-color: var(--ember-rose);
    background: rgba(244, 63, 94, 0.1);
  }

  .favorite-btn.active {
    opacity: 1;
    color: var(--ember-rose);
    border-color: var(--ember-rose);
    background: rgba(244, 63, 94, 0.15);
  }

  .empty-state {
    padding: var(--space-lg);
    text-align: center;
  }

  .empty-state p {
    color: var(--light-dim);
    margin: 0;
  }

  .empty-state .hint {
    font-size: 0.85rem;
    color: var(--light-faint);
    margin-top: var(--space-sm);
  }

  .sanctum-link {
    display: block;
    padding: var(--space-sm) var(--space-lg);
    text-align: center;
    color: var(--aether-glow);
    font-size: 0.8rem;
    border-bottom: 1px solid var(--glass-border);
    background: var(--aether-deep);
    transition: all var(--transition-fast);
    text-decoration: none;
  }

  .sanctum-link:hover {
    background: var(--aether);
    color: var(--light-bright);
  }

  .communion-chamber {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Welcome state */
  .welcome {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--space-2xl);
    gap: var(--space-lg);
  }

  .sigil {
    color: var(--aether-glow);
    opacity: 0.8;
  }

  .welcome h1 {
    font-size: 3rem;
    background: linear-gradient(135deg, var(--light-bright), var(--aether-glow));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    font-family: var(--font-serif);
    font-size: 1.25rem;
    font-style: italic;
    color: var(--light-dim);
  }

  .setup-notice {
    max-width: 500px;
    padding: var(--space-xl);
    border-radius: var(--radius-lg);
    text-align: left;
  }

  .setup-notice h3 {
    color: var(--aurora-gold);
    margin-bottom: var(--space-md);
    font-size: 1.1rem;
  }

  .setup-notice p {
    color: var(--light-dim);
    margin-bottom: var(--space-md);
  }

  .setup-notice ol {
    color: var(--light);
    padding-left: var(--space-lg);
  }

  .setup-notice li {
    margin-bottom: var(--space-sm);
  }

  .setup-notice code {
    background: var(--void-deep);
    padding: 0.1em 0.4em;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 0.9em;
    color: var(--celestial-cyan);
  }

  .setup-notice a {
    color: var(--aether-glow);
  }

  .setup-notice .btn {
    display: inline-block;
    background: var(--aether-deep);
    border: 1px solid var(--aether);
    border-radius: var(--radius-md);
    color: var(--light-bright);
    padding: var(--space-sm) var(--space-lg);
    margin-top: var(--space-md);
    transition: all var(--transition-fast);
  }

  .setup-notice .btn:hover {
    background: var(--aether);
  }

  .vessel-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    padding: var(--space-lg);
    border-radius: var(--radius-lg);
    margin: var(--space-lg) 0;
  }

  .vessel-info .label {
    font-size: 0.85rem;
    color: var(--light-faint);
  }

  .vessel-info .vessel-name {
    font-family: var(--font-serif);
    font-size: 1.5rem;
    color: var(--aether-glow);
  }

  .vessel-info .vessel-model {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: var(--light-dim);
  }

  .begin-btn {
    background: linear-gradient(135deg, var(--aether-deep), var(--aether));
    border: 1px solid var(--aether);
    border-radius: var(--radius-lg);
    color: var(--light-brightest);
    font-family: var(--font-serif);
    font-size: 1.25rem;
    padding: var(--space-md) var(--space-2xl);
    cursor: pointer;
    transition: all var(--transition-normal);
  }

  .begin-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-glow-lg);
  }

  .wisdom {
    font-family: var(--font-serif);
    font-style: italic;
    color: var(--light-faint);
    font-size: 0.95rem;
    margin-top: var(--space-2xl);
    line-height: 1.8;
  }

  /* Chat interface */
  .chat-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .messages-area {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: var(--space-xl);
    padding-right: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .chat-intro {
    text-align: center;
    padding: var(--space-2xl);
    color: var(--light-dim);
  }

  .chat-intro p {
    margin: var(--space-sm) 0;
  }

  .vessel-speaking {
    color: var(--aether-glow);
    font-style: italic;
  }

  .message {
    max-width: 80%;
    padding: var(--space-md) var(--space-lg);
    border-radius: var(--radius-lg);
    position: relative;
  }

  .message.seeker {
    align-self: flex-end;
    background: var(--aether-deep);
    border: 1px solid var(--aether);
  }

  .message.vessel {
    align-self: flex-start;
    background: var(--glass);
    border: 1px solid var(--glass-border);
  }

  .message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-xs);
  }

  .message-role {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--light-dim);
  }

  .message.seeker .message-role {
    color: var(--aether-glow);
  }

  .message.vessel .message-role {
    color: var(--aurora-gold);
  }

  .message-meta {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-top: var(--space-sm);
    padding-top: var(--space-xs);
    border-top: 1px solid var(--glass-border);
  }

  .message-time {
    font-size: 0.8rem;
    color: var(--light-faint);
  }

  .message-date {
    font-size: 0.75rem;
    color: var(--light-faint);
    opacity: 0.7;
  }

  .message-favorite-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: var(--void-deep);
    border: 1px solid var(--glass-border);
    color: var(--light-faint);
    width: 26px;
    height: 26px;
    padding: 0;
    cursor: pointer;
    opacity: 0.6;
    transition: all var(--transition-fast);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .message-favorite-btn:hover {
    opacity: 1;
    color: var(--ember-rose);
    border-color: var(--ember-rose);
    background: rgba(244, 63, 94, 0.1);
  }

  .message-favorite-btn.active {
    opacity: 1;
    color: var(--ember-rose);
    border-color: var(--ember-rose);
    background: rgba(244, 63, 94, 0.15);
  }

  .message-content {
    color: var(--light);
    line-height: 1.6;
  }

  /* Prose styles for markdown content */
  .message-content.prose :global(p) {
    margin: 0 0 1em 0;
  }

  .message-content.prose :global(p:last-child) {
    margin-bottom: 0;
  }

  .message-content.prose :global(h1),
  .message-content.prose :global(h2),
  .message-content.prose :global(h3),
  .message-content.prose :global(h4) {
    font-family: var(--font-serif);
    color: var(--light-bright);
    margin: 1.5em 0 0.5em 0;
  }

  .message-content.prose :global(h1:first-child),
  .message-content.prose :global(h2:first-child),
  .message-content.prose :global(h3:first-child) {
    margin-top: 0;
  }

  .message-content.prose :global(h1) {
    font-size: 1.5em;
  }
  .message-content.prose :global(h2) {
    font-size: 1.3em;
  }
  .message-content.prose :global(h3) {
    font-size: 1.1em;
  }

  .message-content.prose :global(ul),
  .message-content.prose :global(ol) {
    margin: 0.5em 0;
    padding-left: 1.5em;
  }

  .message-content.prose :global(li) {
    margin: 0.25em 0;
  }

  .message-content.prose :global(code) {
    background: var(--void-deep);
    padding: 0.15em 0.4em;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 0.9em;
    color: var(--celestial-cyan);
  }

  .message-content.prose :global(pre) {
    background: var(--void-deep);
    padding: var(--space-md);
    border-radius: var(--radius-md);
    overflow-x: auto;
    margin: 1em 0;
  }

  .message-content.prose :global(pre code) {
    background: none;
    padding: 0;
    font-size: 0.85em;
    color: var(--light);
  }

  .message-content.prose :global(blockquote) {
    border-left: 3px solid var(--aether);
    margin: 1em 0;
    padding-left: var(--space-md);
    color: var(--light-dim);
    font-style: italic;
  }

  .message-content.prose :global(a) {
    color: var(--aether-glow);
    text-decoration: underline;
  }

  .message-content.prose :global(a:hover) {
    color: var(--celestial-cyan);
  }

  .message-content.prose :global(strong) {
    color: var(--light-bright);
    font-weight: 600;
  }

  .message-content.prose :global(em) {
    font-style: italic;
  }

  .message-content.prose :global(hr) {
    border: none;
    border-top: 1px solid var(--glass-border);
    margin: 1.5em 0;
  }

  /* Table styles */
  .message-content.prose :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 0.9em;
  }

  .message-content.prose :global(th),
  .message-content.prose :global(td) {
    border: 1px solid var(--glass-border);
    padding: var(--space-sm) var(--space-md);
    text-align: left;
  }

  .message-content.prose :global(th) {
    background: var(--void-deep);
    color: var(--light-bright);
    font-weight: 600;
  }

  .message-content.prose :global(tr:nth-child(even)) {
    background: rgba(255, 255, 255, 0.02);
  }

  .message-content.prose :global(tr:hover) {
    background: rgba(255, 255, 255, 0.05);
  }

  /* Image styles */
  .message-content.prose :global(img) {
    max-width: 100%;
    border-radius: var(--radius-md);
    margin: 1em 0;
  }

  .channeling-indicator {
    display: inline-block;
    color: var(--light-faint);
    font-style: italic;
  }

  .channeling-indicator::after {
    content: '...';
    animation: dots 1.5s infinite;
  }

  @keyframes dots {
    0%,
    20% {
      content: '.';
    }
    40% {
      content: '..';
    }
    60%,
    100% {
      content: '...';
    }
  }

  .input-area {
    display: flex;
    gap: var(--space-md);
    padding: var(--space-lg);
    border-top: 1px solid var(--glass-border);
    background: var(--glass);
    align-items: flex-end;
  }

  .message-input {
    flex: 1;
    background: var(--void-light);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    color: var(--light);
    padding: var(--space-md);
    font-size: 1rem;
    font-family: inherit;
    line-height: 1.5;
    resize: none;
    overflow-y: auto;
    min-height: 44px;
    max-height: 50vh;
    transition: border-color var(--transition-fast);
  }

  .message-input:focus {
    outline: none;
    border-color: var(--aether);
  }

  .message-input::placeholder {
    color: var(--light-faint);
  }

  .message-input:disabled {
    opacity: 0.6;
  }

  .send-btn {
    background: var(--aether-deep);
    border: 1px solid var(--aether);
    border-radius: var(--radius-md);
    color: var(--light-bright);
    padding: var(--space-md) var(--space-lg);
    cursor: pointer;
    transition: all var(--transition-fast);
    min-width: 80px;
    align-self: flex-end;
  }

  .send-btn:hover:not(:disabled) {
    background: var(--aether);
  }

  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Mobile responsiveness - Portrait */
  @media (max-width: 768px) {
    .sidebar-toggle {
      position: fixed;
      left: 0;
      top: var(--space-lg);
      transform: none;
      border-left: 1px solid var(--glass-border);
      border-radius: 0 var(--radius-md) var(--radius-md) 0;
      z-index: 102;
    }

    .sidebar-toggle.sidebar-open {
      left: 280px;
      border-left: none;
    }

    .sidebar {
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      width: 280px;
      min-width: 280px;
      z-index: 101;
      transform: translateX(-100%);
      transition: transform var(--transition-normal);
      background: rgba(10, 5, 20, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-right: 1px solid var(--glass-border);
    }

    .sidebar.open {
      transform: translateX(0);
    }

    .portal.sidebar-collapsed .sidebar {
      transform: translateX(-100%);
    }

    .welcome h1 {
      font-size: 2rem;
    }

    .message {
      max-width: 90%;
    }

    .input-area {
      padding: var(--space-sm) var(--space-md);
      padding-bottom: calc(env(safe-area-inset-bottom, 10px) + 10px);
    }

    .message-input {
      max-height: calc(5 * 1.5em + 2 * var(--space-sm));
      min-height: 40px;
      padding: var(--space-sm);
      font-size: 0.95rem;
    }

    .messages-area {
      padding-bottom: var(--space-md);
    }
  }

  /* Landscape mode on mobile/tablet */
  @media (max-width: 1024px) and (orientation: landscape) {
    .portal {
      flex-direction: row;
    }

    .sidebar {
      width: 240px;
      min-width: 240px;
    }

    .sidebar-toggle {
      left: 240px;
    }

    .portal.sidebar-collapsed .sidebar-toggle {
      left: 0;
    }

    .chat-container {
      flex-direction: row;
    }

    .messages-area {
      flex: 1;
    }

    .input-area {
      position: fixed;
      right: 0;
      top: 0;
      bottom: 0;
      width: 300px;
      flex-direction: column;
      border-top: none;
      border-left: 1px solid var(--glass-border);
      padding: var(--space-md);
    }

    .message-input {
      flex: 1;
      max-height: none;
    }

    .send-btn {
      width: 100%;
    }
  }

  /* Backdrop for mobile sidebar */
  @media (max-width: 768px) {
    .portal::before {
      content: '';
      position: fixed;
      inset: 0;
      background: rgba(10, 5, 20, 0.6);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 100;
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--transition-normal);
    }

    .portal:has(.sidebar.open)::before {
      opacity: 1;
      pointer-events: auto;
    }
  }

  /* Mobile keyboard-aware input */
  @supports (height: 100dvh) {
    @media (max-width: 768px) {
      .portal {
        height: 100dvh;
      }

      .message-input {
        max-height: calc(5 * 1.5em + 2 * var(--space-sm));
      }
    }
  }

  /* Large phones like iPhone Pro Max */
  @media (max-width: 430px) and (min-height: 800px) {
    .input-area {
      padding: var(--space-sm) var(--space-md);
      padding-bottom: calc(env(safe-area-inset-bottom, 10px) + 12px);
    }

    .message-input {
      max-height: calc(4 * 1.5em + 2 * var(--space-sm));
      min-height: 38px;
    }

    .chat-intro {
      padding: var(--space-lg);
    }
  }
</style>
