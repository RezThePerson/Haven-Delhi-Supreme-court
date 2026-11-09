import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type { CourtCase, CreateCaseInput, UpdateCaseInput } from '#lib/types';
import { courtEvents } from './events';
import crypto from 'node:crypto';

// In-memory fallback database
const fallbackCases: CourtCase[] = [
	{
		id: 'case-1',
		accuser: 'Alice the Organizer',
		defendant: 'Bob the Night Owl',
		reason: 'Allegedly pushed broken untested code straight to main 5 minutes before the game jam presentation!',
		verdict: '',
		status: 'IN_SESSION',
		is_active: true,
		display_order: 1,
		created_at: new Date(Date.now() - 3600000).toISOString(),
		updated_at: new Date().toISOString()
	},
	{
		id: 'case-2',
		accuser: 'Spike the Hedgehog',
		defendant: 'Charlie the Pizza Bandit',
		reason: 'Took the very last slice of pepperoni pizza without asking the Discord channel!',
		verdict: 'GUILTY - Sentence: Bring donuts for the entire Haven Delhi jam tomorrow morning!',
		status: 'VERDICT_ANNOUNCED',
		is_active: false,
		display_order: 2,
		created_at: new Date(Date.now() - 7200000).toISOString(),
		updated_at: new Date(Date.now() - 1800000).toISOString()
	},
	{
		id: 'case-3',
		accuser: 'Dev Team Alpha',
		defendant: 'CSS Wizard Dan',
		reason: 'Overused z-index: 9999999 and caused the modal to cover the entire solar system.',
		verdict: '',
		status: 'UPCOMING',
		is_active: false,
		display_order: 3,
		created_at: new Date(Date.now() - 1800000).toISOString(),
		updated_at: new Date().toISOString()
	}
];

let sqlClient: NeonQueryFunction<false, false> | null = null;
let isNeonConfigured = false;
let tableInitialized = false;

function getDatabaseUrl(): string | undefined {
	return process.env.DATABASE_URL;
}

function initNeonClient(): boolean {
	const dbUrl = getDatabaseUrl();
	if (dbUrl && dbUrl.trim().length > 0) {
		try {
			sqlClient = neon(dbUrl.trim());
			isNeonConfigured = true;
			return true;
		} catch (err) {
			console.warn('[DB] Failed to initialize Neon client with provided URL, falling back to local store:', err);
			sqlClient = null;
			isNeonConfigured = false;
			return false;
		}
	}
	return false;
}

let ensureTablePromise: Promise<void> | null = null;

async function ensureTable(): Promise<void> {
	if (!isNeonConfigured || !sqlClient || tableInitialized) return;
	if (ensureTablePromise) return ensureTablePromise;

	ensureTablePromise = (async () => {
		try {
			if (!sqlClient) return;
			await sqlClient`
				CREATE TABLE IF NOT EXISTS cases (
					id TEXT PRIMARY KEY,
					accuser TEXT NOT NULL,
					defendant TEXT NOT NULL,
					reason TEXT NOT NULL,
					verdict TEXT DEFAULT '',
					status TEXT DEFAULT 'UPCOMING',
					is_active BOOLEAN DEFAULT FALSE,
					display_order INT DEFAULT 0,
					created_at TIMESTAMPTZ DEFAULT NOW(),
					updated_at TIMESTAMPTZ DEFAULT NOW()
				);
			`;

			// Check if table is empty, seed initial cases if so
			const countResult = await sqlClient`SELECT COUNT(*)::int as count FROM cases;`;
			const count = countResult[0]?.count ?? 0;
			if (count === 0) {
				for (const c of fallbackCases) {
					await sqlClient`
						INSERT INTO cases (id, accuser, defendant, reason, verdict, status, is_active, display_order, created_at, updated_at)
						VALUES (${c.id}, ${c.accuser}, ${c.defendant}, ${c.reason}, ${c.verdict}, ${c.status}, ${c.is_active}, ${c.display_order}, ${c.created_at}, ${c.updated_at})
						ON CONFLICT (id) DO NOTHING;
					`;
				}
			}
			tableInitialized = true;
			console.log('[DB] Neon DB table initialized and ready.');
		} catch (err: any) {
			if (err?.code === '23505') {
				// Table was created concurrently by another connection, which is fine!
				tableInitialized = true;
			} else {
				console.warn('[DB] Error during table setup, will retry next query:', err);
			}
		} finally {
			ensureTablePromise = null;
		}
	})();

	return ensureTablePromise;
}

