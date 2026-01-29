import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shortcuts, globalShortcuts, type ShortcutConfig, type GlobalShortcutCallbacks } from '../../actions/shortcuts';
import { goto } from '$app/navigation';
import { openModals } from '../../stores/modals';

// Type for event listener spy mock calls
type MockCall = [string, EventListener];

function getHandler(spy: ReturnType<typeof vi.spyOn>): (e: KeyboardEvent) => void {
	const call = (spy.mock.calls as MockCall[]).find((c) => c[0] === 'keydown');
	return call?.[1] as (e: KeyboardEvent) => void;
}

function createKeyEvent(
	key: string,
	opts: { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean } = {}
): KeyboardEvent {
	const event = new KeyboardEvent('keydown', {
		key,
		metaKey: opts.metaKey ?? false,
		ctrlKey: opts.ctrlKey ?? false,
		shiftKey: opts.shiftKey ?? false,
		bubbles: true
	});
	Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
	return event;
}

describe('Shortcuts Action', () => {
	let mockElement: HTMLElement;
	let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
	let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockElement = document.createElement('div');
		addEventListenerSpy = vi.spyOn(window, 'addEventListener');
		removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
		openModals.closeAll();
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

	describe('navigation shortcuts', () => {
		it('should navigate to Home on Cmd+1', () => {
			const action = shortcuts(mockElement);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('1', { metaKey: true });
			handler(event);
			expect(goto).toHaveBeenCalledWith('/');
			expect(event.preventDefault).toHaveBeenCalled();
			action.destroy();
		});

		it('should navigate to Budget on Cmd+2', () => {
			const action = shortcuts(mockElement);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('2', { metaKey: true });
			handler(event);
			expect(goto).toHaveBeenCalledWith('/budget');
			action.destroy();
		});

		it('should navigate to Transactions on Cmd+3', () => {
			const action = shortcuts(mockElement);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('3', { metaKey: true });
			handler(event);
			expect(goto).toHaveBeenCalledWith('/transactions');
			action.destroy();
		});

		it('should navigate to Net Worth on Cmd+4', () => {
			const action = shortcuts(mockElement);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('4', { metaKey: true });
			handler(event);
			expect(goto).toHaveBeenCalledWith('/net-worth');
			action.destroy();
		});

		it('should navigate to Budget on Cmd+U', () => {
			const action = shortcuts(mockElement);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('u', { metaKey: true });
			handler(event);
			expect(goto).toHaveBeenCalledWith('/budget');
			action.destroy();
		});

		it('should navigate to Transactions on Cmd+T', () => {
			const action = shortcuts(mockElement);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('t', { metaKey: true });
			handler(event);
			expect(goto).toHaveBeenCalledWith('/transactions');
			action.destroy();
		});

		it('should navigate to Net Worth on Cmd+W (not browser close)', () => {
			const action = shortcuts(mockElement);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('w', { metaKey: true });
			handler(event);
			expect(goto).toHaveBeenCalledWith('/net-worth');
			expect(event.preventDefault).toHaveBeenCalled();
			action.destroy();
		});

		it('should not trigger on non-meta key press', () => {
			const action = shortcuts(mockElement);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('1', { metaKey: false });
			handler(event);
			expect(goto).not.toHaveBeenCalled();
			action.destroy();
		});

		it('should not trigger on non-shortcut keys', () => {
			const action = shortcuts(mockElement);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('5', { metaKey: true });
			handler(event);
			expect(goto).not.toHaveBeenCalled();
			action.destroy();
		});
	});

	describe('modal blocking', () => {
		it('should block navigation shortcuts when modal is open', () => {
			openModals.open('test-modal');
			const action = shortcuts(mockElement);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('1', { metaKey: true });
			handler(event);
			expect(goto).not.toHaveBeenCalled();
			openModals.close('test-modal');
			action.destroy();
		});

		it('should allow navigation shortcuts when modal is closed', () => {
			openModals.closeAll();
			const action = shortcuts(mockElement);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('1', { metaKey: true });
			handler(event);
			expect(goto).toHaveBeenCalledWith('/');
			action.destroy();
		});
	});

	describe('OS reserved shortcuts', () => {
		it('should NOT capture Cmd+Q (left to OS)', () => {
			const action = shortcuts(mockElement);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('q', { metaKey: true });
			handler(event);
			expect(goto).not.toHaveBeenCalled();
			expect(event.preventDefault).not.toHaveBeenCalled();
			action.destroy();
		});

		it('should NOT capture Cmd+H (left to OS)', () => {
			const action = shortcuts(mockElement);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('h', { metaKey: true });
			handler(event);
			expect(goto).not.toHaveBeenCalled();
			expect(event.preventDefault).not.toHaveBeenCalled();
			action.destroy();
		});
	});

	describe('custom shortcuts', () => {
		it('should accept custom shortcuts configuration', () => {
			const customShortcuts: ShortcutConfig[] = [{ key: 'x', meta: true, route: '/' }];
			const action = shortcuts(mockElement, customShortcuts);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('x', { metaKey: true });
			handler(event);
			expect(goto).toHaveBeenCalledWith('/');
			action.destroy();
		});
	});
});

