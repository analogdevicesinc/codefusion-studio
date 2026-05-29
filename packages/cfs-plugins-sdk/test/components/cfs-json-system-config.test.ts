import { expect } from "chai";
import type { CfsConfig } from "cfs-types";
import { CfsJsonSystemConfig } from "../../src/generic/components/cfs-json-system-config.js";
import { createMockPluginInfo } from "../fixtures/mock-plugin-info.js";

function createCfsConfig(soc: string): CfsConfig {
	return {
		Copyright: "",
		DataModelVersion: "0.0.0",
		Soc: soc,
		Package: "WLP",
		Pins: [],
		ClockNodes: [],
		Timestamp: new Date().toISOString(),
		BoardName: "OriginalBoard",
		Projects: []
	};
}

describe("CfsJsonSystemConfig", () => {
	it("applies system patch content when system.json exists", async () => {
		const service = new CfsJsonSystemConfig(createMockPluginInfo());
		const patched = await service.configureSystem(
			createCfsConfig("MAX32690")
		);

		expect(patched.BoardName).to.equal("PatchedBoard");
		expect(patched.PatchedBy).to.equal("cfs-plugins-sdk-test");
	});

	it("returns input config when system patch does not exist", async () => {
		const original = createCfsConfig("MAX78000");
		const service = new CfsJsonSystemConfig(createMockPluginInfo());
		const result = await service.configureSystem(original);

		expect(result).to.deep.equal(original);
		expect(result.PatchedBy).to.equal(undefined);
	});
});