// Initial setup attempt
initNeonClient();

export function getDbStatus() {
	const hasUrl = Boolean(getDatabaseUrl());
	return {
		isNeon: isNeonConfigured,
		hasUrl,
		mode: isNeonConfigured ? 'Neon PostgreSQL' : 'Local In-Memory Fallback'
	};
}

export async function getCases(): Promise<CourtCase[]> {
	initNeonClient();
	await ensureTable();

	if (isNeonConfigured && sqlClient) {
		try {
			const rows = await sqlClient`
				SELECT id, accuser, defendant, reason, verdict, status, is_active, display_order,
				       created_at::text, updated_at::text
				FROM cases
				ORDER BY display_order ASC, created_at ASC;
			`;
			return rows.map((r: any) => ({
				id: r.id,
				accuser: r.accuser,
				defendant: r.defendant,
				reason: r.reason,
				verdict: r.verdict ?? '',
				status: r.status,
				is_active: Boolean(r.is_active),
				display_order: Number(r.display_order ?? 0),
				created_at: r.created_at,
				updated_at: r.updated_at
			}));
		} catch (err) {
			console.error('[DB] Neon getCases error, falling back:', err);
		}
	}

	return [...fallbackCases].sort((a, b) => a.display_order - b.display_order);
}

export async function getActiveCase(): Promise<CourtCase | null> {
	const all = await getCases();
	return all.find((c) => c.is_active) || null;
}

export async function createCase(input: CreateCaseInput): Promise<CourtCase> {
	initNeonClient();
	await ensureTable();

	const id = 'case-' + crypto.randomUUID().slice(0, 8);
	const now = new Date().toISOString();
	const status = input.status ?? 'UPCOMING';
	const verdict = input.verdict ?? '';

	const all = await getCases();
	const maxOrder = all.reduce((max, c) => Math.max(max, c.display_order), 0);
	const displayOrder = maxOrder + 1;

	const newCase: CourtCase = {
		id,
		accuser: input.accuser.trim(),
		defendant: input.defendant.trim(),
		reason: input.reason.trim(),
		verdict: verdict.trim(),
		status,
		is_active: false,
		display_order: displayOrder,
		created_at: now,
		updated_at: now
	};

	if (isNeonConfigured && sqlClient) {
		try {
			await sqlClient`
				INSERT INTO cases (id, accuser, defendant, reason, verdict, status, is_active, display_order, created_at, updated_at)
				VALUES (${newCase.id}, ${newCase.accuser}, ${newCase.defendant}, ${newCase.reason}, ${newCase.verdict}, ${newCase.status}, ${newCase.is_active}, ${newCase.display_order}, ${newCase.created_at}, ${newCase.updated_at});
			`;
			courtEvents.notify();
			return newCase;
		} catch (err) {
			console.error('[DB] Neon createCase error, falling back:', err);
		}
	}

	fallbackCases.push(newCase);
	courtEvents.notify();
	return newCase;
}

