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
	viewBox="0 0 64 64"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	class="rx-match-logo {className}"
	aria-label="RxMatch Logo"
	role="img"
>
	{#if variant === 'monochrome'}
		<!-- Monochrome version - single color -->
		<defs>
			<linearGradient id="mono-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" style="stop-color:currentColor;stop-opacity:1" />
				<stop offset="100%" style="stop-color:currentColor;stop-opacity:0.7" />
			</linearGradient>
		</defs>
		<!-- Rounded square background -->
		<rect x="4" y="4" width="56" height="56" rx="12" fill="url(#mono-gradient)" opacity="0.1"/>
		<!-- Rx Symbol -->
		<path d="M16 20 L16 44 M16 20 L28 20 C31 20 33 22 33 25 C33 28 31 30 28 30 L16 30 M28 30 L34 44"
			stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
		<!-- Checkmark -->
		<path d="M42 26 L46 32 L54 22"
			stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
	{:else if variant === 'gradient'}
		<!-- Gradient version - colorful -->
		<defs>
			<linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" style="stop-color:var(--color-primary-500);stop-opacity:0.2" />
				<stop offset="100%" style="stop-color:var(--color-secondary-500);stop-opacity:0.2" />
			</linearGradient>
			<linearGradient id="rx-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" style="stop-color:var(--color-primary-600);stop-opacity:1" />
				<stop offset="100%" style="stop-color:var(--color-primary-400);stop-opacity:1" />
			</linearGradient>
			<linearGradient id="check-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" style="stop-color:var(--color-secondary-500);stop-opacity:1" />
				<stop offset="100%" style="stop-color:var(--color-secondary-300);stop-opacity:1" />
			</linearGradient>
		</defs>
		<!-- Rounded square background -->
		<rect x="4" y="4" width="56" height="56" rx="12" fill="url(#bg-gradient)"/>
		<!-- Rx Symbol with gradient -->
		<path d="M16 20 L16 44 M16 20 L28 20 C31 20 33 22 33 25 C33 28 31 30 28 30 L16 30 M28 30 L34 44"
			stroke="url(#rx-gradient)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
		<!-- Checkmark with gradient -->
		<path d="M42 26 L46 32 L54 22"
			stroke="url(#check-gradient)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
	{:else}
		<!-- Default version - uses theme colors -->
		<defs>
			<linearGradient id="default-bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" style="stop-color:var(--color-primary-500);stop-opacity:0.15" />
				<stop offset="100%" style="stop-color:var(--color-secondary-500);stop-opacity:0.15" />
			</linearGradient>
		</defs>
		<!-- Rounded square background -->
		<rect x="4" y="4" width="56" height="56" rx="12" fill="url(#default-bg-gradient)"/>
		<!-- Rx Symbol -->
		<path d="M16 20 L16 44 M16 20 L28 20 C31 20 33 22 33 25 C33 28 31 30 28 30 L16 30 M28 30 L34 44"
			stroke="var(--color-primary-600)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
		<!-- Checkmark -->
		<path d="M42 26 L46 32 L54 22"
			stroke="var(--color-secondary-500)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
	{/if}
</svg>

<style>
	.rx-match-logo {
		display: inline-block;
		vertical-align: middle;
	}
</style>
