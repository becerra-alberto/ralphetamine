import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

// Mock the page store
vi.mock('$app/stores', () => ({
	page: writable({
		status: 404,
		error: { message: 'Not found' }
	})
}));

import ErrorPage from '../../../routes/+error.svelte';

describe('Error Page', () => {
	it('renders "Page not found" text', () => {
		const { getByText } = render(ErrorPage);

		expect(getByText('Page not found')).toBeTruthy();
	});

	it('renders with correct data-testid', () => {
		const { getByTestId } = render(ErrorPage);

		expect(getByTestId('error-page')).toBeTruthy();
	});

	it('contains link to Home route', () => {
		const { getByTestId } = render(ErrorPage);

		const homeLink = getByTestId('error-home-link');
		expect(homeLink).toBeTruthy();
		expect(homeLink.getAttribute('href')).toBe('/');
	});

	it('displays error status code', () => {
		const { getByText } = render(ErrorPage);

		expect(getByText(/Error 404/)).toBeTruthy();
	});
});