export async function updateCase(id: string, input: UpdateCaseInput): Promise<CourtCase | null> {
	initNeonClient();
	await ensureTable();

	const now = new Date().toISOString();

	if (isNeonConfigured && sqlClient) {
		try {
			// If setting is_active to true, set all other cases to is_active false
			if (input.is_active === true) {
				await sqlClient`UPDATE cases SET is_active = FALSE WHERE id != ${id};`;
			}

			const current = (await sqlClient`SELECT * FROM cases WHERE id = ${id};`)[0];
			if (!current) return null;

			const updatedAccuser = input.accuser !== undefined ? input.accuser : current.accuser;
			const updatedDefendant = input.defendant !== undefined ? input.defendant : current.defendant;
			const updatedReason = input.reason !== undefined ? input.reason : current.reason;
			const updatedVerdict = input.verdict !== undefined ? input.verdict : current.verdict;
			const updatedStatus = input.status !== undefined ? input.status : current.status;
			const updatedIsActive = input.is_active !== undefined ? input.is_active : current.is_active;
			const updatedDisplayOrder = input.display_order !== undefined ? input.display_order : current.display_order;

			await sqlClient`
				UPDATE cases
				SET accuser = ${updatedAccuser},
				    defendant = ${updatedDefendant},
				    reason = ${updatedReason},
				    verdict = ${updatedVerdict},
				    status = ${updatedStatus},
				    is_active = ${updatedIsActive},
				    display_order = ${updatedDisplayOrder},
				    updated_at = ${now}
				WHERE id = ${id};
			`;

			courtEvents.notify();

			return {
				id,
				accuser: updatedAccuser,
				defendant: updatedDefendant,
				reason: updatedReason,
				verdict: updatedVerdict ?? '',
				status: updatedStatus,
				is_active: Boolean(updatedIsActive),
				display_order: Number(updatedDisplayOrder),
				created_at: current.created_at,
				updated_at: now
			};
		} catch (err) {
			console.error('[DB] Neon updateCase error, falling back:', err);
		}
	}

	const index = fallbackCases.findIndex((c) => c.id === id);
	if (index === -1) return null;

	if (input.is_active === true) {
		for (const c of fallbackCases) {
			c.is_active = false;
		}
	}

	fallbackCases[index] = {
		...fallbackCases[index],
		...input,
		updated_at: now
	};

	courtEvents.notify();
	return fallbackCases[index];
}

export async function setActiveCase(id: string | null): Promise<CourtCase | null> {
	initNeonClient();
	await ensureTable();

	const now = new Date().toISOString();

	if (isNeonConfigured && sqlClient) {
		try {
			await sqlClient`UPDATE cases SET is_active = FALSE;`;
			if (id) {
				await sqlClient`UPDATE cases SET is_active = TRUE, updated_at = ${now} WHERE id = ${id};`;
				const updated: any = (await sqlClient`SELECT * FROM cases WHERE id = ${id};`)[0];
				courtEvents.notify();
				if (!updated) return null;
				return {
					id: updated.id,
					accuser: updated.accuser,
					defendant: updated.defendant,
					reason: updated.reason,
					verdict: updated.verdict ?? '',
					status: updated.status,
					is_active: Boolean(updated.is_active),
					display_order: Number(updated.display_order ?? 0),
					created_at: String(updated.created_at),
					updated_at: String(updated.updated_at)
				};
			}
			courtEvents.notify();
			return null;
		} catch (err) {
			console.error('[DB] Neon setActiveCase error, falling back:', err);
		}
	}

	for (const c of fallbackCases) {
		c.is_active = id !== null && c.id === id;
		if (c.is_active) {
			c.updated_at = now;
		}
	}

	courtEvents.notify();
	return fallbackCases.find((c) => c.id === id) || null;
}

export async function deleteCase(id: string): Promise<boolean> {
	initNeonClient();
	await ensureTable();

	if (isNeonConfigured && sqlClient) {
		try {
			await sqlClient`DELETE FROM cases WHERE id = ${id};`;
			courtEvents.notify();
			return true;
		} catch (err) {
			console.error('[DB] Neon deleteCase error, falling back:', err);
		}
	}

	const idx = fallbackCases.findIndex((c) => c.id === id);
	if (idx !== -1) {
		fallbackCases.splice(idx, 1);
		courtEvents.notify();
		return true;
	}
	return false;
}
