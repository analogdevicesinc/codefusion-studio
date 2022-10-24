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
import * as Enums from "./enums.js";

/**
 * Represents the attributes of an ARM ELF file.
 */
export class ElfArmAttributes {
	public Tag_CPU_raw_name: string;
	public Tag_CPU_name: string;
	public Tag_CPU_arch: Enums.cpu_arch;
	public Tag_CPU_arch_profile: Enums.arch_profile;
	public Tag_ARM_ISA_use: Enums.isa_use;
	public Tag_THUMB_ISA_use: Enums.thumb_isa_use;
	public Tag_FP_arch: Enums.fp_arch;
	public Tag_WMMX_arch: Enums.WMMX_arch;
	public Tag_Advanced_SIMD_arch: Enums.SIMD_arch;
	public Tag_PCS_config: Enums.PCS_config;
	public Tag_ABI_PCS_R9_use: Enums.PCS_R9_use;
	public Tag_ABI_PCS_RW_data: Enums.PCS_RW_data;
	public Tag_ABI_PCS_RO_data: Enums.PCS_RO_data;
	public Tag_ABI_PCS_GOT_use: Enums.PCS_GOT_use;
	public Tag_ABI_PCS_wchar_t: Enums.PCS_wchar_t;
	public Tag_ABI_FP_rounding: Enums.ABI_FP_rounding;
	public Tag_ABI_FP_denormal: Enums.ABI_FP_denormal;
	public Tag_ABI_FP_exceptions: Enums.ABI_FP_exceptions;
	public Tag_ABI_FP_user_exceptions: Enums.ABI_FP_user_exceptions;
	public Tag_ABI_FP_number_model: Enums.ABI_FP_number_model;
	public Tag_ABI_align_needed: Enums.ABI_align_needed;
	public Tag_ABI_align_preserved: Enums.ABI_align_preserved;
	public Tag_ABI_enum_size: Enums.ABI_enum_size;
	public Tag_ABI_HardFP_use: Enums.ABI_HardFP_use;
	public Tag_ABI_VFP_args: Enums.ABI_VFP_args;
	public Tag_ABI_WMMX_args: Enums.ABI_WMMX_args;
	public Tag_ABI_optimization_goals: Enums.ABI_optimization_goals;
	public Tag_ABI_FP_optimization_goals: Enums.ABI_optimization_goals; // ABI_FP_optimization_goals == ABI_optimization_goals
	public Tag_compatibility: Enums.Tag_compatibility; // check > 1 => NO_ABI
	public Tag_CPU_unaligned_access: Enums.CPU_unaligned_access;
	public Tag_FP_HP_extension: Enums.FP_HP_extension;
	public Tag_ABI_FP_16bit_format: Enums.ABI_FP_16bit_format;
	public Tag_MPextension_use: Enums.MPextension_use;
	public Tag_DIV_use: Enums.DIV_use;
	public Tag_DSP_extension: Enums.DSP_extension;
	public Tag_MVE_arch: Enums.MVE_arch;
	public Tag_PAC_extension: Enums.PAC_extension;
	public Tag_BTI_extension: Enums.BTI_extension;
	public Tag_nodefaults: number;
	public Tag_also_compatible_with: string;
	public Tag_conformance: string;
	public Tag_T2EE_use: Enums.T2EE_use;
	public Tag_Virtualization_use: Enums.Virtualization_use;
	public Tag_FramePointer_use: Enums.FramePointer_use;
	public Tag_BTI_use: Enums.BTI_use;
	public Tag_PACRET_use: Enums.PACRET_use;
}
