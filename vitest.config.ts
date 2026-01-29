import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
	plugins: [
		svelte({
			hot: !process.env.VITEST,
			compilerOptions: {
				hmr: !process.env.VITEST,
			},
		}),
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./vitest.setup.ts'],
		alias: {
			$lib: path.resolve('./src/lib'),
			'$app/navigation': path.resolve('./src/lib/__mocks__/$app/navigation.ts'),
			'$app/environment': path.resolve('./src/lib/__mocks__/$app/environment.ts'),
			'$app/stores': path.resolve('./src/lib/__mocks__/$app/stores.ts'),
		},
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'lcov'],
			reportsDirectory: './coverage',
			exclude: [
				'node_modules/',
				'src/lib/__tests__/',
				'src/lib/__mocks__/',
				'e2e/',
				'**/*.d.ts',
				'**/*.config.*',
			],
		},
	},
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib'),
		},
		conditions: ['browser'],
	},
});
