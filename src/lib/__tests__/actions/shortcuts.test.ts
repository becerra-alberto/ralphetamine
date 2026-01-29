import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shortcuts, type ShortcutConfig } from '../../actions/shortcuts';
import { goto } from '$app/navigation';

// Type for event listener spy mock calls
type MockCall = [string, EventListener];

describe('Shortcuts Action', () => {
	let mockElement: HTMLElement;
	let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
	let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();

		// Create mock element
		mockElement = document.createElement('div');

		// Spy on window event listeners
		addEventListenerSpy = vi.spyOn(window, 'addEventListener');
		removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('initialization', () => {
		it('should register keyboard listeners on mount', () => {
			const action = shortcuts(mockElement);

			expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

			action.destroy();
		});

		it('should clean up listeners on destroy', () => {
			const action = shortcuts(mockElement);

			action.destroy();

			expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
		});
	});

	describe('default shortcuts', () => {
		it('should have shortcuts for Cmd+1 through Cmd+4', () => {
			const action = shortcuts(mockElement);

			// Get the handler that was registered
			const handler = (addEventListenerSpy.mock.calls as MockCall[]).find(
				(call) => call[0] === 'keydown'
			)?.[1] as (e: KeyboardEvent) => void;

			expect(handler).toBeDefined();

			action.destroy();
		});
	});

	describe('keyboard events', () => {
		it('should call goto with "/" on Cmd+1', () => {
			const action = shortcuts(mockElement);

			// Get the handler
			const handler = (addEventListenerSpy.mock.calls as MockCall[]).find(
				(call) => call[0] === 'keydown'
			)?.[1] as (e: KeyboardEvent) => void;

			// Simulate Cmd+1
			const event = new KeyboardEvent('keydown', {
				key: '1',
				metaKey: true,
				bubbles: true
			});
			Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

			handler(event);

			expect(goto).toHaveBeenCalledWith('/');
			expect(event.preventDefault).toHaveBeenCalled();

			action.destroy();
		});

		it('should call goto with "/budget" on Cmd+2', () => {
			const action = shortcuts(mockElement);

			const handler = (addEventListenerSpy.mock.calls as MockCall[]).find(
				(call) => call[0] === 'keydown'
			)?.[1] as (e: KeyboardEvent) => void;

			const event = new KeyboardEvent('keydown', {
				key: '2',
				metaKey: true,
				bubbles: true
			});
			Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

			handler(event);

			expect(goto).toHaveBeenCalledWith('/budget');

			action.destroy();
		});

		it('should call goto with "/transactions" on Cmd+3', () => {
			const action = shortcuts(mockElement);

			const handler = (addEventListenerSpy.mock.calls as MockCall[]).find(
				(call) => call[0] === 'keydown'
			)?.[1] as (e: KeyboardEvent) => void;

			const event = new KeyboardEvent('keydown', {
				key: '3',
				metaKey: true,
				bubbles: true
			});
			Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

			handler(event);

			expect(goto).toHaveBeenCalledWith('/transactions');

			action.destroy();
		});

		it('should call goto with "/net-worth" on Cmd+4', () => {
			const action = shortcuts(mockElement);

			const handler = (addEventListenerSpy.mock.calls as MockCall[]).find(
				(call) => call[0] === 'keydown'
			)?.[1] as (e: KeyboardEvent) => void;

			const event = new KeyboardEvent('keydown', {
				key: '4',
				metaKey: true,
				bubbles: true
			});
			Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

			handler(event);

			expect(goto).toHaveBeenCalledWith('/net-worth');

			action.destroy();
		});

		it('should not trigger on non-meta key press', () => {
			const action = shortcuts(mockElement);

			const handler = (addEventListenerSpy.mock.calls as MockCall[]).find(
				(call) => call[0] === 'keydown'
			)?.[1] as (e: KeyboardEvent) => void;

			// Simulate just '1' without meta key
			const event = new KeyboardEvent('keydown', {
				key: '1',
				metaKey: false,
				bubbles: true
			});
			Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

			handler(event);

			expect(goto).not.toHaveBeenCalled();

			action.destroy();
		});

		it('should not trigger on non-shortcut keys', () => {
			const action = shortcuts(mockElement);

			const handler = (addEventListenerSpy.mock.calls as MockCall[]).find(
				(call) => call[0] === 'keydown'
			)?.[1] as (e: KeyboardEvent) => void;

			// Simulate Cmd+5 (not a defined shortcut)
			const event = new KeyboardEvent('keydown', {
				key: '5',
				metaKey: true,
				bubbles: true
			});
			Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

			handler(event);

			expect(goto).not.toHaveBeenCalled();

			action.destroy();
		});
	});

	describe('letter navigation shortcuts', () => {
		it('should call goto with "/budget" on Cmd+U', () => {
			const action = shortcuts(mockElement);

			const handler = (addEventListenerSpy.mock.calls as MockCall[]).find(
				(call) => call[0] === 'keydown'
			)?.[1] as (e: KeyboardEvent) => void;

			const event = new KeyboardEvent('keydown', {
				key: 'u',
				metaKey: true,
				bubbles: true
			});
			Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

			handler(event);

			expect(goto).toHaveBeenCalledWith('/budget');
			expect(event.preventDefault).toHaveBeenCalled();

			action.destroy();
		});

		it('should call goto with "/transactions" on Cmd+T', () => {
			const action = shortcuts(mockElement);

			const handler = (addEventListenerSpy.mock.calls as MockCall[]).find(
				(call) => call[0] === 'keydown'
			)?.[1] as (e: KeyboardEvent) => void;

			const event = new KeyboardEvent('keydown', {
				key: 't',
				metaKey: true,
				bubbles: true
			});
			Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

			handler(event);

			expect(goto).toHaveBeenCalledWith('/transactions');
			expect(event.preventDefault).toHaveBeenCalled();

			action.destroy();
		});

		it('should call goto with "/net-worth" on Cmd+W', () => {
			const action = shortcuts(mockElement);

			const handler = (addEventListenerSpy.mock.calls as MockCall[]).find(
				(call) => call[0] === 'keydown'
			)?.[1] as (e: KeyboardEvent) => void;

			const event = new KeyboardEvent('keydown', {
				key: 'w',
				metaKey: true,
				bubbles: true
			});
			Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

			handler(event);

			expect(goto).toHaveBeenCalledWith('/net-worth');
			expect(event.preventDefault).toHaveBeenCalled();

			action.destroy();
		});

		it('should handle uppercase key press (Cmd+T vs Cmd+t)', () => {
			const action = shortcuts(mockElement);

			const handler = (addEventListenerSpy.mock.calls as MockCall[]).find(
				(call) => call[0] === 'keydown'
			)?.[1] as (e: KeyboardEvent) => void;

			const event = new KeyboardEvent('keydown', {
				key: 'T',
				metaKey: true,
				bubbles: true
			});
			Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

			handler(event);

			expect(goto).toHaveBeenCalledWith('/transactions');

			action.destroy();
		});
	});

	describe('OS reserved keys', () => {
		it('should NOT capture Cmd+Q (OS quit)', () => {
			const action = shortcuts(mockElement);

			const handler = (addEventListenerSpy.mock.calls as MockCall[]).find(
				(call) => call[0] === 'keydown'
			)?.[1] as (e: KeyboardEvent) => void;

			const event = new KeyboardEvent('keydown', {
				key: 'q',
				metaKey: true,
				bubbles: true
			});
			Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

			handler(event);

			expect(goto).not.toHaveBeenCalled();
			expect(event.preventDefault).not.toHaveBeenCalled();

			action.destroy();
		});

		it('should NOT capture Cmd+H (OS hide)', () => {
			const action = shortcuts(mockElement);

			const handler = (addEventListenerSpy.mock.calls as MockCall[]).find(
				(call) => call[0] === 'keydown'
			)?.[1] as (e: KeyboardEvent) => void;

			const event = new KeyboardEvent('keydown', {
				key: 'h',
				metaKey: true,
				bubbles: true
			});
			Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

			handler(event);

			expect(goto).not.toHaveBeenCalled();
			expect(event.preventDefault).not.toHaveBeenCalled();

			action.destroy();
		});
	});

	describe('modal blocking', () => {
		it('should block navigation shortcuts when modal is open', async () => {
			// Import and set modal state
			const { openModals } = await import('../../stores/modals');
			openModals.open('test-modal');

			const action = shortcuts(mockElement);

			const handler = (addEventListenerSpy.mock.calls as MockCall[]).find(
				(call) => call[0] === 'keydown'
			)?.[1] as (e: KeyboardEvent) => void;

			const event = new KeyboardEvent('keydown', {
				key: '1',
				metaKey: true,
				bubbles: true
			});
			Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

			handler(event);

			expect(goto).not.toHaveBeenCalled();

			openModals.close('test-modal');
			action.destroy();
		});

		it('should allow navigation shortcuts when modal is closed', async () => {
			const { openModals } = await import('../../stores/modals');
			openModals.closeAll();

			const action = shortcuts(mockElement);

			const handler = (addEventListenerSpy.mock.calls as MockCall[]).find(
				(call) => call[0] === 'keydown'
			)?.[1] as (e: KeyboardEvent) => void;

			const event = new KeyboardEvent('keydown', {
				key: '1',
				metaKey: true,
				bubbles: true
			});
			Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

			handler(event);

			expect(goto).toHaveBeenCalledWith('/');

			action.destroy();
		});
	});

	describe('shift key handling', () => {
		it('should not trigger non-shift shortcut when shift is held', () => {
			const action = shortcuts(mockElement);

			const handler = (addEventListenerSpy.mock.calls as MockCall[]).find(
				(call) => call[0] === 'keydown'
			)?.[1] as (e: KeyboardEvent) => void;

			const event = new KeyboardEvent('keydown', {
				key: '1',
				metaKey: true,
				shiftKey: true,
				bubbles: true
			});
			Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

			handler(event);

			expect(goto).not.toHaveBeenCalled();

			action.destroy();
		});
	});

	describe('custom shortcuts', () => {
		it('should accept custom shortcuts configuration', () => {
			const customShortcuts: ShortcutConfig[] = [{ key: 'x', meta: true, route: '/' }];

			const action = shortcuts(mockElement, customShortcuts);

			const handler = (addEventListenerSpy.mock.calls as MockCall[]).find(
				(call) => call[0] === 'keydown'
			)?.[1] as (e: KeyboardEvent) => void;

			const event = new KeyboardEvent('keydown', {
				key: 'x',
				metaKey: true,
				bubbles: true
			});
			Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

			handler(event);

			expect(goto).toHaveBeenCalledWith('/');

			action.destroy();
		});
	});
});
