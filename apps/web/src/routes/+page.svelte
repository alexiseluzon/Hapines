<script lang="ts">
	import { sendChatMessage, ApiError } from '$lib/api';

	let message = $state('');
	let reply = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!message.trim() || loading) return;

		loading = true;
		error = '';
		reply = '';

		try {
			reply = await sendChatMessage(message.trim());
		} catch (err) {
			error = err instanceof ApiError ? err.message : 'Something went wrong. Try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>HAPINES — AI Assistant Demo</title>
	<meta name="description" content="HAPINES demo: an AI-powered assistant built with SvelteKit, Hono, and Claude." />
</svelte:head>

<main class="page">
	<h1>HAPINES</h1>
	<p class="subtitle">Ask the assistant anything.</p>

	<form onsubmit={handleSubmit} class="chat-form">
		<label for="message" class="sr-only">Your message</label>
		<textarea
			id="message"
			bind:value={message}
			placeholder="Type your message…"
			rows="4"
			maxlength="4000"
			disabled={loading}
		></textarea>

		<button type="submit" disabled={loading || !message.trim()} aria-busy={loading}>
			{loading ? 'Thinking…' : 'Send'}
		</button>
	</form>

	{#if error}
		<p class="error" role="alert">{error}</p>
	{/if}

	{#if reply}
		<section class="reply" aria-live="polite">
			<h2 class="sr-only">Response</h2>
			<p>{reply}</p>
		</section>
	{/if}
</main>

<style>
	.page {
		max-width: 640px;
		margin: 0 auto;
		padding: 2rem 1rem;
		font-family: system-ui, sans-serif;
	}

	.subtitle {
		color: #555;
		margin-bottom: 1.5rem;
	}

	.chat-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
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

	.reply {
		margin-top: 1.5rem;
		padding: 1rem;
		background: #f5f5f7;
		border-radius: 8px;
		white-space: pre-wrap;
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