<script lang="ts">
	interface Props {
		variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		type?: 'button' | 'submit' | 'reset';
		class?: string;
		onclick?: (event: MouseEvent) => void;
		children?: any;
	}

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		type = 'button',
		class: className = '',
		onclick,
		children
	}: Props = $props();

	const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-250 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed';

	const variantClasses = {
		primary: 'bg-[var(--color-primary-500)] text-[var(--color-primary-contrast-500)] hover:bg-[var(--color-primary-600)] shadow-md hover:shadow-lg',
		secondary: 'bg-[var(--color-secondary-500)] text-[var(--color-secondary-contrast-500)] hover:bg-[var(--color-secondary-600)] shadow-md hover:shadow-lg',
		tertiary: 'bg-[var(--color-tertiary-500)] text-[var(--color-tertiary-contrast-500)] hover:bg-[var(--color-tertiary-600)] shadow-md hover:shadow-lg',
		ghost: 'bg-transparent text-[var(--color-surface-950)] dark:text-[var(--color-surface-50)] hover:bg-[var(--color-surface-200)] dark:hover:bg-[var(--color-surface-800)]',
		danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg'
	};

	const sizeClasses = {
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-4 py-2 text-base',
		lg: 'px-6 py-3 text-lg'
	};

	const buttonClass = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
</script>

<button
	{type}
	{disabled}
	class={buttonClass}
	onclick={onclick}
>
	{@render children?.()}
</button>
