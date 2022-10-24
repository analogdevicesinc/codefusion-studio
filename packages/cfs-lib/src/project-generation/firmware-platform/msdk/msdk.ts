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

import * as fs from "fs";
import * as path from "path";

import {
	AdditionalSettingType,
	ProjectGenerator,
	ProjectGeneratorTypes
} from "../../project-generator.js";
import { Soc } from "../../../types/soc.js";

export class MsdkProjectGenerator extends ProjectGenerator {
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
	 * @param board - the name of the board.
	 * @param socPackage - the name of the SoC package, i.e. "tqfn" or "wlp"
	 * @param identifier - The msdk identifier
	 * @param socData - the SoC data from the data model
	 * @param customBoardLocation - The location to the custom BSP
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
		socData?: Soc,
		customBoardLocation?: string
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

			let hasBootCore = false;
			// Create a project for each folder in the example
			for (const templateFolder of templateInfo.folders) {
				// Create a new folder to hold the template
				const folder = path.join(projectPath, templateFolder.name);
				if (!this.createFolder(folder)) {
					throw new Error(`Error creating folder ${folder}`);
				}

				// Copy the files over as is from the template
				const templatePath = templateFolder.location.path as string;
				await this.copyMsdkTemplate(templatePath, folder);
				this.addFoldersToWorkspace([templateFolder.name]);
				// Update the project
				const settingsFilePath = path.join(
					folder,
					".vscode/settings.json"
				);
				const additionalSettings: AdditionalSettingType = {};
				additionalSettings["cfs.project.board"] = identifier;
				const socName = socDisplayName.toLowerCase();
				additionalSettings["cfs.cmsis.svdFile"] =
					"${config:cfs.sdk.path}/SDK/MAX/Libraries/CMSIS/Device/Maxim/" +
					socDisplayName +
					"/Include/" +
					socName +
					".svd";
				additionalSettings["cfs.openocd.target"] =
					"${config:cfs.openocd.path}/share/openocd/scripts/target/" +
					socName +
					".cfg";
				additionalSettings["cfs.openocd.riscvTarget"] =
					`target/${socName}_riscv.cfg`;
				this.updateSettingsFile(settingsFilePath, additionalSettings);

				if (customBoardLocation) {
					this.updateMakefileForCustomBoard(
						folder,
						customBoardLocation
					);
				}
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
						"msdk",
						configTemplate
					);

					// Remove the cfs folder
					const cfsDir = path.join(folder, "cfs");
					if (fs.existsSync(cfsDir)) {
						fs.rmSync(cfsDir, { recursive: true, force: true });
					}
				}

				// For MAX32xxx/78xxx parts, the ARM core is the booting core, so we use the RV_ARM_Loader example
				// on the ARM core to load the application to the RISCV core.
				if (templateFolder.boot) {
					// Open project.mk and update RISCV_APP to point to the RISCV project
					const projectMkPath = path.join(folder, "project.mk");
					if (fs.existsSync(projectMkPath)) {
						let fileContent = fs.readFileSync(projectMkPath, "utf8");
						const newLine = "RISCV_APP=../riscv";
						const regex = /^RISCV_APP=.*$/m;

						if (regex.test(fileContent)) {
							fileContent = fileContent.replace(regex, newLine);
						} else {
							fileContent += `\n${newLine}\n`;
						}

						fs.writeFileSync(projectMkPath, fileContent, "utf8");
					}
					hasBootCore = true;
				} else if (hasBootCore) {
					// Remove the launch.json if a boot core exists, since all debugging
					// should be done through the boot core's project.
					fs.rmSync(path.join(folder, ".vscode", "launch.json"), {
						force: true
					});
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
	 * Copy files and directories from source to destination.
	 * @param {string} source - absolute path of the source
	 * @param {string} destination - absolute path to the destination
	 */
	protected async copyMsdkTemplate(
		source: string,
		destination: string
	) {
		const copyOptions: fs.CopyOptions = {
			recursive: true,
			filter(source) {
				//Extensions to exclude
				const fileExtensionsToExclude: string[] = [
					".project",
					".cproject",
					".launch"
				];

				//Exclude .setting directory
				if (fs.lstatSync(source).isDirectory()) {
					return !source.includes(".settings");
				}

				//Exclude file the extension defined in extensions to exclude array
				let fileExtension = source.split(".").pop();
				if (fileExtension) {
					fileExtension = "." + fileExtension;
					return !fileExtensionsToExclude.includes(fileExtension);
				}

				return true;
			}
		};
		return this.copyFiles(source, destination, copyOptions);
	}

	/**
	 * Updates the vscode settings based on the additional settings
	 * @param {fs.PathLike} settingsFilePath - The absolute path to settings file that needs to be updated.
	 * @param {AdditionalSettingType} additionalSettings - Object with additional settings.
	 * @param {string} additionalSettings - ["cfs.project.board"]: The name of the board eg: "EvKit_1"
	 */
	protected updateSettingsFile(
		settingsFilePath: fs.PathLike,
		additionalSettings?: AdditionalSettingType
	) {
		try {
			if (fs.existsSync(settingsFilePath)) {
				const stringData = fs.readFileSync(settingsFilePath, "utf-8");
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const settings = JSON.parse(stringData);
				if (additionalSettings) {
					// eslint-disable-next-line @typescript-eslint/no-for-in-array
					for (const indx in Object.keys(additionalSettings)) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
						settings[Object.keys(additionalSettings)[indx]] =
							Object.values(additionalSettings)[indx];
					}
				}
				const settingsString = JSON.stringify(settings, null, 2);
				fs.writeFileSync(settingsFilePath, settingsString);
			}
		} catch (err: unknown) {
			let newErr = new Error(`Error while updating the settings.`);
			if (typeof err === typeof newErr) {
				newErr = err as Error;
				newErr.message = `Error while updating the settings. ${newErr.message}`;
			}
			throw newErr;
		}
	}

	/**
	 * This function adds the workspaces to the vscode workspace
	 * @param {string[]} folders - folders to be added to the workspace
	 */
	private addFoldersToWorkspace(folders: string[]) {
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
	 * This function appends BSP_SEARCH_DIR to the project.mk based on: https://analogdevicesinc.github.io/msdk/USERGUIDE/#bsp-search-directory
	 * @param armFolderPath - The full path to the arm folder
	 * @param customBoardLocation - The location for the custom BSP.
	 */
	private updateMakefileForCustomBoard(
		armFolderPath: fs.PathLike,
		customBoardLocation: string
	) {
		try {
			// Resolving the project make file path

			const makefilePath = path.join(
				armFolderPath as string,
				"project.mk"
			);

			const bspSearchDir = path.dirname(
				path.dirname(customBoardLocation)
			);

			const configToAppend = `\r\nBSP_SEARCH_DIR = ${bspSearchDir}\r\n`;

			fs.appendFileSync(makefilePath, configToAppend);
		} catch (err) {
			let newErr = new Error(
				`Error while appending content to the makefile.`
			);
			if (typeof err === typeof newErr) {
				newErr = err as Error;
				newErr.message = `Error while appending content to the makefile. ${newErr.message}`;
			}
			throw newErr;
		}
	}
}
