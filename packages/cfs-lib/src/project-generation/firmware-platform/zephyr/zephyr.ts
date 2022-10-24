/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import * as fs from "node:fs";
import * as path from "node:path";

import {
	AdditionalSettingType,
	ProjectGenerator,
	ProjectGeneratorTypes
} from "../../project-generator.js";
import { execSync } from "node:child_process";
import settingsData from "./templates/.vscode/settings.js";
import launchData from "./templates/.vscode/launch.js";
import cCppPropData from "./templates/.vscode/c_cpp_properties.js";
import { Soc } from "../../../types/soc.js";

export class ZephyrProjectGenerator extends ProjectGenerator {
	// The workspace file for the project to be created
	private workspaceFile:
		| {
				folders: [
					{
						path: string;
					}
				];
				settings: Record<string, unknown>;
		  }
		| undefined;

	/**
	 * Creates a project based on the template passed at the destination with the passed project name.
	 * @param templateInfo - object containing template information.
	 * @param dest - the absolute path of the destination folder.
	 * @param projectName - the name of the project to be create.
	 * @param socDisplayName - the display name of the SoC.
	 * @param board - the name of the board. (The display name of the board)
	 * @param socPackage - the name of the SoC package, i.e. "tqfn" or "wlp"
	 * @param identifier - The zephyr identifier.
	 * @param socData - the SoC data from the data model
	 * @returns Promise that resolves to true when a project is created successfully
	 */
	public async createProject(
		templateInfo: ProjectGeneratorTypes.Template,
		dest: fs.PathLike,
		projectName: string,
		socDisplayName: string,
		board: string,
		socPackage: string,
		identifier: string,
		socData?: Soc
	): Promise<boolean> {
		let isProjectFolderCreated = false;
		const projectPath = path.join(dest as string, projectName);

		try {
			if (!this.doesTemplateExist(templateInfo)) {
				throw new Error(
					`Error while creating CFS project, template does not exist. Template name: ${templateInfo.name}}`
				);
			}

			if (!fs.existsSync(dest)) {
				throw new Error(
					`Destination folder not created ${JSON.stringify(dest)}`
				);
			}

			// Create new folder with project name
			if (fs.existsSync(projectPath)) {
				throw new Error(
					`An error occurred:\nA folder named '${projectName}' already exists at the following path: '${dest as string}'. Please choose a different name for the new project or specify a different directory.`
				);
			}
			if (!this.createFolder(projectPath)) {
				throw new Error(`Error creating folder ${projectPath}`);
			}

			isProjectFolderCreated = true;

			// Create a project for each folder in the example
			for (const templateFolder of templateInfo.folders) {
				// Create a new folder to hold the template
				const folder = path.join(projectPath, templateFolder.name);
				if (!this.createFolder(folder)) {
					throw new Error(`Error creating folder ${folder}`);
				}

				const templatePath = templateFolder.location.path as string;
				const copyOptions: fs.CopyOptions = {
					recursive: true
				};
				// Copying over the sample folder
				await this.copyFiles(templatePath, folder, copyOptions);
				this.updateCMakeLists(folder);
				this.updatePrjConf(folder);
				this.addFoldersToWorkspace([templateFolder.name]);
				const additionalSettings: AdditionalSettingType = {};
				additionalSettings["cfs.project.board"] = identifier;
				const socName = socDisplayName.toLowerCase();
				additionalSettings["cfs.openocd.target"] =
					"${config:cfs.openocd.path}/share/openocd/scripts/target/" +
					socName +
					".cfg";
				additionalSettings["cfs.project.target"] = socDisplayName;
				additionalSettings["cfs.cmsis.svdFile"] =
					"${config:cfs.sdk.path}/SDK/MAX/Libraries/CMSIS/Device/Maxim/" +
					socDisplayName +
					"/Include/" +
					socName +
					".svd";
				// Create .vscode folder with settings applied
				this.addCfsSettings(folder, additionalSettings);

				if (socData && templateInfo.configs) {
					let configTemplate;
					for (const config of templateInfo.configs) {
						if (config.board === "default") {
							configTemplate = config.cfsconfig;
						} else if (config.board === board) {
							configTemplate = config.cfsconfig;
							break;
						}
					}
					this.createConfigFile(
						folder,
						socName,
						socPackage,
						board,
						"zephyr-3.7",
						configTemplate,
						identifier
					);
				}

				// Remove the cfs folder
				const cfsDir = path.join(folder, "cfs");
				if (fs.existsSync(cfsDir)) {
					fs.rmSync(cfsDir, { recursive: true, force: true });
				}
			}

			// Create the workspace file containing all projects
			if (this.workspaceFile !== undefined) {
				this.createWorkspaceFile(
					projectPath,
					projectName,
					this.workspaceFile
				);
				return true;
			}
		} catch (error: unknown) {
			if (isProjectFolderCreated) {
				fs.rmdirSync(projectPath, { recursive: true });
			}
			let newErr = new Error(`Error while creating CFS project.`);
			if (typeof error === typeof newErr) {
				newErr = error as Error;
				newErr.message = `Error while creating CFS project. ${newErr.message}`;
			}
			throw newErr;
		}

		return false;
	}

