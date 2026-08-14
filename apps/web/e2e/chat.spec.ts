import { test, expect } from '@playwright/test';

test.describe('Chat flow', () => {
	test('send button is disabled until user types', async ({ page }) => {
		await page.goto('/');
		const button = page.getByRole('button', { name: /send/i });
		await expect(button).toBeDisabled();

		await page.getByLabel(/your message/i).fill('Hello there');
		await expect(button).toBeEnabled();
	});

	test('shows an error state when the API is unreachable', async ({ page }) => {
		await page.route('**/chat', (route) =>
			route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ error: { message: 'AI service temporarily unavailable' } })
			})
		);

		await page.goto('/');
		await page.getByLabel(/your message/i).fill('Hello there');
		await page.getByRole('button', { name: /send/i }).click();

		await expect(page.getByRole('alert')).toContainText(/temporarily unavailable/i);
	});

	test('is keyboard navigable', async ({ page }) => {
		await page.goto('/');
		await page.keyboard.press('Tab');
		await expect(page.getByLabel(/your message/i)).toBeFocused();
	});
});