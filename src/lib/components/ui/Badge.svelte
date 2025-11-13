<script lang="ts">
	interface Props {
		variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
		size?: 'sm' | 'md' | 'lg';
		class?: string;
		children?: any;
	}

	let {
		variant = 'primary',
		size = 'md',
		class: className = '',
		children
	}: Props = $props();

	const baseClasses = 'inline-flex items-center justify-center font-medium rounded-full transition-all duration-250';

	const variantClasses = {
		primary: 'bg-[var(--color-primary-500)] text-[var(--color-primary-contrast-500)]',
		secondary: 'bg-[var(--color-secondary-500)] text-[var(--color-secondary-contrast-500)]',
		success: 'bg-green-600 text-white',
		warning: 'bg-yellow-500 text-black',
		error: 'bg-red-600 text-white',
		info: 'bg-[var(--color-surface-200)] dark:bg-[var(--color-surface-800)] text-[var(--color-surface-950)] dark:text-[var(--color-surface-50)]'
	};

	const sizeClasses = {
		sm: 'text-xs px-2 py-0.5',
		md: 'text-sm px-2.5 py-0.5',
		lg: 'text-base px-3 py-1'
	};

	const badgeClass = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
</script>

<span class={badgeClass}>
	{@render children?.()}
</span>
