import '@testing-library/jest-dom/vitest';
import '@testing-library/svelte/vitest';
import { vi } from 'vitest';

// Mock localStorage for store tests
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
		get length() {
			return Object.keys(store).length;
		},
		key: vi.fn((index: number) => Object.keys(store)[index] ?? null)
	};
})();

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
	writable: true
});

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
};

// Mock Element.prototype.animate for Svelte transitions
Element.prototype.animate = vi.fn().mockImplementation(() => {
	let onfinishHandler: (() => void) | null = null;
	let oncancelHandler: (() => void) | null = null;

	const animation = {
		finished: Promise.resolve(),
		cancel: vi.fn(),
		pause: vi.fn(),
		play: vi.fn(),
		reverse: vi.fn(),
		finish: vi.fn(),
		get onfinish() {
			return onfinishHandler;
		},
		set onfinish(handler: (() => void) | null) {
			onfinishHandler = handler;
			// Auto-trigger onfinish since we're in tests and want instant completion
			if (handler) {
				setTimeout(() => handler(), 0);
			}
		},
		get oncancel() {
			return oncancelHandler;
		},
		set oncancel(handler: (() => void) | null) {
			oncancelHandler = handler;
		},
		currentTime: 0,
		playbackRate: 1,
		playState: 'finished',
		effect: null,
		timeline: null,
		startTime: 0,
		pending: false,
		id: '',
		commitStyles: vi.fn(),
		persist: vi.fn(),
		updatePlaybackRate: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	};

	return animation;
});
