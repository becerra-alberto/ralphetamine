import { writable, readable } from 'svelte/store';

export const page = writable({
	url: new URL('http://localhost/'),
	params: {},
	route: { id: '/' },
	status: 200,
	error: null,
	data: {},
	form: undefined
});

export const navigating = readable(null);

export const updated = {
	subscribe: readable(false).subscribe,
	check: async () => false
};
