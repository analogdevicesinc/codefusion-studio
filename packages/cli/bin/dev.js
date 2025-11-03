#!/usr/bin/env -S node --loader ts-node/esm --no-warnings=ExperimentalWarning

import {settings, run, handle, flush} from '@oclif/core'
import util from 'node:util'

// dev mode
settings.debug = true
process.env.NODE_ENV = 'development';

await run(process.argv.slice(2), import.meta.url)
  .catch(async (error) => {
		// Recursively pretty print the error
		console.error(
			util.inspect(error, {
					colors: true,
					depth: 3,
					showHidden: false,
			}),
		);

		// Prevent Oclif's handler from also printing the error
		// `skipOclifErrorHandling` is poorly named, oclif will
		// still handle the error it just doesn't print it
		error.skipOclifErrorHandling = true;
		return handle(error)
	})
  .finally(async () => flush())
