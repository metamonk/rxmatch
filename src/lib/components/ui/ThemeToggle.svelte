<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();

	let isDark = $state(false);
	let mounted = $state(false);

	// Initialize theme on mount
	onMount(() => {
		// Check localStorage first, then fall back to OS preference
		const stored = localStorage.getItem('theme-mode');
		if (stored) {
			isDark = stored === 'dark';
		} else {
			isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		}

		// Apply the theme
		applyTheme(isDark);
		mounted = true;
	});

	function applyTheme(dark: boolean) {
		const html = document.documentElement;
		if (dark) {
			html.setAttribute('data-mode', 'dark');
		} else {
			html.removeAttribute('data-mode');
		}
	}

	function toggleTheme() {
		isDark = !isDark;
		applyTheme(isDark);
		localStorage.setItem('theme-mode', isDark ? 'dark' : 'light');
	}
</script>

<button
	type="button"
	onclick={toggleTheme}
	class="theme-toggle relative w-12 h-12 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 {className}"
	class:bg-surface-200={!isDark && mounted}
	class:dark:bg-surface-700={isDark && mounted}
	class:bg-surface-300={!mounted}
	aria-label="Toggle theme"
	title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
>
	{#if mounted}
		<div class="absolute inset-0 flex items-center justify-center transition-all duration-300"
			class:opacity-100={!isDark}
			class:opacity-0={isDark}
			class:rotate-0={!isDark}
			class:rotate-180={isDark}
		>
			<!-- Sun icon -->
			<svg class="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
				<path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
			</svg>
		</div>

		<div class="absolute inset-0 flex items-center justify-center transition-all duration-300"
			class:opacity-0={!isDark}
			class:opacity-100={isDark}
			class:rotate-180={!isDark}
			class:rotate-0={isDark}
		>
			<!-- Moon icon -->
			<svg class="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
				<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
			</svg>
		</div>
	{:else}
		<!-- Loading placeholder -->
		<div class="absolute inset-0 flex items-center justify-center">
			<svg class="w-6 h-6 text-[var(--color-surface-500)] animate-pulse" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
				<circle cx="10" cy="10" r="4" />
			</svg>
		</div>
	{/if}
</button>

<style>
	.theme-toggle {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.theme-toggle:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}
</style>
