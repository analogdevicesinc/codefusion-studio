/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
import { execSync } from "node:child_process";
import path from "path";
import { Soc } from "../types/soc.js";
import { CfsConfigFormat } from "../types/cfsconfig.js";

export enum TemplateSourceLocation {
	git = "git",
	localFolder = "localFolder",
	remoteZip = "remoteZip",
	localZip = "localZip"
}

/**
 * This type defines the additional settings required to create a new project.
 */
export interface AdditionalSettingType {
	"cfs.project.board"?: string;
	"cfs.cmsis.svdFile"?: string;
	"cfs.openocd.target"?: string;
	"cfs.openocd.riscvTarget"?: string;
	"cfs.project.target"?: string;
	"cfs.riscvProgramFile"?: string;
	"cfs.riscvDebugPath"?: string;
}

/**
 * This namespace defines the object types used in Project Generation
 */
export namespace ProjectGeneratorTypes {
	export type FirmwarePlatform = "msdk" | "zephyr-4.0";

	export type TemplateLocation =
		| {
				type: TemplateSourceLocation.git;
				path: {
					baseUrl?: string;
					subdir?: string;
					ref: string;
				};
				isRelative: boolean;
		  }
		| {
				type: TemplateSourceLocation.localFolder;
				path: fs.PathLike;
				isRelative: boolean;
		  };

	export interface TemplateFolder {
		name: string;
		location: TemplateLocation;
		boot?: boolean;
		segger: SeggerOptions;
	}
	export interface SeggerOptions {
		ozoneSvd: string;
	}
	/**
	 * Object containing information about the template.
	 */
	export interface Template {
		/** Template name */
		name: string;
		/** Brief description of what the template achieves */
		description: string;
		/** List of folders to include in the template, typically one per SoC core */
		folders: TemplateFolder[];
		/** Optional list of template .cfsconfig files to be added to the project during creation */
		configs?: CfsConfig[];
	}

	export interface CfsConfig {
		/** Board name associated with this .cfsconfig */
		board: string;
		/** .cfsconfig data */
		cfsconfig: CfsConfigFormat;
	}
}

export abstract class ProjectGenerator {
	/**
	 * Creates a project based on the template passed at the destination with the passed project name.
	 * @param templateInfo - object containing template information.
	 * @param dest - the absolute path of the destination folder.
	 * @param projectName - the name of the project to be create.
	 * @param socDisplayName - the name of the SoC
	 * @param board - the name of the board.
	 * @param socPackage - the name of the SoC package, i.e. "tqfn" or "wlp"
	 * @param identifier - The identifier based on the firmware platform
	 * @param socData - the SoC data from the data model
	 * @param customBoardLocation - The location to the custom BSP
	 * @param secure - Whether the project is in the secure domain or not
	 * @returns true if the project is created, false if the project is not created.
	 */
	public abstract createProject(
		templateInfo: ProjectGeneratorTypes.Template,
		dest: fs.PathLike,
		projectName: string,
		socDisplayName: string,
		board: string,
		socPackage: string,
		identifier: string,
		socData?: Soc,
		customBoardLocation?: string,
		secure?: boolean
	): Promise<boolean>;

	/**
	 * Copy files and directories recursively from source to destination.
	 * @param {string} source: absolute path of the source
	 * @param {string} destination: absolute path to the destination
	 * @param {fs.CopyOptions} copyOptions: Include the filter function as part of the object.
	 * @returns Promise that resolves to true when files are copied successfully
	 */
	protected async copyFiles(
		source: string,
		destination: string,
		copyOptions: fs.CopyOptions
	) {
		return new Promise((resolve, reject) => {
			fs.cp(source, destination, copyOptions, (err) => {
				if (err !== null) {
					console.error("Error while copying files.");
					console.error(err);
					const rejectionError = err;
					rejectionError.message =
						"Error while copying files. " + rejectionError.message;
					reject(rejectionError);
				} else {
					resolve(true);
				}
			});
		});
	}

	/**
	 * Checks if the path given as input is a file or not.
	 * @param target: The absolute path to target
	 * @returns
	 */
	protected isFile(target: string) {
		return fs.statSync(target).isFile();
	}

