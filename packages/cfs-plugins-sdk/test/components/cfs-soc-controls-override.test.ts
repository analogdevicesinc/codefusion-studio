import { expect } from "chai";
import type {
	CfsFeatureScope,
	CfsPluginProperty,
	CfsSocDataModel
} from "cfs-types";
import { CfsSocControlsOverride } from "../../src/generic/components/cfs-soc-controls-override.js";
import { createMockPluginInfo } from "../fixtures/mock-plugin-info.js";

function createSocDataModel(): CfsSocDataModel {
	return {
		Copyright: "",
		Version: "1.0.0",
		Timestamp: new Date().toISOString(),
		Name: "MAX32690",
		Description: "Test SoC",
		Endianness: "little",
		Parts: [],
		Cores: [],
		Controls: {
			ClockConfig: [
				{
					Id: "CLK_SEL",
					Description: "",
					Type: "string",
					Default: "SYS"
				},
				{
					Id: "CLK_DIV",
					Description: "",
					Type: "integer",
					Default: 1
				}
			],
			PinConfig: [
				{
					Id: "PIN_MODE",
					Description: "",
					Type: "string",
					Default: "gpio"
				}
			],
			UART0: [
				{
					Id: "MODE",
					Description: "legacy",
					Type: "string",
					Default: "legacy"
				},
				{ Id: "REMOVE_ME", Description: "", Type: "string" }
			],
			I2C0: [{ Id: "I2C_MODE", Description: "", Type: "string" }],
			"ADC0 DFGStreamConfig": [
				{ Id: "DFG_MODE", Description: "", Type: "string" }
			],
			"ADC0 DFGGasketConfig": [
				{ Id: "GASKET_MODE", Description: "", Type: "string" }
			]
		},
		Peripherals: [],
		ClockNodes: [
			{
				Name: "SYS_CLK",
				Description: "",
				Type: "root",
				Inputs: [],
				Outputs: [],
				Signpost: "",
				ConfigUIOrder: ["CLK_DIV", "CLK_SEL"]
			},
			{
				Name: "PLL_CLK",
				Description: "",
				Type: "pll",
				Inputs: [],
				Outputs: [],
				Signpost: ""
			}
		],
		Packages: [],
		Registers: [],
		Schema: "",
		Gaskets: [],
		MemoryTypes: [],
		MemoryAliasTypes: [],
		SystemMemory: []
	};
}

describe("CfsSocControlsOverride", () => {
	it("applies peripheral directives and excludes clock/pin/dfg controls", () => {
		const service = new CfsSocControlsOverride(
			createMockPluginInfo({
				properties: {
					peripheral: {
						UART0: {
							removedControls: [{ Id: "REMOVE_ME" }],
							addedControls: [
								{
									Id: "ADDED",
									Description: "",
									Type: "string",
									partRegexp: "MAX32690"
								}
							],
							modifiedControls: [
								{
									Id: "MODE",
									Description: "updated",
									Type: "string",
									partRegexp: "MAX32690"
								}
							],
							defaultOverrides: [
								{
									Id: "MODE",
									Value: "modern",
									partRegexp: "MAX32690"
								}
							]
						}
					}
				} as unknown as Record<CfsFeatureScope, CfsPluginProperty[]>
			})
		);

		const overrides = service.overrideControls(
			"peripheral",
			createSocDataModel()
		);

		expect(Object.keys(overrides)).to.have.members(["UART0", "I2C0"]);
		expect(overrides).to.not.have.property("ClockConfig");
		expect(overrides).to.not.have.property("PinConfig");
		expect(overrides).to.not.have.property("ADC0 DFGStreamConfig");

		const uartControls = overrides.UART0;
		expect(uartControls.map((control) => control.Id)).to.have.members(
			["MODE", "ADDED"]
		);

		const modeControl = uartControls.find(
			(control) => control.Id === "MODE"
		);
		expect(modeControl?.Description).to.equal("updated");
		expect(modeControl?.Default).to.equal("modern");

		const addedControl = uartControls.find(
			(control) => control.Id === "ADDED"
		);
		expect(addedControl?.PluginOption).to.equal(true);
	});

	it("applies directives for dfg controls only", () => {
		const service = new CfsSocControlsOverride(
			createMockPluginInfo({
				properties: {
					dfg: {
						"ADC0 DFGStreamConfig": {
							removedControls: [{ Id: "DFG_MODE" }],
							addedControls: [
								{ Id: "DFG_NEW", Description: "", Type: "string" }
							]
						}
					}
				} as unknown as Record<CfsFeatureScope, CfsPluginProperty[]>
			})
		);

		const overrides = service.overrideControls(
			"dfg",
			createSocDataModel()
		);
		expect(Object.keys(overrides)).to.have.members([
			"ADC0 DFGStreamConfig",
			"ADC0 DFGGasketConfig"
		]);
		expect(
			overrides["ADC0 DFGStreamConfig"].map((control) => control.Id)
		).to.deep.equal(["DFG_NEW"]);
	});

	it("builds memory controls from addedControls directives", () => {
		const service = new CfsSocControlsOverride(
			createMockPluginInfo({
				properties: {
					memory: {
						addedControls: [
							{ Id: "MEMORY_SOURCE", Description: "", Type: "string" }
						]
					}
				} as unknown as Record<CfsFeatureScope, CfsPluginProperty[]>
			})
		);

		const overrides = service.overrideControls(
			"memory",
			createSocDataModel()
		);
		expect(Object.keys(overrides)).to.deep.equal(["memory"]);
		expect(overrides.memory[0].Id).to.equal("MEMORY_SOURCE");
		expect(overrides.memory[0].PluginOption).to.equal(true);
	});

	it("applies pinConfig directives", () => {
		const service = new CfsSocControlsOverride(
			createMockPluginInfo({
				properties: {
					pinConfig: {
						removedControls: [{ Id: "PIN_MODE" }],
						addedControls: [
							{ Id: "PIN_OVERRIDE", Description: "", Type: "string" }
						]
					}
				} as unknown as Record<CfsFeatureScope, CfsPluginProperty[]>
			})
		);

		const overrides = service.overrideControls(
			"pinConfig",
			createSocDataModel()
		);
		expect(
			overrides.PinConfig.map((control) => control.Id)
		).to.deep.equal(["PIN_OVERRIDE"]);
	});

	it("uses ConfigUIOrder for clockConfig and applies directives", () => {
		const service = new CfsSocControlsOverride(
			createMockPluginInfo({
				properties: {
					clockConfig: {
						SYS_CLK: {
							removedControls: [{ Id: "CLK_DIV" }],
							addedControls: [
								{ Id: "CLK_EXTRA", Description: "", Type: "string" }
							]
						}
					}
				} as unknown as Record<CfsFeatureScope, CfsPluginProperty[]>
			})
		);

		const overrides = service.overrideControls(
			"clockConfig",
			createSocDataModel()
		);
		expect(Object.keys(overrides)).to.deep.equal(["SYS_CLK"]);
		expect(
			overrides.SYS_CLK.map((control) => control.Id)
		).to.deep.equal(["CLK_SEL", "CLK_EXTRA"]);
	});

	it("returns an empty object for unsupported scopes", () => {
		const service = new CfsSocControlsOverride(
			createMockPluginInfo()
		);
		expect(
			service.overrideControls("workspace", createSocDataModel())
		).to.deep.equal({});
	});
});
