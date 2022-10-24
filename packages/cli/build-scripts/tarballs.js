import * as fs from 'node:fs'
import * as path from 'node:path'

const localDepsPaths = [
	path.resolve(process.cwd(), '../cfs-lib'),
	path.resolve(process.cwd(), '../elf-parser'),
	path.resolve(process.cwd(), '../cli'),
]

async function* patchLocalDepsGenerator() {
	for (const p of localDepsPaths) {
		await patchLocalDependenciesPaths(path.join(p, 'package.json'))
		yield p
	}
}

for await (const p of patchLocalDepsGenerator()) {
	const localDepName = path.basename(p)
	const tempDir = path.join(process.cwd(), 'tmp', localDepName)

	if (localDepName !== 'cli') {
		await fs.cp(p, tempDir, {recursive: true}, (err) => {
			if (err) {
				console.error(`An error ocurred while copying files to cfsutil/tmp workspace: ${err}`)
			}
		})
	}
}

/**
 * Reads the package.json file, checks for the presence of local dependencies,
 * and patches the dependency path if found.
 * This is needed because of the way oclif generates the tarballs. A temporary workspace is created
 * nested within the cli package directory. Local dependencies like cfs-util are not resolved correctly
 * as yarn wont find the workspace from this new temporary location. The script updates the path
 * of the cfs-lib dependency to point to the correct location.
 * @param {string} packageJsonPath - The path to the package.json file.
 * @return {Promise<void>} - A promise that resolves when the patching is complete.
 */
async function patchLocalDependenciesPaths(packageJsonPath) {
	return new Promise((resolve, reject) => {
		fs.readFile(packageJsonPath, 'utf8', (err, data) => {
			if (err) {
				console.error(`Failed to read package.json: ${err}`)
				reject(err)
			}

			try {
				const packageJson = JSON.parse(data)
				const {dependencies} = packageJson

				const localDependencies = Object.entries(dependencies).filter(([_, value]) => value.startsWith('workspace:'))

				// If no local dependencies are found, exit early
				if (localDependencies.length === 0) {
					console.log('No local dependencies found to patch, continuing...')
					resolve()
				}

				for (const [key] of localDependencies) {
					const relativePathToTempRoot = '../'

					dependencies[key] = `file:${path.join(relativePathToTempRoot, key)}`

					console.log(`Patched local dependency path for ${key} to new path: ${dependencies[key]}`)
				}

				fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8', (err) => {
					if (err) {
						console.error(`Failed to write package.json: ${err}`)
						reject(err)
					} else {
						console.log('Local dependencies path patched successfully!')
						resolve()
					}
				})
			} catch {
				console.error(`Failed to parse package.json: ${err}`)
			}
		})
	})
}
