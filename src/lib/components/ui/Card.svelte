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

	const variantClasses = {
		default: 'card',
		elevated: 'card variant-filled-surface',
		outlined: 'card variant-outline-surface',
		glass: 'card variant-glass-surface'
	};

	const paddingClasses = {
		none: '',
		sm: 'p-4',
		md: 'p-6',
		lg: 'p-8'
	};

	const hoverClass = hover ? 'transition-all duration-250 hover:scale-[1.01] hover:shadow-lg cursor-pointer' : '';

	const cardClass = `${variantClasses[variant]} ${paddingClasses[padding]} ${hoverClass} animate-fade-in ${className}`;
</script>

<div class={cardClass}>
	{@render children?.()}
</div>
