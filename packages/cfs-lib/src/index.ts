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

export { SampleParser } from "./sample-parser/sample-parser.js";
export {
	mapHeaderInfoData,
	convertHeaderBigIntsToStrings,
	convertHeaderBigIntsToNumber,
	mapArmAttributes,
	mapSections,
	mapSegments,
	getSegmentFlags,
	getSegmentTypes,
	decimalToHex,
	HeaderInfo,
	HeaderResponseData,
	TExtendedSegment,
	TSection,
	TSymbol,
	TExtendedSymbol,
	TSegment
} from "./utils/parser-utils.js";
export {
	getFlags,
	getBucket,
	getMachineFlags
} from "./utils/elf-flags-handler.js";
export {
	ProjectGenerator,
	ProjectGeneratorTypes
} from "./project-generation/project-generator.js";
export { ProjectGeneratorFactory } from "./project-generation/project-generator-factory.js";
export * from "./types/soc.js";
