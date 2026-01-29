import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import NetWorthPage from '../../../routes/net-worth/+page.svelte';

describe('Net Worth Page', () => {
	it('renders "Net Worth View" text', () => {
		const { getByText } = render(NetWorthPage);

		expect(getByText('Net Worth View')).toBeTruthy();
	});

	it('renders with correct data-testid', () => {
		const { getByTestId } = render(NetWorthPage);

		expect(getByTestId('net-worth-page')).toBeTruthy();
	});

	it('contains placeholder text about Epic 5', () => {
		const { getByText } = render(NetWorthPage);

		expect(getByText(/Epic 5/)).toBeTruthy();
	});
});
