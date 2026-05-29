import { expect } from "chai";
import type { ConfiguredProject } from "cfs-types";
import { CfsJsonProjectConfig } from "../../src/generic/components/cfs-json-project-config.js";
import { createMockPluginInfo } from "../fixtures/mock-plugin-info.js";

function createConfiguredProject(): ConfiguredProject {
	return {
		CoreId: "ARM",
		ProjectId: "project-1",
		FirmwarePlatform: "msdk",
		ExternallyManaged: false,
		Partitions: [],
		Peripherals: [],
		PluginId: "adi.mock.plugin",
		PluginVersion: "1.0.0",
		PlatformConfig: {
			ProjectName: "original-project"
		}
	};
}

describe("CfsJsonProjectConfig", () => {
	it("applies patch content when a SoC/Core patch file exists", async () => {
		const service = new CfsJsonProjectConfig(createMockPluginInfo());
		const patched = await service.configureProject(
			"MAX32690",
			createConfiguredProject()
		);

		expect(patched.ExternallyManaged).to.equal(true);
		expect(patched.PlatformConfig.ProjectName).to.equal(
			"patched-project"
		);
	});

	it("returns input config when patch file is not found", async () => {
		const original = createConfiguredProject();
		const service = new CfsJsonProjectConfig(createMockPluginInfo());
		const result = await service.configureProject(
			"MAX78000",
			original
		);

		expect(result).to.deep.equal(original);
	});
});
