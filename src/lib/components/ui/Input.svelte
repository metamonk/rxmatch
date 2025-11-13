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

	const baseInputClass = 'w-full px-4 py-2 rounded-lg border transition-all duration-250 focus:outline-none focus:ring-2';
	const normalClass = 'border-[var(--color-surface-300)] dark:border-[var(--color-surface-700)] bg-white dark:bg-[var(--color-surface-900)] text-[var(--color-surface-950)] dark:text-[var(--color-surface-50)] focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]';
	const errorClass = 'border-red-500 focus:ring-red-500 focus:border-red-500';
	const disabledClass = 'opacity-50 cursor-not-allowed';

	const inputClass = `${baseInputClass} ${error ? errorClass : normalClass} ${disabled ? disabledClass : ''} ${className}`;
</script>

{#if label}
	<label class="block">
		<span class="text-sm font-medium mb-2 block text-[var(--color-surface-950)] dark:text-[var(--color-surface-50)]">{label}</span>
		<input
			{type}
			bind:value
			{placeholder}
			{disabled}
			class={inputClass}
			{oninput}
			{onblur}
		/>
		{#if error}
			<span class="text-red-600 text-sm mt-1 block animate-slide-in">{error}</span>
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
	/>
	{#if error}
		<span class="text-red-600 text-sm mt-1 block animate-slide-in">{error}</span>
	{/if}
{/if}
