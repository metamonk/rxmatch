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

	const variantClasses = {
		primary: 'btn variant-filled-primary',
		secondary: 'btn variant-filled-secondary',
		tertiary: 'btn variant-filled-tertiary',
		ghost: 'btn variant-ghost-surface',
		danger: 'btn variant-filled-error'
	};

	const sizeClasses = {
		sm: 'btn-sm',
		md: 'btn-md',
		lg: 'btn-lg'
	};

	const buttonClass = `${variantClasses[variant]} ${sizeClasses[size]} transition-all duration-250 hover:scale-[1.02] active:scale-[0.98] ${className}`;
</script>

<button
	{type}
	{disabled}
	class={buttonClass}
	onclick={onclick}
>
	{@render children?.()}
</button>
