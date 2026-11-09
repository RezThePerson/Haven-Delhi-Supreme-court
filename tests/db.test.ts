import { describe, it, expect, beforeEach } from 'bun:test';
import {
	getCases,
	getActiveCase,
	createCase,
	updateCase,
	setActiveCase,
	deleteCase,
	getDbStatus
} from '#lib/server/db';

describe('Court Database Operations', () => {
	it('should report database connection status', () => {
		const status = getDbStatus();
		expect(status).toBeDefined();
		expect(typeof status.isNeon).toBe('boolean');
		expect(typeof status.mode).toBe('string');
	});

	it('should create a new case with required fields', async () => {
		const newCase = await createCase({
			accuser: 'Test Detective Hedgehog',
			defendant: 'Test Cookie Monster',
			reason: 'Ate all the chocolate chip cookies during the Haven sprint'
		});

		expect(newCase).toBeDefined();
		expect(newCase.id).toMatch(/^case-/);
		expect(newCase.accuser).toBe('Test Detective Hedgehog');
		expect(newCase.defendant).toBe('Test Cookie Monster');
		expect(newCase.reason).toBe('Ate all the chocolate chip cookies during the Haven sprint');
		expect(newCase.status).toBe('UPCOMING');
		expect(newCase.is_active).toBe(false);

		// Clean up
		await deleteCase(newCase.id);
	}, 20000);

	it('should put a case on active stage and ensure only one case is active', async () => {
		const caseA = await createCase({
			accuser: 'Party A',
			defendant: 'Party B',
			reason: 'Dispute over merge conflict'
		});
		const caseB = await createCase({
			accuser: 'Party C',
			defendant: 'Party D',
			reason: 'Tab vs Space argument'
		});

		// Activate case A
		await setActiveCase(caseA.id);
		let active = await getActiveCase();
		expect(active?.id).toBe(caseA.id);

		// Activate case B
		await setActiveCase(caseB.id);
		active = await getActiveCase();
		expect(active?.id).toBe(caseB.id);

		// Check all cases: case A must now be inactive
		const allCases = await getCases();
		const fetchedA = allCases.find((c) => c.id === caseA.id);
		expect(fetchedA?.is_active).toBe(false);

		// Clear active stage
		await setActiveCase(null);
		active = await getActiveCase();
		expect(active).toBeNull();

		// Clean up
		await deleteCase(caseA.id);
		await deleteCase(caseB.id);
	}, 25000);

	it('should handle GUILTY, NOT GUILTY, and STILL THINKING verdicts', async () => {
		const testCase = await createCase({
			accuser: 'Lead Organizer',
			defendant: 'Late Submitter',
			reason: 'Submitted game at 12:00:01 PM'
		});

		// 1. Pronounce GUILTY
		const guiltyUpdate = await updateCase(testCase.id, {
			verdict: 'GUILTY',
			status: 'VERDICT_ANNOUNCED'
		});
		expect(guiltyUpdate?.verdict).toBe('GUILTY');
		expect(guiltyUpdate?.status).toBe('VERDICT_ANNOUNCED');

		// 2. Change to NOT GUILTY
		const notGuiltyUpdate = await updateCase(testCase.id, {
			verdict: 'NOT GUILTY',
			status: 'VERDICT_ANNOUNCED'
		});
		expect(notGuiltyUpdate?.verdict).toBe('NOT GUILTY');
		expect(notGuiltyUpdate?.status).toBe('VERDICT_ANNOUNCED');

		// 3. Revert to STILL THINKING (deliberating)
		const stillThinkingUpdate = await updateCase(testCase.id, {
			verdict: '',
			status: 'IN_SESSION'
		});
		expect(stillThinkingUpdate?.verdict).toBe('');
		expect(stillThinkingUpdate?.status).toBe('IN_SESSION');

		// Clean up
		await deleteCase(testCase.id);
	}, 25000);

	it('should delete a case cleanly from the database', async () => {
		const tempCase = await createCase({
			accuser: 'Temporary Accuser',
			defendant: 'Temporary Defendant',
			reason: 'Temporary Charge'
		});

		const deleted = await deleteCase(tempCase.id);
		expect(deleted).toBe(true);

		const cases = await getCases();
		const found = cases.find((c) => c.id === tempCase.id);
		expect(found).toBeUndefined();
	}, 25000);
});
