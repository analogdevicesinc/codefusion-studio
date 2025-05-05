import * as fs from 'node:fs'
import * as path from 'node:path'



// The oclif tarball script needs all dependencies present in the temporary workspace
// before the tarball is created. This script copies the necessary files to the temporary workspace
// For this to work correctly, assure the cfs-plugins-api was build before running this script
const apiPath = path.resolve(process.cwd(), '../../submodules/cfs-plugins/api')
const finalDest = path.resolve(process.cwd(), 'tmp/cfs-plugins-api')

// Create cfs-plugins-api directory if it doesn't exist
if (!fs.existsSync(finalDest)) {
  fs.mkdirSync(finalDest, { recursive: true })
}

// Copy api folder content to cfs-plugins-api directory
fs.cpSync(apiPath, finalDest, { recursive: true }, (err) => {
  if (err) {
    console.error(`An error occurred while copying API files to cfsutil/tmp/cfs-plugins-api: ${err}`)
  } else {
    console.log('Successfully copied API files to cfs-plugins-api directory')
  }
})



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
 * Asynchronous generator that patches package.json files for local dependencies.
 * Iterates through each path in localDepsPaths, applies dependency path patching,
 * and yields the processed path.
 *
 * @async
 * @generator
 * @yields {string} The path to the directory containing the processed package.json file
 */
async function* patchLocalDepsGenerator() {
	const localDepsPaths = [
	path.resolve(process.cwd(), '../cfs-lib'),
	path.resolve(process.cwd(), '../elf-parser'),
	path.resolve(process.cwd(), '../cli'),
]

	for (const p of localDepsPaths) {
		await patchLocalDependenciesPaths(path.join(p, 'package.json'))
		yield p
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
					return
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
