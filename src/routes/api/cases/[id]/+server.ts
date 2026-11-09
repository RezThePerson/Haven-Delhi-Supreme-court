import { json, type RequestHandler } from '@sveltejs/kit';
import { updateCase, deleteCase } from '#lib/server/db';
import type { UpdateCaseInput } from '#lib/types';

export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const { id } = params;
		if (!id) {
			return json({ error: 'Case ID is required' }, { status: 400 });
		}
		const body = (await request.json()) as UpdateCaseInput;
		const updated = await updateCase(id, body);
		if (!updated) {
			return json({ error: 'Case not found' }, { status: 404 });
		}
		return json({ case: updated });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to update case' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;
		if (!id) {
			return json({ error: 'Case ID is required' }, { status: 400 });
		}
		const deleted = await deleteCase(id);
		if (!deleted) {
			return json({ error: 'Case not found' }, { status: 404 });
		}
		return json({ success: true });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to delete case' }, { status: 500 });
	}
};
