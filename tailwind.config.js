import { skeleton } from '@skeletonlabs/skeleton/plugin';
import * as themes from '@skeletonlabs/skeleton/themes';

/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		'./node_modules/@skeletonlabs/skeleton/dist/**/*.{html,js,svelte,ts}'
	],
	theme: {
		extend: {
			// Custom animation durations for micro-interactions
			transitionDuration: {
				'250': '250ms',
			},
			// Custom animation timing functions
			transitionTimingFunction: {
				'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
			}
		}
	},
	plugins: [
		skeleton({
			themes: [themes.terminus]
		})
	]
};