	/**
	 * Update the CMakeLists.txt in the given project folder to include
	 * the appropriate compiler flags
	 * @param folder the project folder
	 */
	updateCMakeLists(folder: string) {
		const cMakeListsPath = path.join(folder, "CMakeLists.txt");
		if (fs.existsSync(cMakeListsPath)) {
			const cMakeLists = fs.readFileSync(cMakeListsPath, {
				encoding: "utf-8"
			});
			const output = [];
			let projectFound = false;
			const ccOptions = [
				"-fstack-usage",
				"-fdump-ipa-cgraph",
				"-gdwarf-4"
			];
			for (const line of cMakeLists.split("\n")) {
				output.push(line);
				// Append compiler options after the project definition
				if (!projectFound && line.includes("project(")) {
					projectFound = true;
					output.push("");
					output.push(
						"# Include compiler flags to enable source navigation with ELF File Explorer"
					);
					for (const option of ccOptions) {
						output.push(`zephyr_cc_option(${option})`);
					}
				}
			}

			fs.writeFileSync(cMakeListsPath, output.join("\n"));
		}
	}

	/**
	 * Update the prj.conf in the given project folder to include
	 * the appropriate default CFS settings
	 * @param folder the project folder
	 */
	updatePrjConf(folder: string) {
		const prjConfPath = path.join(folder, "prj.conf");
		if (fs.existsSync(prjConfPath)) {
			const prjConf = fs.readFileSync(prjConfPath, {
				encoding: "utf-8"
			});
			const output = prjConf.split("\n");
			const settings = [
				"CONFIG_THREAD_NAME",
				"CONFIG_DEBUG_THREAD_INFO",
				"CONFIG_THREAD_ANALYZER"
			];

			output.push("# Enable thread awareness when debugging");
			for (const setting of settings) {
				output.push(`${setting}=y`);
			}

			fs.writeFileSync(prjConfPath, output.join("\n"));
		}
	}

	/**
	 * This function adds the workspaces to the vscode workspace
	 * @param {string[]} folders: folders to be added to the workspace
	 */
	addFoldersToWorkspace(folders: string[]) {
		for (const folder of folders)
			if (this.workspaceFile === undefined) {
				this.workspaceFile = {
					folders: [
						{
							path: folder
						}
					],
					settings: {
						"cfs.configureWorkspace": "Yes",
						"terminal.integrated.defaultProfile.windows":
							"CFS Terminal",
						"terminal.integrated.defaultProfile.osx": "CFS Terminal",
						"terminal.integrated.defaultProfile.linux": "CFS Terminal"
					}
				};
			} else {
				this.workspaceFile.folders.push({ path: folder });
			}
	}

