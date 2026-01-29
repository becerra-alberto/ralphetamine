import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { openModals, isModalOpen } from '../../stores/modals';

describe('modals store', () => {
	beforeEach(() => {
		openModals.closeAll();
	});

	describe('openModals', () => {
		it('should start with no open modals', () => {
			expect(get(openModals).size).toBe(0);
		});

		it('should add a modal when open() is called', () => {
			openModals.open('test-modal');
			expect(get(openModals).has('test-modal')).toBe(true);
		});

		it('should remove a modal when close() is called', () => {
			openModals.open('test-modal');
			openModals.close('test-modal');
			expect(get(openModals).has('test-modal')).toBe(false);
		});

		it('should track multiple open modals', () => {
			openModals.open('modal-a');
			openModals.open('modal-b');
			const modals = get(openModals);
			expect(modals.has('modal-a')).toBe(true);
			expect(modals.has('modal-b')).toBe(true);
			expect(modals.size).toBe(2);
		});

		it('should close all modals with closeAll()', () => {
			openModals.open('modal-a');
			openModals.open('modal-b');
			openModals.closeAll();
			expect(get(openModals).size).toBe(0);
		});

		it('should handle closing a modal that is not open', () => {
			openModals.close('nonexistent');
			expect(get(openModals).size).toBe(0);
		});

		it('should not duplicate a modal opened twice', () => {
			openModals.open('test-modal');
			openModals.open('test-modal');
			expect(get(openModals).size).toBe(1);
		});
	});

	describe('isModalOpen', () => {
		it('should return false when no modals are open', () => {
			expect(get(isModalOpen)).toBe(false);
		});

		it('should return true when a modal is open', () => {
			openModals.open('test-modal');
			expect(get(isModalOpen)).toBe(true);
		});

		it('should return false after all modals are closed', () => {
			openModals.open('test-modal');
			openModals.close('test-modal');
			expect(get(isModalOpen)).toBe(false);
		});

		it('should remain true if one of multiple modals is closed', () => {
			openModals.open('modal-a');
			openModals.open('modal-b');
			openModals.close('modal-a');
			expect(get(isModalOpen)).toBe(true);
		});
	});
});
