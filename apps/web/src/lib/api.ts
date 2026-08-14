import { PUBLIC_API_URL } from '$env/static/public';

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
	}
}

export async function sendChatMessage(message: string): Promise<string> {
	const res = await fetch(`${PUBLIC_API_URL}/chat`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ message })
	});

	if (!res.ok) {
		const body = await res.json().catch(() => ({ error: { message: 'Request failed' } }));
		throw new ApiError(res.status, body.error?.message ?? 'Request failed');
	}

	const data = await res.json();
	return data.reply;
}