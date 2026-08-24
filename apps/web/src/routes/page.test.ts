import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import Page from './+page.svelte';

vi.mock('$env/static/public', () => ({
	PUBLIC_API_URL: 'http://localhost:8787'
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
	fetchMock.mockReset();
});

describe('Chat page', () => {
	it('disables send button when message is empty', () => {
		render(Page);
		const button = screen.getByRole('button', { name: /send/i });
		expect(button).toBeDisabled();
	});

	it('enables send button when message is typed', async () => {
		render(Page);
		const textarea = screen.getByLabelText(/your message/i);
		await fireEvent.input(textarea, { target: { value: 'Hello' } });
		const button = screen.getByRole('button', { name: /send/i });
		expect(button).not.toBeDisabled();
	});

	it('shows reply after successful submit', async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ reply: 'Hi there!', sessionId: 'test-session-id' })
		});

		render(Page);
		const textarea = screen.getByLabelText(/your message/i);
		await fireEvent.input(textarea, { target: { value: 'Hello' } });
		await fireEvent.click(screen.getByRole('button', { name: /send/i }));

		await waitFor(() => {
			expect(screen.getByText('Hi there!')).toBeInTheDocument();
		});
	});

	it('shows error message on failed request', async () => {
		fetchMock.mockResolvedValueOnce({
			ok: false,
			status: 500,
			json: async () => ({ error: { message: 'AI service temporarily unavailable' } })
		});

		render(Page);
		const textarea = screen.getByLabelText(/your message/i);
		await fireEvent.input(textarea, { target: { value: 'Hello' } });
		await fireEvent.click(screen.getByRole('button', { name: /send/i }));

		await waitFor(() => {
			expect(screen.getByRole('alert')).toHaveTextContent(/temporarily unavailable/i);
		});
	});

	it('sends the message when Enter is pressed', async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ reply: 'Got it.', sessionId: 'test-session-id' })
		});

		render(Page);
		const textarea = screen.getByLabelText(/your message/i);
		await fireEvent.input(textarea, { target: { value: 'Hello' } });
		await fireEvent.keyDown(textarea, { key: 'Enter' });

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});
	});

	it('does not send and inserts a newline when Shift+Enter is pressed', async () => {
		render(Page);
		const textarea = screen.getByLabelText(/your message/i);
		await fireEvent.input(textarea, { target: { value: 'Hello' } });
		await fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('reuses the returned sessionId on the next message', async () => {
		fetchMock
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ reply: 'First reply', sessionId: 'session-abc' })
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ reply: 'Second reply', sessionId: 'session-abc' })
			});

		render(Page);
		const textarea = screen.getByLabelText(/your message/i);

		await fireEvent.input(textarea, { target: { value: 'First message' } });
		await fireEvent.click(screen.getByRole('button', { name: /send/i }));
		await waitFor(() => expect(screen.getByText('First reply')).toBeInTheDocument());

		await fireEvent.input(textarea, { target: { value: 'Second message' } });
		await fireEvent.click(screen.getByRole('button', { name: /send/i }));
		await waitFor(() => expect(screen.getByText('Second reply')).toBeInTheDocument());

		const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body);
		expect(secondCallBody.sessionId).toBe('session-abc');

		// Both turns' messages should still be visible in the thread.
		expect(screen.getByText('First message')).toBeInTheDocument();
		expect(screen.getByText('Second message')).toBeInTheDocument();
	});
});