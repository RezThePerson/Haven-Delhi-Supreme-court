import type { RequestHandler } from '@sveltejs/kit';
import { getCases, getActiveCase, getDbStatus } from '#lib/server/db';
import { courtEvents } from '#lib/server/events';

export const GET: RequestHandler = () => {
	let unsubscribe: (() => void) | null = null;
	let heartbeat: any = null;

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			const pushState = async () => {
				try {
					const [cases, activeCase] = await Promise.all([getCases(), getActiveCase()]);
					const dbStatus = getDbStatus();
					const payload = JSON.stringify({ cases, activeCase, dbStatus });
					controller.enqueue(encoder.encode(`event: update\ndata: ${payload}\n\n`));
				} catch (err) {
					// Stream could be closed
				}
			};

			// Push initial state immediately
			await pushState();

			// Subscribe to updates
			unsubscribe = courtEvents.subscribe(pushState);

			// Keep-alive heartbeat every 15s to prevent intermediate proxies from dropping connection
			heartbeat = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(': ping\n\n'));
				} catch {
					clearInterval(heartbeat);
				}
			}, 15000);
		},
		cancel() {
			if (unsubscribe) unsubscribe();
			if (heartbeat) clearInterval(heartbeat);
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive'
		}
	});
};
