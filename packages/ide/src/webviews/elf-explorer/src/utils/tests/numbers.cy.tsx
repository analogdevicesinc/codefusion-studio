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

	it('should include "total" suffix when total is true', () => {
		expect(transformBtoKB(2048, true)).to.equal('2.00 KB total');
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
