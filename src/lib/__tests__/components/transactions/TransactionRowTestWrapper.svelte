<script lang="ts">
	import TransactionRow from '../../../components/transactions/TransactionRow.svelte';
	import type { Transaction } from '$lib/types/transaction';

	export let transaction: Transaction;
	export let categoryName: string | null = null;
	export let accountName: string = 'Unknown';
	export let isExpanded: boolean = false;
</script>

<table>
	<tbody>
		<TransactionRow
			{transaction}
			{categoryName}
			{accountName}
			{isExpanded}
		/>
	</tbody>
</table>
