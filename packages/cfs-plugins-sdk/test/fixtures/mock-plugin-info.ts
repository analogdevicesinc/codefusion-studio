import type {
	CfsFeature,
	CfsFeatureScope,
	CfsPluginInfo,
	CfsSocInfo
} from "cfs-types";
import { resolveFixturePath } from "../utilities/test-helpers.js";

function createFeature(): CfsFeature {
	return {
		files: [],
		templates: []
	};
}

export function createFullFeatureSet(): Record<
	CfsFeatureScope,
	CfsFeature
> {
	return {
		workspace: createFeature(),
		project: createFeature(),
		codegen: createFeature(),
		memory: createFeature(),
		peripheral: createFeature(),
		pinConfig: createFeature(),
		clockConfig: createFeature(),
		dfg: createFeature(),
		aiprof: createFeature()
	};
}

export function createMockPluginInfo(
	overrides: Partial<CfsPluginInfo> = {}
): CfsPluginInfo {
	const supportedSocs: CfsSocInfo[] = [
		{
			name: "max32690",
			board: "max32690evkit/max32690/m4",
			package: "WLP"
		}
	];

	return {
		schemaVersion: "1.0.0",
		pluginPath: resolveFixturePath("mock-plugin", ".cfsplugin"),
		pluginName: "Mock Plugin",
		pluginDescription: "Test fixture plugin info",
		pluginId: "adi.mock.plugin",
		pluginVersion: "1.0.0",
		pluginApiVersion: 1,
		minConfigSchema: 1,
		maxConfigSchema: 2,
		author: "CodeFusion Tests",
		supportedSocs,
		firmwarePlatform: "test-platform",
		extends: { pluginId: "", pluginVersion: "" },
		features:
			overrides.features ??
			({} as unknown as Record<CfsFeatureScope, CfsFeature>),
		configOverrides: [],
		...overrides
	};
}
