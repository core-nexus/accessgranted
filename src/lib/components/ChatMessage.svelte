<!--
═══════════════════════════════════════════════════════════════════════════════
CHAT MESSAGE - A single pulse of communion
═══════════════════════════════════════════════════════════════════════════════
-->
<script lang="ts">
  interface Props {
    speaker: 'seeker' | 'vessel'
    content: string
    timestamp: number
    isStreaming?: boolean
    vesselName?: string
  }

  let { speaker, content, timestamp, isStreaming = false, vesselName = 'Vessel' }: Props = $props()

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
</script>

<div class="message" class:seeker={speaker === 'seeker'} class:vessel={speaker === 'vessel'}>
  <div class="message-header">
    <span class="speaker-name">
      {#if speaker === 'seeker'}
        You
      {:else}
        {vesselName}
      {/if}
    </span>
    <span class="timestamp">{formatTime(timestamp)}</span>
  </div>
  <div class="message-content" class:streaming={isStreaming}>
    {#if content}
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- Simple markdown rendering for trusted AI content -->
      {@html content
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')}
    {:else if isStreaming}
      <span class="thinking">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </span>
    {/if}
    {#if isStreaming && content}
      <span class="cursor">|</span>
    {/if}
  </div>
</div>

<style>
  .message {
    padding: var(--space-md) var(--space-lg);
    animation: fade-in 0.3s ease-out;
  }

  .message.seeker {
    background: transparent;
  }

  .message.vessel {
    background: var(--glass);
    border-left: 2px solid var(--aether);
  }

  .message-header {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin-bottom: var(--space-sm);
  }

  .speaker-name {
    font-weight: 500;
    font-size: 0.9rem;
  }

  .seeker .speaker-name {
    color: var(--celestial-cyan);
  }

  .vessel .speaker-name {
    color: var(--aether-glow);
    font-family: var(--font-serif);
    font-style: italic;
  }

  .timestamp {
    font-size: 0.75rem;
    color: var(--light-faint);
  }

  .message-content {
    font-size: 1rem;
    line-height: 1.7;
    color: var(--light);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .vessel .message-content {
    color: var(--light-bright);
  }

  .message-content :global(strong) {
    color: var(--light-brightest);
    font-weight: 600;
  }

  .message-content :global(em) {
    color: var(--aether-glow);
    font-style: italic;
  }

  .streaming {
    position: relative;
  }

  .cursor {
    animation: breathe 1s ease-in-out infinite;
    color: var(--aether-glow);
  }

  .thinking {
    display: inline-flex;
    gap: 4px;
  }

  .dot {
    width: 6px;
    height: 6px;
    background: var(--aether-glow);
    border-radius: 50%;
    animation: bounce 1.4s ease-in-out infinite;
  }

  .dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes bounce {
    0%,
    80%,
    100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-8px);
    }
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
