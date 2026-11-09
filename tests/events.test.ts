import { describe, it, expect } from 'bun:test';
import { courtEvents } from '#lib/server/events';

describe('Court Event Bus', () => {
	it('should notify subscribers when events occur', () => {
		let callCount = 0;
		const unsubscribe = courtEvents.subscribe(() => {
			callCount++;
		});

		courtEvents.notify();
		expect(callCount).toBe(1);

		courtEvents.notify();
		expect(callCount).toBe(2);

		unsubscribe();
		courtEvents.notify();
		expect(callCount).toBe(2);
	});
});
