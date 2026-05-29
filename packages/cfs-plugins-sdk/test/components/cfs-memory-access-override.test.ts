import { expect } from "chai";
import { CfsMemoryAccessOverrides } from "../../src/generic/components/cfs-memory-access-override.js";
import { createMockPluginInfo } from "../fixtures/mock-plugin-info.js";

describe("CfsMemoryAccessOverrides", () => {
	it("returns undefined by default", () => {
		const service = new CfsMemoryAccessOverrides(
			createMockPluginInfo()
		);
		expect(
			service.getMemoryAccessOverrides("MAX32690", "CM4")
		).to.equal(undefined);
	});
});