	/**
	 * This function outputs if a the template provided exists.
	 * @param {ProjectGenerator.Template} template: Object with the following fields
	 * @returns {boolean}: true if template exists, false if template does not.
	 */
	protected doesTemplateExist = (
		template: ProjectGeneratorTypes.Template
	): boolean => {
		for (const templateFolder of template.folders) {
			switch (templateFolder.location.type) {
				case TemplateSourceLocation.localFolder:
					try {
						const contents = fs.readdirSync(
							templateFolder.location.path
						);
						//If the content of the folder are not empty returning true
						if (contents.length === 0) {
							return false;
						}
					} catch (err) {
						console.error(
							`Error reading content of ${templateFolder.location.path as string}`
						);
						console.error(err);
						return false;
					}
					break;
				case TemplateSourceLocation.git:
					try {
						// Check if the git URL is valid and reachable
						const gitUrl = (
							templateFolder.location.path as { baseUrl: string }
						).baseUrl;
						execSync(`git ls-remote ${gitUrl}`, { stdio: "ignore" });
					} catch (err: unknown) {
						console.error(
							`Error accessing git repository at ${String(templateFolder.location.path)}.`
						);
						console.error(err);
						return false;
					}
					break;
				default:
					return false;
			}
		}
		// we return false already if we hit an error, so we can assume true here as long as there are template folders
		return template.folders.length > 0;
	};

	/**
	 *
	 * @param folder: Full path of the folder to create
	 * @returns {boolean}: returns true if a folder is created, false if it doesn't
	 */
	protected createFolder(folder: fs.PathLike): boolean {
		fs.mkdirSync(folder);
		return fs.existsSync(folder);
	}

	/**
	 * This function writes the vscode workspace file to destination
	 * @param {string} destination: absolute path to the destination folder
	 * @param {string} workspaceName: The project name
	 * @param {object} jsonData: Contents to be pushed in .code-workspace file
	 */
	protected createWorkspaceFile(
		destination: string,
		workspaceName: string,
		jsonData: object
	): void {
		const filename = `${destination}/${workspaceName}.code-workspace`;

		const dataString = JSON.stringify(jsonData, undefined, 2);

		fs.writeFileSync(filename, dataString);
	}

	/**
	 * Create a .cfsconfig file with default values
	 * @param projectPath - the root project directory
	 * @param soc - the SoC name
	 * @param socPackage - the SoC package name
	 * @param board - the board name
	 * @param firmwarePlatform - the firmware platform name
	 * @param cfsconfigTemplate - the .cfsconfig template
	 * @param zephyrId - the Zephyr ID for the board, if a Zephyr project
	 */
	protected createConfigFile(
		projectPath: string,
		soc: string,
		socPackage: string,
		board: string,
		firmwarePlatform: string,
		cfsconfigTemplate?: CfsConfigFormat,
		zephyrId?: string
	) {
		const socName = `${soc}-${socPackage}`;
		const configPath = path.join(projectPath, `${socName}.cfsconfig`);
		const cfsconfig = path.join(
			projectPath,
			"cfs",
			board,
			`${socName}.cfsconfig`
		);
		// If a config file exists for the given board, copy it to the root level
		if (fs.existsSync(cfsconfig)) {
			fs.copyFileSync(cfsconfig, configPath);
		} else if (cfsconfigTemplate) {
			// Use the config file template in the soc data
			cfsconfigTemplate.BoardName = board;
			if (firmwarePlatform.includes("zephyr")) {
				cfsconfigTemplate.ZephyrId = zephyrId;
			}
			cfsconfigTemplate.Package = socPackage;
			cfsconfigTemplate.Timestamp = new Date().toISOString();
			fs.writeFileSync(
				configPath,
				JSON.stringify(cfsconfigTemplate, undefined, 2)
			);
		}
	}

	protected addOzoneDebugFile(
		projectLocation: fs.PathLike,
		projectName: string,
		socName: string,
		elfFileRelativeLoc: string,
		archSvdFile: string
	) {
		// Define the file path
		const templatePath = path.join(
			__dirname,
			"templates",
			"ozone.jdebug"
		);
		const ozoneFileName = `${projectName}.jdebug`;
		const outputFilePath = path.join(
			projectLocation.toString(),
			ozoneFileName
		);
		// Read the file content synchronously
		let data = fs.readFileSync(templatePath, "utf8");

		//Getting the current date
		// Parse the date string
		const date = new Date();

		// Format the date
		const formattedDate = new Intl.DateTimeFormat("en-GB", {
			year: "numeric",
			month: "short",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false
		}).format(date);

		// Define the find and replace pairs
		const replacements: { find: string; replace: string }[] = [
			{
				find: "##PROJECT_LOCATION##",
				replace: projectLocation.toString().replace(/\\/g, "/")
			},
			{ find: "##SOC_NAME##", replace: socName },
			{
				find: "##ELF_FILE_RELATIVE_LOC##",
				replace: elfFileRelativeLoc.replace(/\\/g, "/")
			},
			{
				find: "##PROJECT_NAME##",
				replace: projectName
			},
			{
				find: "##DATE##",
				replace: formattedDate
			},
			{
				find: "##ARCH_SVD_FILE##",
				replace: archSvdFile
			}
		];

		// Perform the replacements
		replacements.forEach((pair) => {
			data = data.replace(new RegExp(pair.find, "g"), pair.replace);
		});

		// Write the modified content to the new file in the project location
		fs.writeFileSync(outputFilePath, data, "utf8");
	}
}
