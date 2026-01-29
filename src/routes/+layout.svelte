<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Stackz</title>
</svelte:head>

{@render children()}
