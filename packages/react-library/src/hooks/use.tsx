/**
 * @description Polyfill for the `use` function that allows for the use of thenables in React v19.
 * To be replaced with the native `use` function when React v19 is implemented.
 * Copied from swr
 * @param thenable A promise to be resolved
 * @returns The resolved value of the promise
 */
export const use =
	// This extra generic is to avoid TypeScript mixing up the generic and JSX sytax
	// and emitting an error.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	<T, _>(
		thenable: Promise<T> & {
			status?: 'pending' | 'fulfilled' | 'rejected';
			value?: T;
			reason?: unknown;
		}
	): T => {
		switch (thenable.status) {
			case 'pending':
				throw thenable;
			case 'fulfilled':
				return thenable.value as T;
			case 'rejected':
				throw thenable.reason;
			default:
				thenable.status = 'pending';
				thenable.then(
					v => {
						thenable.status = 'fulfilled';
						thenable.value = v;
					},
					e => {
						thenable.status = 'rejected';
						thenable.reason = e;
					}
				);
				throw thenable;
		}
	};
