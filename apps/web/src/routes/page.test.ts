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
			json: async () => ({ reply: 'Hi there!' })
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
});