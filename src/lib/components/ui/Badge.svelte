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

	const variantClasses = {
		primary: 'badge variant-filled-primary',
		secondary: 'badge variant-filled-secondary',
		success: 'badge variant-filled-success',
		warning: 'badge variant-filled-warning',
		error: 'badge variant-filled-error',
		info: 'badge variant-soft-surface'
	};

	const sizeClasses = {
		sm: 'text-xs px-2 py-0.5',
		md: 'text-sm px-2.5 py-0.5',
		lg: 'text-base px-3 py-1'
	};

	const badgeClass = `${variantClasses[variant]} ${sizeClasses[size]} transition-all duration-250 ${className}`;
</script>

<span class={badgeClass} {...$$restProps}>
	{@render children?.()}
</span>
