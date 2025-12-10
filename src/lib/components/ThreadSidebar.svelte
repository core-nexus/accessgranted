<!--
═══════════════════════════════════════════════════════════════════════════════
THREAD SIDEBAR - The archive of past communions
═══════════════════════════════════════════════════════════════════════════════
-->
<script lang="ts">
  import { useQuery, useConvexClient } from 'convex-svelte'
  import { api } from '../../convex/_generated/api'
  import type { Id } from '../../convex/_generated/dataModel'

  interface Props {
    seekerId: Id<'seekers'> | null
    currentThreadId?: Id<'threads'> | null
    onSelectThread: (threadId: Id<'threads'>) => void
    onNewThread: () => void
  }

  let { seekerId, currentThreadId, onSelectThread, onNewThread }: Props = $props()

  // Get the Convex client for mutations
  const client = useConvexClient()

  // Query threads for this seeker
  const threadsQuery = $derived(
    seekerId ? useQuery(api.threads.getSeekerThreads, { seekerId }) : null,
  )

  const threads = $derived(threadsQuery?.data ?? [])
  const isLoading = $derived(threadsQuery?.isLoading ?? true)

  // Rename state
  let editingThreadId: Id<'threads'> | null = $state(null)
  let editingTitle = $state('')

  // Start editing a thread title
  function startEditing(
    e: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement },
    threadId: Id<'threads'>,
    currentTitle: string,
  ) {
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
        threadId: editingThreadId,
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

  // Handle thread selection (don't select while editing)
  function handleSelectThread(threadId: Id<'threads'>) {
    if (editingThreadId) return
    onSelectThread(threadId)
  }

  async function handleDelete(
    e: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement },
    threadId: Id<'threads'>,
  ) {
    e.stopPropagation()
    if (!client) return
    if (confirm('Are you sure you wish to release this communion from memory?')) {
      await client.mutation(api.threads.deleteThread, { threadId })
    }
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }
</script>

<aside class="sidebar">
  <div class="sidebar-header">
    <h2>Communions</h2>
    <button class="new-thread-btn" onclick={onNewThread} title="Begin new communion">
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
  </div>

  <div class="threads-list">
    {#if isLoading}
      <div class="loading">
        <div class="shimmer thread-skeleton"></div>
        <div class="shimmer thread-skeleton"></div>
        <div class="shimmer thread-skeleton"></div>
      </div>
    {:else if threads.length === 0}
      <div class="empty-state">
        <p>No communions yet</p>
        <p class="hint">Begin your first dialogue with the vessel</p>
      </div>
    {:else}
      {#each threads as thread (thread._id)}
        <div
          class="thread-item"
          class:active={thread._id === currentThreadId}
          class:editing={editingThreadId === thread._id}
          role="button"
          tabindex="0"
          onclick={() => handleSelectThread(thread._id)}
          onkeydown={(e) => e.key === 'Enter' && !editingThreadId && handleSelectThread(thread._id)}
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
            <div class="thread-info">
              <span class="thread-title">{thread.title}</span>
              <span class="thread-date">{formatDate(thread.lastMessageAt)}</span>
            </div>
            {#if thread.vessel}
              <span class="thread-vessel">{thread.vessel.name}</span>
            {/if}
            <div class="thread-actions">
              <button
                class="edit-btn"
                onclick={(e) => startEditing(e, thread._id, thread.title)}
                title="Rename communion"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
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
              <button
                class="delete-btn"
                onclick={(e) => handleDelete(e, thread._id)}
                title="Release this communion"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="3,6 5,6 21,6"></polyline>
                  <path
                    d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"
                  ></path>
                </svg>
              </button>
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</aside>

<style>
  .sidebar {
    width: 280px;
    min-width: 280px;
    height: 100%;
    background: var(--glass);
    border-right: 1px solid var(--glass-border);
    display: flex;
    flex-direction: column;
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
    font-size: 1.25rem;
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
    padding: var(--space-sm);
  }

  .thread-item {
    width: 100%;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    padding: var(--space-md);
    margin-bottom: var(--space-xs);
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: left;
    color: var(--light);
    position: relative;
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

  .thread-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .thread-title {
    font-size: 0.9rem;
    color: var(--light-bright);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  .thread-date {
    font-size: 0.75rem;
    color: var(--light-dim);
  }

  .thread-vessel {
    font-size: 0.7rem;
    color: var(--aether-glow);
    margin-top: var(--space-xs);
  }

  .thread-title-input {
    width: 100%;
    background: var(--void-light);
    border: 1px solid var(--aether);
    border-radius: var(--radius-sm);
    color: var(--light);
    padding: var(--space-xs) var(--space-sm);
    font-size: 0.9rem;
    font-family: inherit;
    outline: none;
    transition: border-color var(--transition-fast);
  }

  .thread-title-input:focus {
    border-color: var(--aether-glow);
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
  }

  .thread-actions {
    position: absolute;
    top: 50%;
    right: var(--space-sm);
    transform: translateY(-50%);
    display: flex;
    gap: var(--space-xs);
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  .thread-item:hover .thread-actions {
    opacity: 1;
  }

  .edit-btn {
    background: transparent;
    border: none;
    color: var(--light-faint);
    padding: var(--space-xs);
    cursor: pointer;
    transition: all var(--transition-fast);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .edit-btn:hover {
    color: var(--aether-glow);
    background: rgba(139, 92, 246, 0.1);
  }

  .delete-btn {
    background: transparent;
    border: none;
    color: var(--light-faint);
    padding: var(--space-xs);
    cursor: pointer;
    transition: all var(--transition-fast);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .delete-btn:hover {
    color: var(--aurora-pink);
    background: rgba(247, 118, 142, 0.1);
  }

  .loading,
  .empty-state {
    padding: var(--space-lg);
    text-align: center;
  }

  .thread-skeleton {
    height: 60px;
    border-radius: var(--radius-md);
    margin-bottom: var(--space-sm);
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

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    .sidebar {
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      z-index: 100;
      transform: translateX(-100%);
      transition: transform var(--transition-normal);
    }

    .sidebar.open {
      transform: translateX(0);
    }
  }
</style>