	/**
	 * Clones the git repository and sets up sparse checkout for the specified subdirectories.
	 * @param gitUrl - The URL of the git repository.
	 * @param projectPath - The path to clone the repository into.
	 */
	private cloneAndSparseCheckout(
		gitUrl: string,
		projectPath: string,
		branch: string,
		subdir: string
	) {
		let isTempFolderCreated = false;
		let isArmFolderCreated = false;

		const tempFolderPath = path.join(projectPath, "temp");
		try {
			// Clone the repository without checking out files
			execSync(`git clone --no-checkout ${gitUrl} ${tempFolderPath}`);
			isTempFolderCreated = true;
			// Initialize sparse checkout
			execSync(`git -C ${tempFolderPath} sparse-checkout init`);
			// Set the subdirectories for sparse checkout
			execSync(
				`git -C ${tempFolderPath} sparse-checkout set ${subdir}`
			);
			// Checkout the specified branch
			execSync(`git -C ${tempFolderPath} checkout ${branch}`);
			const srcDir = path.join(tempFolderPath, subdir);
			const destDir = path.join(projectPath, "arm");
			fs.mkdirSync(destDir, { recursive: true });
			isArmFolderCreated = true;
			fs.readdirSync(srcDir).forEach((file) => {
				const srcFile = path.join(srcDir, file);
				const destFile = path.join(destDir, file);
				fs.renameSync(srcFile, destFile);
			});
			fs.rmdirSync(tempFolderPath, { recursive: true });
		} catch (err) {
			if (isTempFolderCreated) {
				fs.rmdirSync(tempFolderPath, { recursive: true });
			}
			if (isArmFolderCreated) {
				const destDir = path.join(projectPath, "arm");
				fs.rmdirSync(destDir, { recursive: true });
			}
			throw new Error(
				"Error while cloning git repo and copying over the contents."
			);
		}
	}

	/**
	 * This function adds the files present in the folder './templates/.vscode/*' to the .vscode folder in the arm folder.
	 * @param {string} projectPath - path to the project location
	 * @param boardIdentifier -  the board zephyr identifier.
	 */
	private addCfsSettings(
		projectPath: string,
		additionalSettings?: AdditionalSettingType
	) {
		const vscodeSettingPath = path.join(projectPath, ".vscode");
		try {
			const isVscodeSettingCreated =
				this.createFolder(vscodeSettingPath);
			if (fs.existsSync(projectPath) && isVscodeSettingCreated) {
				// Copying over the settings.json file
				const settings = settingsData as Record<string, string>;

				//Updating the settings for zephyr
				if (additionalSettings) {
					// eslint-disable-next-line @typescript-eslint/no-for-in-array
					for (const key in Object.keys(additionalSettings)) {
						const settingKey = Object.keys(additionalSettings)[key];
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						const settingValue = Object.values(additionalSettings)[
							key
						];
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						settings[settingKey] = settingValue;
					}
				}

				const settingsString = JSON.stringify(settings, null, 2);

				const settingsFilePath = path.join(
					projectPath,
					"./.vscode/settings.json"
				);

				fs.writeFileSync(settingsFilePath, settingsString);

				// Copying over the launch.json file.
				const launchString = JSON.stringify(launchData, null, 2);

				const launchFilePath = path.join(
					projectPath,
					"./.vscode/launch.json"
				);

				fs.writeFileSync(launchFilePath, launchString);

				// Copying over c_cpp_properties.json
				const cCppPropString = JSON.stringify(cCppPropData, null, 2);

				const cCppPropFilePath = path.join(
					projectPath,
					"./.vscode/c_cpp_properties.json"
				);
				fs.writeFileSync(cCppPropFilePath, cCppPropString);
			} else {
				throw new Error(
					`Error while creating ${projectPath} folder and/or ${vscodeSettingPath}`
				);
			}
		} catch (err) {
			let newErr = new Error(
				`Error while adding the vscode specific settings.`
			);
			if (typeof err === typeof newErr) {
				newErr = err as Error;
				newErr.message = `Error while creating CFS project. ${newErr.message}`;
			}

			throw newErr;
		}
	}
}
