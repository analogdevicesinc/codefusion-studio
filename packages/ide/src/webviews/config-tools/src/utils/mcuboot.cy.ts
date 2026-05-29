/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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

import {
	computeCustomTlvSize,
	computeHeaderSizeChange,
	computeSlotSizeChange,
	computeSlotUnitChange,
	computeTotalCustomTlvSize
} from './mcuboot';

describe('MCUboot utility functions', () => {
	describe('computeHeaderSizeChange', () => {
		it('should return the display value and bytes when unit is bytes', () => {
			const result = computeHeaderSizeChange(512, 'bytes');
			expect(result.bytesValue).to.equal(512);
			expect(result.displayValue).to.equal(512);
		});

		it('should convert KB display value to bytes', () => {
			const result = computeHeaderSizeChange(2, 'KB');
			expect(result.bytesValue).to.equal(2048);
			expect(result.displayValue).to.equal(2);
		});
	});

	describe('computeSlotSizeChange', () => {
		it('should return the display value and bytes when unit is KB', () => {
			const result = computeSlotSizeChange(256, 'KB');
			expect(result.bytesValue).to.equal(256 * 1024);
			expect(result.displayValue).to.equal(256);
		});

		it('should convert MB display value to bytes', () => {
			const result = computeSlotSizeChange(1, 'MB');
			expect(result.bytesValue).to.equal(1024 * 1024);
			expect(result.displayValue).to.equal(1);
		});
	});

	describe('computeSlotUnitChange', () => {
		it('should convert KB to MB', () => {
			const result = computeSlotUnitChange(1024, 'KB', 'MB');
			expect(result.newDisplayValue).to.equal(1);
			expect(result.bytesValue).to.equal(1024 * 1024);
			expect(result.newUnit).to.equal('MB');
		});

		it('should convert MB to KB', () => {
			const result = computeSlotUnitChange(2, 'MB', 'KB');
			expect(result.newDisplayValue).to.equal(2048);
			expect(result.bytesValue).to.equal(2048 * 1024);
			expect(result.newUnit).to.equal('KB');
		});

		it('should round the display value when converting KB to MB', () => {
			const result = computeSlotUnitChange(1500, 'KB', 'MB');
			expect(result.newDisplayValue).to.equal(1);
			expect(result.bytesValue).to.equal(1024 * 1024);
			expect(result.newUnit).to.equal('MB');
		});

		it('should handle same unit conversion', () => {
			const result = computeSlotUnitChange(256, 'KB', 'KB');
			expect(result.newDisplayValue).to.equal(256);
			expect(result.bytesValue).to.equal(256 * 1024);
		});
	});

	describe('computeCustomTlvSize', () => {
		it('should return overhead only for empty string', () => {
			expect(computeCustomTlvSize('')).to.equal(4);
		});

		it('should return overhead only for whitespace-only string', () => {
			expect(computeCustomTlvSize('   ')).to.equal(4);
		});

		it('should calculate size for a plain string value', () => {
			// "v1.0.0" = 6 chars → 4 overhead + 6 = 10
			expect(computeCustomTlvSize('v1.0.0')).to.equal(10);
		});

		it('should calculate size for a 1-byte hex value', () => {
			// 0xFF = 1 byte → 4 overhead + 1 = 5
			expect(computeCustomTlvSize('0xFF')).to.equal(5);
		});

		it('should calculate size for a 4-byte hex value', () => {
			// 0xAABBCCDD = 4 bytes → 4 overhead + 4 = 8
			expect(computeCustomTlvSize('0xAABBCCDD')).to.equal(8);
		});

		it('should calculate size for a 2-byte hex value', () => {
			// 0xAABB = 2 bytes → 4 overhead + 2 = 6
			expect(computeCustomTlvSize('0xAABB')).to.equal(6);
		});

		it('should handle hex with odd digit count by rounding up', () => {
			// 0xABC = 1.5 bytes → ceil = 2 → 4 overhead + 2 = 6
			expect(computeCustomTlvSize('0xABC')).to.equal(6);
		});
	});

	describe('computeTotalCustomTlvSize', () => {
		it('should return 0 for empty array', () => {
			expect(computeTotalCustomTlvSize([])).to.equal(0);
		});

		it('should sum sizes of multiple TLVs', () => {
			const tlvs = [
				{id: '1', name: 'tlv1', tag: 1, value: 'v1.0.0'},
				{id: '2', name: 'tlv2', tag: 2, value: '0xFF'}
			];
			// 10 + 5 = 15
			expect(computeTotalCustomTlvSize(tlvs)).to.equal(15);
		});

		it('should handle TLVs with empty values', () => {
			const tlvs = [
				{id: '1', name: 'tlv1', tag: 1, value: ''},
				{id: '2', name: 'tlv2', tag: 2, value: '0xAABB'}
			];
			// 4 + 6 = 10
			expect(computeTotalCustomTlvSize(tlvs)).to.equal(10);
		});
	});
});
