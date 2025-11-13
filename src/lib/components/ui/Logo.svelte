<script lang="ts">
	interface Props {
		size?: 'sm' | 'md' | 'lg' | 'xl';
		variant?: 'default' | 'monochrome' | 'gradient';
		class?: string;
	}

	let {
		size = 'md',
		variant = 'default',
		class: className = ''
	}: Props = $props();

	const sizeMap = {
		sm: 24,
		md: 32,
		lg: 48,
		xl: 64
	};

	const width = $derived(sizeMap[size]);
	const height = $derived(sizeMap[size]);
</script>

<svg
	{width}
	{height}
	viewBox="0 0 96 96"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	class="rx-match-logo {className}"
	aria-label="RxMatch Logo"
	role="img"
>
	{#if variant === 'monochrome'}
		<!-- Monochrome version - single color -->
		<rect width="40" height="40" rx="8" fill="currentColor" opacity="0.9"/>
		<rect x="56" width="40" height="40" rx="8" fill="currentColor" opacity="0.7"/>
		<rect y="56" width="40" height="40" rx="8" fill="currentColor" opacity="0.6"/>
		<rect x="56" y="56" width="40" height="40" rx="8" fill="currentColor" opacity="0.8"/>
	{:else if variant === 'gradient'}
		<!-- Gradient version - colorful -->
		<defs>
			<linearGradient id="square1-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" style="stop-color:var(--color-primary-400);stop-opacity:1" />
				<stop offset="100%" style="stop-color:var(--color-primary-600);stop-opacity:1" />
			</linearGradient>
			<linearGradient id="square2-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" style="stop-color:var(--color-primary-500);stop-opacity:1" />
				<stop offset="100%" style="stop-color:var(--color-secondary-500);stop-opacity:1" />
			</linearGradient>
			<linearGradient id="square3-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" style="stop-color:var(--color-secondary-400);stop-opacity:1" />
				<stop offset="100%" style="stop-color:var(--color-secondary-600);stop-opacity:1" />
			</linearGradient>
			<linearGradient id="square4-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" style="stop-color:var(--color-primary-600);stop-opacity:1" />
				<stop offset="100%" style="stop-color:var(--color-primary-400);stop-opacity:1" />
			</linearGradient>
		</defs>
		<rect width="40" height="40" rx="8" fill="url(#square1-gradient)"/>
		<rect x="56" width="40" height="40" rx="8" fill="url(#square2-gradient)"/>
		<rect y="56" width="40" height="40" rx="8" fill="url(#square3-gradient)"/>
		<rect x="56" y="56" width="40" height="40" rx="8" fill="url(#square4-gradient)"/>
	{:else}
		<!-- Default version - uses theme primary color -->
		<rect width="40" height="40" rx="8" fill="var(--color-primary-500)" opacity="0.9"/>
		<rect x="56" width="40" height="40" rx="8" fill="var(--color-primary-500)" opacity="0.7"/>
		<rect y="56" width="40" height="40" rx="8" fill="var(--color-primary-500)" opacity="0.6"/>
		<rect x="56" y="56" width="40" height="40" rx="8" fill="var(--color-primary-500)" opacity="0.8"/>
	{/if}
</svg>

<style>
	.rx-match-logo {
		display: inline-block;
		vertical-align: middle;
	}
</style>
