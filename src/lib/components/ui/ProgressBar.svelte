<script lang="ts">
	interface Props {
		value: number; // 0-100
		max?: number;
		size?: 'sm' | 'md' | 'lg';
		variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
		showLabel?: boolean;
		class?: string;
	}

	let {
		value,
		max = 100,
		size = 'md',
		variant = 'primary',
		showLabel = false,
		class: className = ''
	}: Props = $props();

	const percentage = $derived(Math.min(Math.max((value / max) * 100, 0), 100));

	const sizeClasses = {
		sm: 'h-1',
		md: 'h-2',
		lg: 'h-3'
	};

	const variantClasses = {
		primary: 'bg-[var(--color-primary-500)]',
		secondary: 'bg-[var(--color-secondary-500)]',
		success: 'bg-green-600',
		warning: 'bg-yellow-500',
		danger: 'bg-red-600'
	};

	// Dynamic color based on percentage for confidence scores
	function getConfidenceVariant(percent: number): 'success' | 'warning' | 'danger' {
		if (percent >= 80) return 'success';
		if (percent >= 60) return 'warning';
		return 'danger';
	}

	const confidenceVariant = $derived(variant === 'primary' ? getConfidenceVariant(percentage) : variant);
	const barColor = $derived(variantClasses[confidenceVariant]);
</script>

<div class="w-full {className}">
	<div class="relative w-full bg-[var(--color-surface-200)] dark:bg-[var(--color-surface-800)] rounded-full overflow-hidden {sizeClasses[size]}">
		<div
			class="{barColor} {sizeClasses[size]} rounded-full transition-all duration-500 ease-out"
			style="width: {percentage}%"
			role="progressbar"
			aria-valuenow={value}
			aria-valuemin="0"
			aria-valuemax={max}
		></div>
	</div>
	{#if showLabel}
		<div class="text-xs text-[var(--color-surface-600)] dark:text-[var(--color-surface-400)] mt-1 text-right font-medium">
			{percentage.toFixed(1)}%
		</div>
	{/if}
</div>
