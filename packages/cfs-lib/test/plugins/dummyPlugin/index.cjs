/* eslint-disable */
path = require("path");
const { mkdir } = require("fs/promises");
class EtaCodeGenerator {
	generateCode() {
		return [];
	}
}

class EtaProjectGenerator {
	generateProject() {
		return [];
	}
}

class EtaWorkspaceGenerator {
	async generateWorkspace(cfsWorkspace) {
		const workspacePath = path.join(
			cfsWorkspace.location,
			cfsWorkspace.workspaceName ?? ""
		);

		// Create the workspace directory
		await mkdir(workspacePath, { recursive: true });

		// Create the .cfs directory within the workspace directory
		const cfsDir = path.join(workspacePath, ".cfs");
		await mkdir(cfsDir, { recursive: true });
	}
}

class CfsPlugin {
	getEnvironmentVariables(scope) {
		return [];
	}

	getGenerator(generator) {
		throw new Error();
	}

	getService(service) {
		return service;
	}
}

class DummyPlugin {
	getEnvironmentVariables(scope) {
		console.log("DummyPlugin: getEnvironmentVariables");
		return [];
	}

	getGenerator(generator) {
		switch (generator) {
			case "workspace":
				return new EtaWorkspaceGenerator();
			case "code":
				return new EtaCodeGenerator();
			case "project":
				return new EtaProjectGenerator();
			default:
				throw new Error();
		}
	}

	getService(service) {
		return service;
	}
}

module.exports = DummyPlugin;
