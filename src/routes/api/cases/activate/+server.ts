import { json, type RequestHandler } from '@sveltejs/kit';
import { setActiveCase } from '#lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { id } = (await request.json()) as { id: string | null };
		const active = await setActiveCase(id ?? null);
		return json({ activeCase: active });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to set active case' }, { status: 500 });
	}
};
