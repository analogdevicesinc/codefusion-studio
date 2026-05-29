import { expect } from "chai";
import type { CfsFeatureScope, CfsPluginProperty } from "cfs-types";
import { PropertyProvider } from "../../src/generic/components/cfs-property-provider.js";
import { createMockPluginInfo } from "../fixtures/mock-plugin-info.js";

describe("PropertyProvider", () => {
	it("returns an empty array when scope has no properties", () => {
		const provider = new PropertyProvider(createMockPluginInfo());

		expect(provider.getProperties("workspace")).to.deep.equal([]);
	});

	it("filters properties by condition and parses default values", () => {
		const workspaceProperties: CfsPluginProperty[] = [
			{
				id: "always",
				name: "Always",
				type: "string"
			},
			{
				id: "conditional",
				name: "Conditional",
				type: "string",
				condition: "${context.soc === 'max32690'}",
				default: "${context.package}"
			},
			{
				id: "filtered",
				name: "Filtered",
				type: "string",
				condition: "${context.soc === 'max78000'}"
			},
			{
				id: "undefined-default",
				name: "Undefined Default",
				type: "string",
				default: "${context.notPresent}"
			}
		];

		const provider = new PropertyProvider(
			createMockPluginInfo({
				properties: {
					workspace: workspaceProperties
				} as unknown as Record<CfsFeatureScope, CfsPluginProperty[]>
			})
		);

		const properties = provider.getProperties("workspace", {
			soc: "max32690",
			package: "WLP"
		});

		expect(properties.map((property) => property.id)).to.deep.equal([
			"always",
			"conditional",
			"undefined-default"
		]);
		expect(properties[1].default).to.equal("WLP");
		expect(properties[2].default).to.equal("");
	});

	it("returns defaults unparsed when no context is provided", () => {
		const workspaceProperties: CfsPluginProperty[] = [
			{
				id: "project-name",
				name: "Project Name",
				type: "string",
				default: "${context.package}-project"
			}
		];

		const provider = new PropertyProvider(
			createMockPluginInfo({
				properties: {
					workspace: workspaceProperties
				} as unknown as Record<CfsFeatureScope, CfsPluginProperty[]>
			})
		);

		const properties = provider.getProperties("workspace");
		expect(properties[0].default).to.equal(
			"${context.package}-project"
		);
	});
});
