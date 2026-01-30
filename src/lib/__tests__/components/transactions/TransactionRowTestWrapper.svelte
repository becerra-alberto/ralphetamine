<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import TransactionRow from '../../../components/transactions/TransactionRow.svelte';
	import type { Transaction } from '$lib/types/transaction';
	import type { Account } from '$lib/types/account';
	import type { CategoryNode } from '$lib/types/ui';

	export let transaction: Transaction;
	export let categoryName: string | null = null;
	export let accountName: string = 'Unknown';
	export let isExpanded: boolean = false;
	export let accounts: Account[] = [];
	export let categories: CategoryNode[] = [];

	const dispatch = createEventDispatcher();

	function forwardExpand(event: CustomEvent) {
		dispatch('expand', event.detail);
	}

	function forwardClick(event: CustomEvent) {
		dispatch('click', event.detail);
	}

	function forwardSave(event: CustomEvent) {
		dispatch('save', event.detail);
	}

	function forwardDelete(event: CustomEvent) {
		dispatch('delete', event.detail);
	}
</script>

<table>
	<tbody>
		<TransactionRow
			{transaction}
			{categoryName}
			{accountName}
			{isExpanded}
			{accounts}
			{categories}
			on:expand={forwardExpand}
			on:click={forwardClick}
			on:save={forwardSave}
			on:delete={forwardDelete}
		/>
	</tbody>
</table>
