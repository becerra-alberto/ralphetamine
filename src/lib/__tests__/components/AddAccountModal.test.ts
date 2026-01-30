import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import AddAccountModal from '../../components/net-worth/AddAccountModal.svelte';

describe('AddAccountModal', () => {
	it('should include bank_number and country fields when open', () => {
		render(AddAccountModal, {
			props: { isOpen: true, testId: 'add-modal' }
		});
		expect(screen.getByTestId('add-modal-bank-number-input')).toBeTruthy();
		expect(screen.getByTestId('add-modal-country-select')).toBeTruthy();
	});

	it('should have MXN available in currency dropdown', () => {
		render(AddAccountModal, {
			props: { isOpen: true, testId: 'add-modal' }
		});
		const currencySelect = screen.getByTestId('add-modal-currency-select') as HTMLSelectElement;
		const options = Array.from(currencySelect.options).map((o) => o.value);
		expect(options).toContain('MXN');
	});

	it('should have EUR, USD, CAD in currency dropdown', () => {
		render(AddAccountModal, {
			props: { isOpen: true, testId: 'add-modal' }
		});
		const currencySelect = screen.getByTestId('add-modal-currency-select') as HTMLSelectElement;
		const options = Array.from(currencySelect.options).map((o) => o.value);
		expect(options).toContain('EUR');
		expect(options).toContain('USD');
		expect(options).toContain('CAD');
	});

	it('should have country dropdown with options', () => {
		render(AddAccountModal, {
			props: { isOpen: true, testId: 'add-modal' }
		});
		const countrySelect = screen.getByTestId('add-modal-country-select') as HTMLSelectElement;
		// Should have default empty option + country codes
		expect(countrySelect.options.length).toBeGreaterThan(1);
	});

	it('should not render content when closed', () => {
		render(AddAccountModal, {
			props: { isOpen: false, testId: 'add-modal' }
		});
		expect(screen.queryByTestId('add-modal')).toBeNull();
	});
});
