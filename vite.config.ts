import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	base: '/kinescope-svelte/',
	optimizeDeps: {
		include: ['@mediapipe/pose', '@mediapipe/camera_utils', '@mediapipe/drawing_utils']
	},
	ssr: {
		noExternal: ['@mediapipe/pose', '@mediapipe/camera_utils', '@mediapipe/drawing_utils'],
		external: ['chartjs-plugin-zoom']
	}
});
