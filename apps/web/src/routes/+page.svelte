<script lang="ts">
	import { tick } from 'svelte';
	import { sendChatMessage, ApiError } from '$lib/api';

	type ChatMessage = { role: 'user' | 'assistant'; content: string };

	const SESSION_KEY = 'hapines_session_id';

	let message = $state('');
	let thread = $state<ChatMessage[]>([]);
	let loading = $state(false);
	let error = $state('');
	let sessionId = $state<string | undefined>(
		typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem(SESSION_KEY) ?? undefined) : undefined
	);
	let threadEl: HTMLElement | undefined = $state();

	async function scrollToBottom() {
		await tick();
		if (typeof threadEl?.scrollTo === 'function') {
			threadEl.scrollTo({ top: threadEl.scrollHeight, behavior: 'smooth' });
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const text = message.trim();
		if (!text || loading) return;

		thread.push({ role: 'user', content: text });
		message = '';
		loading = true;
		error = '';
		scrollToBottom();

		try {
			const res = await sendChatMessage(text, sessionId);
			thread.push({ role: 'assistant', content: res.reply });
			sessionId = res.sessionId;
			sessionStorage.setItem(SESSION_KEY, res.sessionId);
			scrollToBottom();
		} catch (err) {
			error = err instanceof ApiError ? err.message : 'Something went wrong. Try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Hapines — Daily Check-In Companion</title>
	<meta
		name="description"
		content="Hapines: a daily mood check-in companion built with SvelteKit, Hono, and Gemini."
	/>
</svelte:head>

<main class="page">
	<h1>Hapines</h1>
	<p class="subtitle">A quiet space to check in on your day.</p>

	{#if thread.length}
		<section class="thread" aria-live="polite" bind:this={threadEl}>
			{#each thread as msg}
				<p class="bubble {msg.role}">{msg.content}</p>
			{/each}
		</section>
	{/if}

	<form onsubmit={handleSubmit} class="chat-form">
		<label for="message" class="sr-only">Your message</label>
		<textarea
			id="message"
			bind:value={message}
			placeholder="How's your day going?"
			rows="3"
			maxlength="4000"
			disabled={loading}
		></textarea>

		<button type="submit" disabled={loading || !message.trim()} aria-busy={loading} title="Send message">
			{loading ? 'Thinking…' : 'Send'}
		</button>
	</form>

	{#if error}
		<p class="error" role="alert">{error}</p>
	{/if}
</main>

<style>
	.page {
		display: flex;
		flex-direction: column;
		height: 100dvh;
		max-width: 640px;
		margin: 0 auto;
		padding: 2rem 1rem;
		font-family: system-ui, sans-serif;
	}

	.subtitle {
		color: #555;
		margin-bottom: 1.5rem;
		flex-shrink: 0;
	}

	.thread {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		margin-bottom: 1rem;
		padding-right: 0.25rem;
	}

	.bubble {
		padding: 0.65rem 0.9rem;
		border-radius: 10px;
		white-space: pre-wrap;
		max-width: 85%;
	}

	.bubble.user {
		align-self: flex-end;
		background: #4f46e5;
		color: white;
	}

	.bubble.assistant {
		align-self: flex-start;
		background: #f5f5f7;
		color: #1a1a1a;
	}

	.chat-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		flex-shrink: 0;
	}

	textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		font: inherit;
		resize: vertical;
	}

	textarea:focus-visible,
	button:focus-visible {
		outline: 2px solid #4f46e5;
		outline-offset: 2px;
	}

	button {
		align-self: flex-end;
		padding: 0.6rem 1.4rem;
		background: #4f46e5;
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
	}

	button:disabled {
		background: #a5a5a5;
		cursor: not-allowed;
	}

	.error {
		color: #b91c1c;
		margin-top: 1rem;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>