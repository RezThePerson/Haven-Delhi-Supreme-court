import { json, type RequestHandler } from '@sveltejs/kit';
import { getCases, getActiveCase, createCase, getDbStatus } from '#lib/server/db';
import type { CreateCaseInput } from '#lib/types';

export const GET: RequestHandler = async () => {
	const [cases, activeCase] = await Promise.all([getCases(), getActiveCase()]);
	const dbStatus = getDbStatus();
	return json({ cases, activeCase, dbStatus });
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as CreateCaseInput;
		if (!body.accuser || !body.defendant || !body.reason) {
			return json(
				{ error: 'Accuser, defendant, and reason are required.' },
				{ status: 400 }
			);
		}
		const newCase = await createCase(body);
		return json({ case: newCase }, { status: 201 });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to create case' }, { status: 500 });
	}
};
