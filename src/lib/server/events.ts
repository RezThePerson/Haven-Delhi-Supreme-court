type Listener = () => void;

class CourtEventEmitter {
	private listeners: Set<Listener> = new Set();

	subscribe(listener: Listener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	notify(): void {
		for (const listener of this.listeners) {
			try {
				listener();
			} catch (err) {
				console.error('Error notifying court listener:', err);
			}
		}
	}
}

export const courtEvents = new CourtEventEmitter();
