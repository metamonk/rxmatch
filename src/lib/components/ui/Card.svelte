<script lang="ts">
	interface Props {
		variant?: 'default' | 'elevated' | 'outlined' | 'glass';
		padding?: 'none' | 'sm' | 'md' | 'lg';
		class?: string;
		hover?: boolean;
		children?: any;
	}

	let {
		variant = 'default',
		padding = 'md',
		class: className = '',
		hover = false,
		children
	}: Props = $props();

	const baseClasses = 'rounded-[var(--radius-container)] animate-fade-in';

	const variantClasses = {
		default: 'bg-white dark:bg-[var(--color-surface-900)] border border-[var(--color-surface-200)] dark:border-[var(--color-surface-800)]',
		elevated: 'bg-white dark:bg-[var(--color-surface-900)] shadow-lg',
		outlined: 'bg-transparent border-2 border-[var(--color-surface-300)] dark:border-[var(--color-surface-700)]',
		glass: 'bg-white/70 dark:bg-[var(--color-surface-900)]/70 backdrop-blur-sm border border-[var(--color-surface-200)] dark:border-[var(--color-surface-800)]'
	};

	const paddingClasses = {
		none: '',
		sm: 'p-4',
		md: 'p-6',
		lg: 'p-8'
	};

	const hoverClass = hover ? 'transition-all duration-250 hover:scale-[1.01] hover:shadow-xl cursor-pointer' : '';

	const cardClass = `${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${hoverClass} ${className}`;
</script>

<div class={cardClass}>
	{@render children?.()}
</div>
