import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Tooltip from '../../../components/shared/Tooltip.svelte';

describe('Tooltip', () => {
	describe('rendering', () => {
		it('should not render when visible is false', () => {
			render(Tooltip, {
				props: {
					visible: false,
					targetElement: null
				}
			});

			expect(screen.queryByTestId('tooltip')).toBeNull();
		});

		it('should render with content when visible is true', () => {
			const mockElement = document.createElement('div');
			mockElement.getBoundingClientRect = () => ({
				top: 100,
				bottom: 150,
				left: 100,
				right: 200,
				width: 100,
				height: 50,
				x: 100,
				y: 100,
				toJSON: () => {}
			});

			render(Tooltip, {
				props: {
					visible: true,
					targetElement: mockElement
				}
			});

			expect(screen.getByTestId('tooltip')).toBeTruthy();
		});

		it('should have role="tooltip" for accessibility', () => {
			const mockElement = document.createElement('div');
			mockElement.getBoundingClientRect = () => ({
				top: 100,
				bottom: 150,
				left: 100,
				right: 200,
				width: 100,
				height: 50,
				x: 100,
				y: 100,
				toJSON: () => {}
			});

			render(Tooltip, {
				props: {
					visible: true,
					targetElement: mockElement
				}
			});

			expect(screen.getByRole('tooltip')).toBeTruthy();
		});
	});

	describe('positioning', () => {
		it('should position above cell by default', () => {
			const mockElement = document.createElement('div');
			mockElement.getBoundingClientRect = () => ({
				top: 300,
				bottom: 350,
				left: 100,
				right: 200,
				width: 100,
				height: 50,
				x: 100,
				y: 300,
				toJSON: () => {}
			});

			render(Tooltip, {
				props: {
					visible: true,
					targetElement: mockElement,
					position: 'top'
				}
			});

			const tooltip = screen.getByTestId('tooltip');
			expect(tooltip.classList.contains('top')).toBe(true);
		});

		it('should position below when specified', () => {
			const mockElement = document.createElement('div');
			mockElement.getBoundingClientRect = () => ({
				top: 100,
				bottom: 150,
				left: 100,
				right: 200,
				width: 100,
				height: 50,
				x: 100,
				y: 100,
				toJSON: () => {}
			});

			render(Tooltip, {
				props: {
					visible: true,
					targetElement: mockElement,
					position: 'bottom'
				}
			});

			const tooltip = screen.getByTestId('tooltip');
			expect(tooltip.classList.contains('bottom')).toBe(true);
		});
	});

	describe('viewport edge cases', () => {
		it('should handle when targetElement is null', () => {
			render(Tooltip, {
				props: {
					visible: true,
					targetElement: null
				}
			});

			// Should still render but positioning won't be calculated
			expect(screen.getByTestId('tooltip')).toBeTruthy();
		});
	});
});
