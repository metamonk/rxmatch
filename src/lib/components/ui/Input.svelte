<script lang="ts">
	interface Props {
		type?: string;
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		error?: string;
		label?: string;
		class?: string;
		oninput?: (event: Event) => void;
		onblur?: (event: FocusEvent) => void;
	}

	let {
		type = 'text',
		value = $bindable(''),
		placeholder = '',
		disabled = false,
		error = '',
		label = '',
		class: className = '',
		oninput,
		onblur
	}: Props = $props();

	const inputClass = `input transition-all duration-250 ${error ? 'input-error' : ''} ${className}`;
</script>

{#if label}
	<label class="label">
		<span class="text-sm font-medium">{label}</span>
		<input
			{type}
			bind:value
			{placeholder}
			{disabled}
			class={inputClass}
			{oninput}
			{onblur}
			{...$$restProps}
		/>
		{#if error}
			<span class="text-error-500 text-sm mt-1 animate-slide-in">{error}</span>
		{/if}
	</label>
{:else}
	<input
		{type}
		bind:value
		{placeholder}
		{disabled}
		class={inputClass}
		{oninput}
		{onblur}
		{...$$restProps}
	/>
	{#if error}
		<span class="text-error-500 text-sm mt-1 animate-slide-in">{error}</span>
	{/if}
{/if}
