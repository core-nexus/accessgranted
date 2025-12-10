<!--
═══════════════════════════════════════════════════════════════════════════════
CHAT INPUT - The vessel through which seekers speak
═══════════════════════════════════════════════════════════════════════════════
-->
<script lang="ts">
  interface Props {
    onSend: (message: string) => void
    disabled?: boolean
    placeholder?: string
  }

  let { onSend, disabled = false, placeholder = 'Speak your truth...' }: Props = $props()

  let message = $state('')
  let textarea: HTMLTextAreaElement

  function handleSubmit(e: Event) {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSend(message.trim())
      message = ''
      // Reset textarea height
      if (textarea) {
        textarea.style.height = 'auto'
      }
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  function autoResize() {
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
    }
  }
</script>

<form class="chat-input-container" onsubmit={handleSubmit}>
  <div class="input-wrapper" class:disabled>
    <textarea
      bind:this={textarea}
      bind:value={message}
      onkeydown={handleKeyDown}
      oninput={autoResize}
      {placeholder}
      {disabled}
      rows="1"
    ></textarea>
    <button
      type="submit"
      class="send-btn"
      disabled={disabled || !message.trim()}
      aria-label="Send message"
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
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    </button>
  </div>
  <p class="hint">
    Press <kbd>Enter</kbd> to send, <kbd>Shift + Enter</kbd> for new line
  </p>
</form>

<style>
  .chat-input-container {
    padding: var(--space-lg);
    background: linear-gradient(to top, var(--void-deepest), transparent);
  }

  .input-wrapper {
    display: flex;
    align-items: flex-end;
    gap: var(--space-sm);
    background: var(--void-light);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: var(--space-sm) var(--space-md);
    transition: all var(--transition-fast);
  }

  .input-wrapper:focus-within {
    border-color: var(--aether);
    box-shadow: var(--shadow-glow-sm);
  }

  .input-wrapper.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  textarea {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--light-bright);
    font-family: var(--font-sans);
    font-size: 1rem;
    line-height: 1.5;
    resize: none;
    min-height: 24px;
    max-height: 200px;
  }

  textarea::placeholder {
    color: var(--light-faint);
    font-style: italic;
  }

  textarea:focus {
    outline: none;
  }

  textarea:disabled {
    cursor: not-allowed;
  }

  .send-btn {
    background: var(--aether);
    border: none;
    border-radius: var(--radius-md);
    color: var(--light-brightest);
    padding: var(--space-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .send-btn:hover:not(:disabled) {
    background: var(--aether-light);
    box-shadow: var(--shadow-glow-sm);
  }

  .send-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .hint {
    text-align: center;
    font-size: 0.75rem;
    color: var(--light-faint);
    margin-top: var(--space-sm);
  }

  kbd {
    background: var(--void-light);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    padding: 0.1em 0.4em;
    font-family: var(--font-mono);
    font-size: 0.85em;
  }
</style>