describe('Global Shortcuts Action', () => {
	let mockElement: HTMLElement;
	let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
	let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;
	let callbacks: GlobalShortcutCallbacks;

	beforeEach(() => {
		vi.clearAllMocks();
		mockElement = document.createElement('div');
		addEventListenerSpy = vi.spyOn(window, 'addEventListener');
		removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
		openModals.closeAll();
		callbacks = {
			onTogglePalette: vi.fn(),
			onToggleShortcutsHelp: vi.fn(),
			onNewTransaction: vi.fn(),
			onSearch: vi.fn(),
			onSave: vi.fn(),
			onAdjustBudgets: vi.fn()
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Cmd+K - command palette', () => {
		it('should trigger command palette open on Cmd+K', () => {
			const action = globalShortcuts(mockElement, callbacks);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('k', { metaKey: true });
			handler(event);
			expect(callbacks.onTogglePalette).toHaveBeenCalled();
			expect(event.preventDefault).toHaveBeenCalled();
			action.destroy();
		});

		it('should work even when modal is open (Cmd+K always works)', () => {
			openModals.open('some-modal');
			const action = globalShortcuts(mockElement, callbacks);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('k', { metaKey: true });
			handler(event);
			expect(callbacks.onTogglePalette).toHaveBeenCalled();
			action.destroy();
		});
	});

	describe('Cmd+N - new transaction', () => {
		it('should trigger new transaction focus on Cmd+N', () => {
			const action = globalShortcuts(mockElement, callbacks);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('n', { metaKey: true });
			handler(event);
			expect(callbacks.onNewTransaction).toHaveBeenCalled();
			expect(event.preventDefault).toHaveBeenCalled();
			action.destroy();
		});

		it('should NOT trigger new transaction when modal is open', () => {
			openModals.open('test-modal');
			const action = globalShortcuts(mockElement, callbacks);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('n', { metaKey: true });
			handler(event);
			expect(callbacks.onNewTransaction).not.toHaveBeenCalled();
			action.destroy();
		});
	});

	describe('Cmd+F - search', () => {
		it('should trigger search on Cmd+F', () => {
			const action = globalShortcuts(mockElement, callbacks);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('f', { metaKey: true });
			handler(event);
			expect(callbacks.onSearch).toHaveBeenCalled();
			expect(event.preventDefault).toHaveBeenCalled();
			action.destroy();
		});
	});

	describe('Cmd+S - save', () => {
		it('should trigger save on Cmd+S', () => {
			const action = globalShortcuts(mockElement, callbacks);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('s', { metaKey: true });
			handler(event);
			expect(callbacks.onSave).toHaveBeenCalled();
			expect(event.preventDefault).toHaveBeenCalled();
			action.destroy();
		});
	});

	describe('Cmd+Shift+B - budget adjustment', () => {
		it('should trigger budget adjustment on Cmd+Shift+B', () => {
			const action = globalShortcuts(mockElement, callbacks);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('b', { metaKey: true, shiftKey: true });
			handler(event);
			expect(callbacks.onAdjustBudgets).toHaveBeenCalled();
			expect(event.preventDefault).toHaveBeenCalled();
			action.destroy();
		});
	});

	describe('Cmd+? or Cmd+/ - shortcuts help', () => {
		it('should open shortcuts help on Cmd+/', () => {
			const action = globalShortcuts(mockElement, callbacks);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('/', { metaKey: true });
			handler(event);
			expect(callbacks.onToggleShortcutsHelp).toHaveBeenCalled();
			expect(event.preventDefault).toHaveBeenCalled();
			action.destroy();
		});

		it('should open shortcuts help on Cmd+?', () => {
			const action = globalShortcuts(mockElement, callbacks);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('?', { metaKey: true });
			handler(event);
			expect(callbacks.onToggleShortcutsHelp).toHaveBeenCalled();
			expect(event.preventDefault).toHaveBeenCalled();
			action.destroy();
		});

		it('should work even when modal is open', () => {
			openModals.open('test-modal');
			const action = globalShortcuts(mockElement, callbacks);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('/', { metaKey: true });
			handler(event);
			expect(callbacks.onToggleShortcutsHelp).toHaveBeenCalled();
			action.destroy();
		});
	});

	describe('modal focus trapping', () => {
		it('should block Cmd+N when modal is open', () => {
			openModals.open('test-modal');
			const action = globalShortcuts(mockElement, callbacks);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('n', { metaKey: true });
			handler(event);
			expect(callbacks.onNewTransaction).not.toHaveBeenCalled();
			action.destroy();
		});

		it('should block Cmd+F when modal is open', () => {
			openModals.open('test-modal');
			const action = globalShortcuts(mockElement, callbacks);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('f', { metaKey: true });
			handler(event);
			expect(callbacks.onSearch).not.toHaveBeenCalled();
			action.destroy();
		});

		it('should block Cmd+S when modal is open', () => {
			openModals.open('test-modal');
			const action = globalShortcuts(mockElement, callbacks);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('s', { metaKey: true });
			handler(event);
			expect(callbacks.onSave).not.toHaveBeenCalled();
			action.destroy();
		});

		it('should block Cmd+Shift+B when modal is open', () => {
			openModals.open('test-modal');
			const action = globalShortcuts(mockElement, callbacks);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('b', { metaKey: true, shiftKey: true });
			handler(event);
			expect(callbacks.onAdjustBudgets).not.toHaveBeenCalled();
			action.destroy();
		});

		it('should allow Cmd+K even when modal is open', () => {
			openModals.open('test-modal');
			const action = globalShortcuts(mockElement, callbacks);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('k', { metaKey: true });
			handler(event);
			expect(callbacks.onTogglePalette).toHaveBeenCalled();
			action.destroy();
		});

		it('should allow Cmd+/ even when modal is open', () => {
			openModals.open('test-modal');
			const action = globalShortcuts(mockElement, callbacks);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('/', { metaKey: true });
			handler(event);
			expect(callbacks.onToggleShortcutsHelp).toHaveBeenCalled();
			action.destroy();
		});
	});

	describe('OS reserved shortcuts', () => {
		it('should NOT capture Cmd+Q', () => {
			const action = globalShortcuts(mockElement, callbacks);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('q', { metaKey: true });
			handler(event);
			expect(event.preventDefault).not.toHaveBeenCalled();
			action.destroy();
		});

		it('should NOT capture Cmd+H', () => {
			const action = globalShortcuts(mockElement, callbacks);
			const handler = getHandler(addEventListenerSpy);
			const event = createKeyEvent('h', { metaKey: true });
			handler(event);
			expect(event.preventDefault).not.toHaveBeenCalled();
			action.destroy();
		});
	});

	describe('cleanup', () => {
		it('should remove event listener on destroy', () => {
			const action = globalShortcuts(mockElement, callbacks);
			action.destroy();
			expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
		});
	});
});
