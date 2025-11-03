#!/usr/bin/env node

async function main() {
  const {run, handle, flush, Errors} = await import('@oclif/core')
  await run(process.argv.slice(2), import.meta.url)
	.catch(async (error) => {
		let wrappedError = error;
		if (!(error instanceof Errors.CLIError)) {
			if (typeof error.message === 'string') {
				error.message = error.message.replace(/^error[:-\s]*/i, '')
			}
			wrappedError = new Errors.CLIError(error);
			wrappedError.stack = error.stack;
			wrappedError.cause = error;
		}
		return handle(wrappedError)
	})
	.finally(async () => flush())
}

await main()
