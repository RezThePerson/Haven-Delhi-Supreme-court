import { describe, it, expect } from 'bun:test';
import { GET as getCasesHandler, POST as createCaseHandler } from '../src/routes/api/cases/+server';
import { PATCH as updateCaseHandler, DELETE as deleteCaseHandler } from '../src/routes/api/cases/[id]/+server';
import { POST as activateCaseHandler } from '../src/routes/api/cases/activate/+server';

describe('Court REST API Endpoints', () => {
	it('should return cases and activeCase from GET /api/cases', async () => {
		const response = await getCasesHandler({} as any);
		expect(response.status).toBe(200);

		const data = await response.json();
		expect(Array.isArray(data.cases)).toBe(true);
		expect(data.dbStatus).toBeDefined();
	}, 20000);

	it('should reject POST /api/cases without required fields', async () => {
		const mockRequest = new Request('http://localhost:5173/api/cases', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ accuser: 'Only Accuser' })
		});

		const response = await createCaseHandler({ request: mockRequest } as any);
		expect(response.status).toBe(400);

		const data = await response.json();
		expect(data.error).toBeDefined();
	});

	it('should create, update, activate, and delete a case via API endpoints', async () => {
		// 1. POST /api/cases
		const createReq = new Request('http://localhost:5173/api/cases', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				accuser: 'API Detective',
				defendant: 'API Suspect',
				reason: 'Broke unit tests in production'
			})
		});

		const createRes = await createCaseHandler({ request: createReq } as any);
		expect(createRes.status).toBe(201);
		const createdData = await createRes.json();
		const caseId = createdData.case.id;
		expect(caseId).toBeDefined();

		// 2. POST /api/cases/activate
		const activateReq = new Request('http://localhost:5173/api/cases/activate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: caseId })
		});
		const activateRes = await activateCaseHandler({ request: activateReq } as any);
		expect(activateRes.status).toBe(200);
		const activateData = await activateRes.json();
		expect(activateData.activeCase?.id).toBe(caseId);

		// 3. PATCH /api/cases/[id] -> GUILTY
		const updateReq = new Request(`http://localhost:5173/api/cases/${caseId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				verdict: 'GUILTY',
				status: 'VERDICT_ANNOUNCED'
			})
		});
		const updateRes = await updateCaseHandler({ params: { id: caseId }, request: updateReq } as any);
		expect(updateRes.status).toBe(200);
		const updateData = await updateRes.json();
		expect(updateData.case.verdict).toBe('GUILTY');
		expect(updateData.case.status).toBe('VERDICT_ANNOUNCED');

		// 4. DELETE /api/cases/[id]
		const deleteRes = await deleteCaseHandler({ params: { id: caseId } } as any);
		expect(deleteRes.status).toBe(200);
		const deleteData = await deleteRes.json();
		expect(deleteData.success).toBe(true);
	}, 35000);
});
