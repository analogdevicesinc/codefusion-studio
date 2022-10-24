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
import { expect } from "chai";
import { ElfArmAttributes } from "../src/ElfArmAttributes.js";
import * as Enums from "../src/enums.js";

describe("ElfArmAttributes", () => {
	let elfArmAttributes: ElfArmAttributes;

	beforeEach(() => {
		elfArmAttributes = new ElfArmAttributes();
	});

	describe("constructor", () => {
		it("should initialize all attributes to undefined or default values", () => {
			expect(elfArmAttributes.Tag_CPU_raw_name).to.be.undefined;
			expect(elfArmAttributes.Tag_CPU_name).to.be.undefined;
			expect(elfArmAttributes.Tag_CPU_arch).to.be.undefined;
			expect(elfArmAttributes.Tag_CPU_arch_profile).to.be.undefined;
			expect(elfArmAttributes.Tag_ARM_ISA_use).to.be.undefined;
			expect(elfArmAttributes.Tag_THUMB_ISA_use).to.be.undefined;
			expect(elfArmAttributes.Tag_FP_arch).to.be.undefined;
			expect(elfArmAttributes.Tag_WMMX_arch).to.be.undefined;
			expect(elfArmAttributes.Tag_Advanced_SIMD_arch).to.be.undefined;
			expect(elfArmAttributes.Tag_PCS_config).to.be.undefined;
			expect(elfArmAttributes.Tag_ABI_PCS_R9_use).to.be.undefined;
			expect(elfArmAttributes.Tag_ABI_PCS_RW_data).to.be.undefined;
			expect(elfArmAttributes.Tag_ABI_PCS_RO_data).to.be.undefined;
			expect(elfArmAttributes.Tag_ABI_PCS_GOT_use).to.be.undefined;
			expect(elfArmAttributes.Tag_ABI_PCS_wchar_t).to.be.undefined;
			expect(elfArmAttributes.Tag_ABI_FP_rounding).to.be.undefined;
			expect(elfArmAttributes.Tag_ABI_FP_denormal).to.be.undefined;
			expect(elfArmAttributes.Tag_ABI_FP_exceptions).to.be.undefined;
			expect(elfArmAttributes.Tag_ABI_FP_user_exceptions).to.be.undefined;
			expect(elfArmAttributes.Tag_ABI_FP_number_model).to.be.undefined;
			expect(elfArmAttributes.Tag_ABI_align_needed).to.be.undefined;
			expect(elfArmAttributes.Tag_ABI_align_preserved).to.be.undefined;
			expect(elfArmAttributes.Tag_ABI_enum_size).to.be.undefined;
			expect(elfArmAttributes.Tag_ABI_HardFP_use).to.be.undefined;
			expect(elfArmAttributes.Tag_ABI_VFP_args).to.be.undefined;
			expect(elfArmAttributes.Tag_ABI_WMMX_args).to.be.undefined;
			expect(elfArmAttributes.Tag_ABI_optimization_goals).to.be.undefined;
			expect(elfArmAttributes.Tag_ABI_FP_optimization_goals).to.be.undefined;
			expect(elfArmAttributes.Tag_compatibility).to.be.undefined;
			expect(elfArmAttributes.Tag_CPU_unaligned_access).to.be.undefined;
			expect(elfArmAttributes.Tag_FP_HP_extension).to.be.undefined;
			expect(elfArmAttributes.Tag_ABI_FP_16bit_format).to.be.undefined;
			expect(elfArmAttributes.Tag_MPextension_use).to.be.undefined;
			expect(elfArmAttributes.Tag_DIV_use).to.be.undefined;
			expect(elfArmAttributes.Tag_DSP_extension).to.be.undefined;
			expect(elfArmAttributes.Tag_MVE_arch).to.be.undefined;
			expect(elfArmAttributes.Tag_PAC_extension).to.be.undefined;
			expect(elfArmAttributes.Tag_BTI_extension).to.be.undefined;
			expect(elfArmAttributes.Tag_nodefaults).to.be.undefined;
			expect(elfArmAttributes.Tag_also_compatible_with).to.be.undefined;
			expect(elfArmAttributes.Tag_conformance).to.be.undefined;
			expect(elfArmAttributes.Tag_T2EE_use).to.be.undefined;
			expect(elfArmAttributes.Tag_Virtualization_use).to.be.undefined;
			expect(elfArmAttributes.Tag_FramePointer_use).to.be.undefined;
			expect(elfArmAttributes.Tag_BTI_use).to.be.undefined;
			expect(elfArmAttributes.Tag_PACRET_use).to.be.undefined;
		});
	});

	describe("setters and getters", () => {
		it("should set and get Tag_CPU_raw_name correctly", () => {
			elfArmAttributes.Tag_CPU_raw_name = "Armv7";
			expect(elfArmAttributes.Tag_CPU_raw_name).to.equal("Armv7");
		});

		it("should set and get Tag_CPU_arch correctly", () => {
			elfArmAttributes.Tag_CPU_arch = Enums.cpu_arch.Armv7;
			expect(elfArmAttributes.Tag_CPU_arch).to.equal(Enums.cpu_arch.Armv7);
		});
	});
});
