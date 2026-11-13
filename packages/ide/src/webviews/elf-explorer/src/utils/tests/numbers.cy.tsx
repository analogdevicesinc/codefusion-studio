/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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

import {convertBytesToKbOrMb, transformBtoKB} from '../number';

describe('transformBtoKB function', () => {
	it('should return size in bytes when size is less than or equal to 1024', () => {
		expect(transformBtoKB(500)).to.equal('500 B');
		expect(transformBtoKB(1024)).to.equal('1024 B');
	});

	it('should return size in kilobytes when size is greater than 1024', () => {
		expect(transformBtoKB(2048)).to.equal('2.00 KB');
		expect(transformBtoKB(3072)).to.equal('3.00 KB');
	});

	it('should include "total" suffix when totalSuffix is provided', () => {
		expect(transformBtoKB(2048, 'total')).to.equal('2.00 KB total');
	});
});

describe('convertBytesToKbOrMb Utility Function', () => {
	it('should return value in bytes when less than or equal to 1024', () => {
		expect(convertBytesToKbOrMb(500)).to.equal('500 B');
		expect(convertBytesToKbOrMb(1024)).to.equal('1024 B');
	});

	it('should return value in kilobytes when greater than 1024 bytes', () => {
		expect(convertBytesToKbOrMb(2048)).to.equal('2.00 KB');
		expect(convertBytesToKbOrMb(3072)).to.equal('3.00 KB');
	});

	it('should return value in megabytes when greater than 1 MB', () => {
		expect(convertBytesToKbOrMb(1024 * 1024 * 2)).to.equal('2.00 MB');
		expect(convertBytesToKbOrMb(1024 * 1024 * 3)).to.equal('3.00 MB');
	});
});
