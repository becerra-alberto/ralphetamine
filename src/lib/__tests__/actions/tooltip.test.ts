import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tooltip, tooltipContent } from '../../actions/tooltip';

describe('tooltip action', () => {
	let mockElement: HTMLElement;
	let onShow: ReturnType<typeof vi.fn>;
	let onHide: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.useFakeTimers();
		mockElement = document.createElement('div');
		onShow = vi.fn();
		onHide = vi.fn();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('hover listeners', () => {
		it('should attach mouseenter and mouseleave listeners', () => {
			const addEventListenerSpy = vi.spyOn(mockElement, 'addEventListener');

			tooltip(mockElement, { onShow, onHide });

			expect(addEventListenerSpy).toHaveBeenCalledWith('mouseenter', expect.any(Function));
			expect(addEventListenerSpy).toHaveBeenCalledWith('mouseleave', expect.any(Function));
		});

		it('should remove listeners on destroy', () => {
			const removeEventListenerSpy = vi.spyOn(mockElement, 'removeEventListener');

			const action = tooltip(mockElement, { onShow, onHide });
			action.destroy();

			expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseenter', expect.any(Function));
			expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseleave', expect.any(Function));
		});
	});

	describe('show delay', () => {
		it('should call onShow after showDelay on mouseenter', () => {
			tooltip(mockElement, { onShow, onHide, showDelay: 200 });

			mockElement.dispatchEvent(new MouseEvent('mouseenter'));

			expect(onShow).not.toHaveBeenCalled();

			vi.advanceTimersByTime(200);

			expect(onShow).toHaveBeenCalledWith(mockElement);
		});

		it('should use default 200ms showDelay', () => {
			tooltip(mockElement, { onShow, onHide });

			mockElement.dispatchEvent(new MouseEvent('mouseenter'));

			vi.advanceTimersByTime(199);
			expect(onShow).not.toHaveBeenCalled();

			vi.advanceTimersByTime(1);
			expect(onShow).toHaveBeenCalled();
		});

		it('should not call onShow if mouse leaves before delay', () => {
			tooltip(mockElement, { onShow, onHide, showDelay: 200 });

			mockElement.dispatchEvent(new MouseEvent('mouseenter'));
			vi.advanceTimersByTime(100);
			mockElement.dispatchEvent(new MouseEvent('mouseleave'));
			vi.advanceTimersByTime(200);

			expect(onShow).not.toHaveBeenCalled();
		});
	});

	describe('hide delay', () => {
		it('should call onHide after hideDelay on mouseleave', () => {
			tooltip(mockElement, { onShow, onHide, showDelay: 0, hideDelay: 200 });

			mockElement.dispatchEvent(new MouseEvent('mouseenter'));
			vi.advanceTimersByTime(0);

			mockElement.dispatchEvent(new MouseEvent('mouseleave'));

			expect(onHide).not.toHaveBeenCalled();

			vi.advanceTimersByTime(200);

			expect(onHide).toHaveBeenCalled();
		});

		it('should use default 200ms hideDelay', () => {
			tooltip(mockElement, { onShow, onHide, showDelay: 0 });

			mockElement.dispatchEvent(new MouseEvent('mouseenter'));
			vi.advanceTimersByTime(0);

			mockElement.dispatchEvent(new MouseEvent('mouseleave'));

			vi.advanceTimersByTime(199);
			expect(onHide).not.toHaveBeenCalled();

			vi.advanceTimersByTime(1);
			expect(onHide).toHaveBeenCalled();
		});

		it('should cancel hide if mouse re-enters before delay', () => {
			tooltip(mockElement, { onShow, onHide, showDelay: 0, hideDelay: 200 });

			mockElement.dispatchEvent(new MouseEvent('mouseenter'));
			vi.advanceTimersByTime(0);

			mockElement.dispatchEvent(new MouseEvent('mouseleave'));
			vi.advanceTimersByTime(100);

			mockElement.dispatchEvent(new MouseEvent('mouseenter'));
			vi.advanceTimersByTime(200);

			expect(onHide).not.toHaveBeenCalled();
		});
	});

	describe('update', () => {
		it('should allow updating options', () => {
			const action = tooltip(mockElement, { onShow, onHide, showDelay: 200 });

			const newOnShow = vi.fn();
			action.update({ onShow: newOnShow, onHide, showDelay: 100 });

			mockElement.dispatchEvent(new MouseEvent('mouseenter'));
			vi.advanceTimersByTime(100);

			expect(newOnShow).toHaveBeenCalled();
		});
	});
});

describe('tooltipContent action', () => {
	let mockElement: HTMLElement;
	let onMouseEnter: ReturnType<typeof vi.fn>;
	let onMouseLeave: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockElement = document.createElement('div');
		onMouseEnter = vi.fn();
		onMouseLeave = vi.fn();
	});

	it('should attach mouseenter and mouseleave listeners', () => {
		const addEventListenerSpy = vi.spyOn(mockElement, 'addEventListener');

		tooltipContent(mockElement, { onMouseEnter, onMouseLeave });

		expect(addEventListenerSpy).toHaveBeenCalledWith('mouseenter', expect.any(Function));
		expect(addEventListenerSpy).toHaveBeenCalledWith('mouseleave', expect.any(Function));
	});

	it('should call onMouseEnter on mouseenter', () => {
		tooltipContent(mockElement, { onMouseEnter, onMouseLeave });

		mockElement.dispatchEvent(new MouseEvent('mouseenter'));

		expect(onMouseEnter).toHaveBeenCalled();
	});

	it('should call onMouseLeave on mouseleave', () => {
		tooltipContent(mockElement, { onMouseEnter, onMouseLeave });

		mockElement.dispatchEvent(new MouseEvent('mouseleave'));

		expect(onMouseLeave).toHaveBeenCalled();
	});
});
