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

import type {
	CfsConfig,
	CfsSettings,
	ConfiguredApplicationPackage
} from 'cfs-types';
import type {KeyData} from '../types/workspace-settings';
import type {ApplicationPackage} from '../types/application-packages';
import {
	formatSettingsPersistencePayload,
	formatApplicationPackagesPersistencePayload,
	applyPersistedSettings,
	applyPersistedApplicationPackages
} from './mcuboot-persistence';
import {initializeConfigDict, resetConfigDict} from './config';
import {initializeSocCores, resetCoreDict} from './soc-cores';

describe('MCUBoot Persistence Utilities', () => {
	describe('formatSettingsPersistencePayload', () => {
		it('should format mcuboot enable state and empty signing keys', () => {
			const result = formatSettingsPersistencePayload('enabled', []);

			expect(result).to.deep.equal({
				MCUBoot: {EnableState: 'enabled'},
				SigningKeys: []
			});
		});

		it('should format signing keys with PascalCase keys', () => {
			const signingKeys: KeyData[] = [
				{
					name: 'my-key.pem',
					path: '/path/to/my-key.pem',
					algorithm: 'rsa-2048',
					description: 'Test key'
				}
			];

			const result = formatSettingsPersistencePayload(
				'default',
				signingKeys
			);

			expect(result.MCUBoot!.EnableState).to.equal('default');
			expect(result.SigningKeys).to.have.length(1);
			expect(result.SigningKeys![0].Name).to.equal('my-key.pem');
			expect(result.SigningKeys![0].Path).to.equal(
				'/path/to/my-key.pem'
			);
			expect(result.SigningKeys![0].Algorithm).to.equal('rsa-2048');
			expect(result.SigningKeys![0].Description).to.equal('Test key');
		});

		it('should omit Description when undefined', () => {
			const signingKeys: KeyData[] = [
				{
					name: 'key.pem',
					path: '/path/key.pem',
					algorithm: 'ed25519'
				}
			];

			const result = formatSettingsPersistencePayload(
				'disabled',
				signingKeys
			);

			expect(result.SigningKeys![0]).to.not.have.property(
				'Description'
			);
		});
	});

	describe('formatApplicationPackagesPersistencePayload', () => {
		it('should return empty array when no packages', () => {
			const result = formatApplicationPackagesPersistencePayload([]);
			expect(result).to.deep.equal([]);
		});

		it('should strip id fields and convert to PascalCase', () => {
			const packages: ApplicationPackage[] = [
				{
					id: 'pkg-uuid-123',
					name: 'Package 1',
					enabled: true,
					coreId: 'core-0',
					description: 'Test package',
					signKey: '/path/to/key.pem',
					images: [
						{
							id: 'img-uuid-456',
							name: 'Main App',
							locationType: 'hexAddress',
							locationAddress: '01000000',
							slotSize: 917504,
							slotSizeUnit: 'KB',
							padHeader: true,
							path: '/path/to/app.bin',
							headerSize: 512,
							headerSizeUnit: 'bytes',
							bootable: true,
							swapAlignment: '4',
							imageVersion: '1.0.0'
						}
					]
				}
			];

			const result =
				formatApplicationPackagesPersistencePayload(packages);

			expect(result).to.have.length(1);
			// Verify id is stripped
			expect(result[0]).to.not.have.property('id');
			expect(result[0].Name).to.equal('Package 1');
			expect(result[0].Enabled).to.equal(true);
			expect(result[0].Description).to.equal('Test package');
			expect(result[0].SignKey).to.equal('/path/to/key.pem');

			// Verify image
			expect(result[0].Images).to.have.length(1);
			const image = result[0].Images![0];
			expect(image).to.not.have.property('id');
			expect(image.Name).to.equal('Main App');
			expect(image.LocationType).to.equal('hexAddress');
			expect(image.LocationAddress).to.equal('0x01000000');
			expect(image.SlotSize).to.equal(917504);
			expect(image.Bootable).to.equal(true);
			expect(image.ImageVersion).to.equal('1.0.0');
		});

		it('should omit optional fields when undefined', () => {
			const packages: ApplicationPackage[] = [
				{
					id: 'pkg-uuid',
					name: 'Minimal Package',
					enabled: false,
					coreId: ''
				}
			];

			const result =
				formatApplicationPackagesPersistencePayload(packages);

			expect(result[0]).to.not.have.property('Description');
			expect(result[0]).to.not.have.property('SignKey');
			expect(result[0]).to.not.have.property('Images');
			expect(result[0]).to.not.have.property('Version');
			expect(result[0]).to.not.have.property('SecurityCounter');
		});

		it('should persist securityCounter, aesKwKeyPath, and aesGcmKeyPath', () => {
			const packages: ApplicationPackage[] = [
				{
					id: 'pkg-1',
					name: 'Full Package',
					enabled: true,
					coreId: 'core-0',
					images: [
						{
							id: 'img-1',
							name: 'Image',
							locationType: 'hexAddress',
							locationAddress: '1000',
							slotSize: 4096,
							padHeader: false,
							path: '/path/app.bin',
							headerSize: 32,
							bootable: true,
							swapAlignment: '4',
							imageVersion: '1.0.0',
							securityCounter: 42,
							aesKwKeyPath: '/keys/aes-kw.bin',
							aesGcmKeyPath: '/keys/aes-gcm.bin'
						}
					]
				}
			];

			const result =
				formatApplicationPackagesPersistencePayload(packages);
			const image = result[0].Images![0];

			expect(image.SecurityCounter).to.equal(42);
			expect(image.AesKwKeyPath).to.equal('/keys/aes-kw.bin');
			expect(image.AesGcmKeyPath).to.equal('/keys/aes-gcm.bin');
		});

		it('should persist SecurityCounter as auto when undefined', () => {
			const packages: ApplicationPackage[] = [
				{
					id: 'pkg-1',
					name: 'Minimal Image Package',
					enabled: true,
					coreId: 'core-0',
					images: [
						{
							id: 'img-1',
							name: 'Image',
							locationType: 'hexAddress',
							locationAddress: '1000',
							slotSize: 4096,
							padHeader: false,
							path: '/path/app.bin',
							headerSize: 32,
							bootable: true,
							swapAlignment: '4',
							imageVersion: '1.0.0'
						}
					]
				}
			];

			const result =
				formatApplicationPackagesPersistencePayload(packages);
			const image = result[0].Images![0];

			expect(image.SecurityCounter).to.equal('auto');
			expect(image).to.not.have.property('AesKwKeyPath');
			expect(image).to.not.have.property('AesGcmKeyPath');
		});

		it('should persist coreId when provided', () => {
			const packages: ApplicationPackage[] = [
				{
					id: 'pkg-1',
					name: 'Package With Core',
					enabled: true,
					coreId: 'core-0',
					images: [
						{
							id: 'img-1',
							name: 'Image',
							locationType: 'hexAddress',
							locationAddress: '1000',
							slotSize: 4096,
							padHeader: false,
							path: '/path/app.bin',
							headerSize: 32,
							bootable: true,
							swapAlignment: '4',
							imageVersion: '1.0.0'
						}
					]
				}
			];

			const result =
				formatApplicationPackagesPersistencePayload(packages);

			expect(result[0].CoreId).to.equal('core-0');
		});

		it('should always persist CoreId', () => {
			const packages: ApplicationPackage[] = [
				{
					id: 'pkg-1',
					name: 'Package Without Core',
					enabled: true,
					coreId: '',
					images: [
						{
							id: 'img-1',
							name: 'Image',
							locationType: 'hexAddress',
							locationAddress: '1000',
							slotSize: 4096,
							padHeader: false,
							path: '/path/app.bin',
							headerSize: 32,
							bootable: true,
							swapAlignment: '4',
							imageVersion: '1.0.0'
						}
					]
				}
			];

			const result =
				formatApplicationPackagesPersistencePayload(packages);

			expect(result[0].CoreId).to.equal('');
		});

		it('should persist locationAddress with 0x prefix', () => {
			const packages: ApplicationPackage[] = [
				{
					id: 'pkg-1',
					name: 'Hex Prefix Package',
					enabled: true,
					coreId: 'core-0',
					images: [
						{
							id: 'img-1',
							name: 'Image',
							locationType: 'hexAddress',
							locationAddress: '08000000',
							slotSize: 4096,
							padHeader: false,
							path: '/path/app.bin',
							headerSize: 32,
							bootable: true,
							swapAlignment: '4',
							imageVersion: '1.0.0'
						}
					]
				}
			];

			const result =
				formatApplicationPackagesPersistencePayload(packages);
			const image = result[0].Images![0];

			expect(image.LocationAddress).to.equal('0x08000000');
		});

		it('should persist package-level version and securityCounter when multiple images', () => {
			const packages: ApplicationPackage[] = [
				{
					id: 'pkg-1',
					name: 'Versioned Package',
					enabled: true,
					coreId: 'core-0',
					version: '3.1.0',
					securityCounter: 15,
					images: [
						{
							id: 'img-1',
							name: 'Image 1',
							locationType: 'hexAddress',
							locationAddress: '1000',
							slotSize: 4096,
							padHeader: false,
							path: '/path/app1.bin',
							headerSize: 32,
							bootable: true,
							swapAlignment: '4',
							imageVersion: '1.0.0'
						},
						{
							id: 'img-2',
							name: 'Image 2',
							locationType: 'hexAddress',
							locationAddress: '2000',
							slotSize: 4096,
							padHeader: false,
							path: '/path/app2.bin',
							headerSize: 32,
							bootable: true,
							swapAlignment: '4',
							imageVersion: '1.0.0'
						}
					]
				}
			];

			const result =
				formatApplicationPackagesPersistencePayload(packages);

			expect(result[0].Version).to.equal('3.1.0');
			expect(result[0].SecurityCounter).to.equal(15);
		});

		it('should not persist package-level version and securityCounter with single image', () => {
			const packages: ApplicationPackage[] = [
				{
					id: 'pkg-1',
					name: 'Single Image Package',
					enabled: true,
					coreId: 'core-0',
					version: '3.1.0',
					securityCounter: 15,
					images: [
						{
							id: 'img-1',
							name: 'Image 1',
							locationType: 'hexAddress',
							locationAddress: '1000',
							slotSize: 4096,
							padHeader: false,
							path: '/path/app1.bin',
							headerSize: 32,
							bootable: true,
							swapAlignment: '4',
							imageVersion: '1.0.0'
						}
					]
				}
			];

			const result =
				formatApplicationPackagesPersistencePayload(packages);

			expect(result[0]).to.not.have.property('Version');
			expect(result[0]).to.not.have.property('SecurityCounter');
		});

		it('should persist package SecurityCounter as auto when undefined with multiple images', () => {
			const packages: ApplicationPackage[] = [
				{
					id: 'pkg-1',
					name: 'No Counter Package',
					enabled: true,
					coreId: '',
					images: [
						{
							id: 'img-1',
							name: 'Image 1',
							locationType: 'hexAddress',
							locationAddress: '1000',
							slotSize: 4096,
							padHeader: false,
							path: '/path/app1.bin',
							headerSize: 32,
							bootable: true,
							swapAlignment: '4',
							imageVersion: '1.0.0'
						},
						{
							id: 'img-2',
							name: 'Image 2',
							locationType: 'hexAddress',
							locationAddress: '2000',
							slotSize: 4096,
							padHeader: false,
							path: '/path/app2.bin',
							headerSize: 32,
							bootable: true,
							swapAlignment: '4',
							imageVersion: '1.0.0'
						}
					]
				}
			];

			const result =
				formatApplicationPackagesPersistencePayload(packages);

			expect(result[0].Version).to.equal('');
			expect(result[0].SecurityCounter).to.equal('auto');
		});

		it('should not persist package-level version and securityCounter for non-primary cores', () => {
			const mockConfig = {
				Soc: 'TEST',
				BoardName: 'TEST',
				Package: 'TEST',
				Projects: [
					{
						CoreId: 'NSS-HiFi5s',
						ProjectId: 'NSS-HiFi5s',
						FirmwarePlatform: '',
						ExternallyManaged: true,
						Partitions: [],
						Peripherals: [],
						PluginId: '',
						Secure: false
					}
				]
			} as unknown as CfsConfig;

			const mockCores = [
				{
					Id: 'CM55',
					Name: 'Primary',
					Description: 'Primary Core',
					CoreNum: 0,
					IsPrimary: true,
					Family: 'Test',
					Memory: []
				},
				{
					Id: 'NSS-HiFi5s',
					Name: 'Non-Primary',
					Description: 'Non-Primary Core',
					CoreNum: 1,
					IsPrimary: false,
					Family: 'Test',
					Memory: []
				}
			];

			const mockDataModel = {
				Cores: mockCores
			};

			initializeSocCores(mockCores);
			initializeConfigDict(mockConfig, mockDataModel);

			const packages: ApplicationPackage[] = [
				{
					id: 'pkg-1',
					name: 'Non-Primary Package',
					enabled: true,
					coreId: 'NSS-HiFi5s',
					version: '1.0.0',
					securityCounter: 5,
					images: [
						{
							id: 'img-1',
							name: 'Image 1',
							locationType: 'hexAddress',
							locationAddress: '1000',
							slotSize: 4096,
							padHeader: false,
							path: '/path/app1.bin',
							headerSize: 32,
							bootable: true,
							swapAlignment: '4',
							imageVersion: '1.0.0'
						},
						{
							id: 'img-2',
							name: 'Image 2',
							locationType: 'hexAddress',
							locationAddress: '2000',
							slotSize: 4096,
							padHeader: false,
							path: '/path/app2.bin',
							headerSize: 32,
							bootable: true,
							swapAlignment: '4',
							imageVersion: '1.0.0'
						}
					]
				}
			];

			const result =
				formatApplicationPackagesPersistencePayload(packages);

			expect(result[0]).to.not.have.property('Version');
			expect(result[0]).to.not.have.property('SecurityCounter');

			resetConfigDict();
			resetCoreDict();
		});
	});

	describe('applyPersistedSettings', () => {
		it('should return defaults when settings is undefined', () => {
			const result = applyPersistedSettings(undefined);

			expect(result.mcubootEnableState).to.equal('default');
			expect(result.signingKeys).to.deep.equal([]);
		});

		it('should return defaults when Settings has no MCUBoot', () => {
			const result = applyPersistedSettings({});

			expect(result.mcubootEnableState).to.equal('default');
			expect(result.signingKeys).to.deep.equal([]);
		});

		it('should convert PascalCase settings to camelCase', () => {
			const settings: CfsSettings = {
				MCUBoot: {EnableState: 'enabled'},
				SigningKeys: [
					{
						Name: 'key.pem',
						Path: '/path/key.pem',
						Algorithm: 'ecdsa-p256',
						Description: 'Desc'
					}
				]
			};

			const result = applyPersistedSettings(settings);

			expect(result.mcubootEnableState).to.equal('enabled');
			expect(result.signingKeys).to.have.length(1);
			expect(result.signingKeys[0].name).to.equal('key.pem');
			expect(result.signingKeys[0].path).to.equal('/path/key.pem');
			expect(result.signingKeys[0].algorithm).to.equal('ecdsa-p256');
			expect(result.signingKeys[0].description).to.equal('Desc');
		});
	});

	describe('applyPersistedApplicationPackages', () => {
		it('should return empty array when packages is undefined', () => {
			const result = applyPersistedApplicationPackages(undefined);
			expect(result).to.deep.equal([]);
		});

		it('should add UUIDs and convert PascalCase to camelCase', () => {
			const packages: ConfiguredApplicationPackage[] = [
				{
					Name: 'Pkg',
					Enabled: true,
					CoreId: 'core-0',
					Images: [
						{
							Name: 'Image',
							LocationType: 'hexAddress',
							LocationAddress: '0x1000',
							SlotSize: 4096,
							PadHeader: false,
							Path: '/path/app.bin',
							HeaderSize: 32,
							Bootable: true,
							SwapAlignment: '4',
							ImageVersion: '1.0.0'
						}
					]
				}
			];

			const result = applyPersistedApplicationPackages(packages);

			expect(result).to.have.length(1);
			// Verify UUID was generated
			expect(result[0].id).to.be.a('string');
			expect(result[0].id.length).to.be.greaterThan(0);
			expect(result[0].name).to.equal('Pkg');
			expect(result[0].enabled).to.equal(true);

			// Verify image UUID
			expect(result[0].images).to.have.length(1);
			expect(result[0].images![0].id).to.be.a('string');
			expect(result[0].images![0].id.length).to.be.greaterThan(0);
			expect(result[0].images![0].name).to.equal('Image');
			expect(result[0].images![0].locationType).to.equal(
				'hexAddress'
			);
			expect(result[0].images![0].locationAddress).to.equal('1000');
			expect(result[0].images![0].slotSize).to.equal(4096);
		});

		it('should handle image custom TLVs with UUID generation', () => {
			const packages: ConfiguredApplicationPackage[] = [
				{
					Name: 'Pkg',
					Enabled: true,
					Images: [
						{
							Name: 'Image',
							LocationType: 'hexAddress',
							LocationAddress: '0x1000',
							SlotSize: 4096,
							PadHeader: false,
							Path: '/path/app.bin',
							HeaderSize: 32,
							Bootable: true,
							SwapAlignment: '4',
							ImageVersion: '1.0.0',
							CustomTLVs: [
								{
									Name: 'TLV1',
									Tag: 0xff,
									Value: 'test'
								}
							]
						}
					]
				}
			];

			const result = applyPersistedApplicationPackages(packages);

			const imgTlvs = result[0].images![0].customTLVs!;
			expect(imgTlvs).to.have.length(1);
			expect(imgTlvs[0].id).to.be.a('string');
			expect(imgTlvs[0].name).to.equal('TLV1');
			expect(imgTlvs[0].tag).to.equal(0xff);
			expect(imgTlvs[0].value).to.equal('test');
		});

		it('should deserialize securityCounter, aesKwKeyPath, and aesGcmKeyPath', () => {
			const packages: ConfiguredApplicationPackage[] = [
				{
					Name: 'Pkg',
					Enabled: true,
					Images: [
						{
							Name: 'Image',
							LocationType: 'hexAddress',
							LocationAddress: '0x1000',
							SlotSize: 4096,
							PadHeader: false,
							Path: '/path/app.bin',
							HeaderSize: 32,
							Bootable: true,
							SwapAlignment: '4',
							ImageVersion: '1.0.0',
							SecurityCounter: 10,
							AesKwKeyPath: '/keys/aes-kw.bin',
							AesGcmKeyPath: '/keys/aes-gcm.bin'
						}
					]
				}
			];

			const result = applyPersistedApplicationPackages(packages);
			const img = result[0].images![0];

			expect(img.securityCounter).to.equal(10);
			expect(img.aesKwKeyPath).to.equal('/keys/aes-kw.bin');
			expect(img.aesGcmKeyPath).to.equal('/keys/aes-gcm.bin');
		});

		it('should set securityCounter to undefined when SecurityCounter is auto', () => {
			const packages: ConfiguredApplicationPackage[] = [
				{
					Name: 'Pkg',
					Enabled: true,
					Images: [
						{
							Name: 'Image',
							LocationType: 'hexAddress',
							LocationAddress: '0x1000',
							SlotSize: 4096,
							PadHeader: false,
							Path: '/path/app.bin',
							HeaderSize: 32,
							Bootable: true,
							SwapAlignment: '4',
							ImageVersion: '1.0.0',
							SecurityCounter: 'auto'
						}
					]
				}
			];

			const result = applyPersistedApplicationPackages(packages);
			const img = result[0].images![0];

			expect(img.securityCounter).to.equal(undefined);
		});

		it('should deserialize CoreId', () => {
			const packages: ConfiguredApplicationPackage[] = [
				{
					Name: 'Pkg',
					Enabled: true,
					CoreId: 'core-0',
					Images: [
						{
							Name: 'Image',
							LocationType: 'hexAddress',
							LocationAddress: '0x1000',
							SlotSize: 4096,
							PadHeader: false,
							Path: '/path/app.bin',
							HeaderSize: 32,
							Bootable: true,
							SwapAlignment: '4',
							ImageVersion: '1.0.0'
						}
					]
				}
			];

			const result = applyPersistedApplicationPackages(packages);

			expect(result[0].coreId).to.equal('core-0');
		});

		it('should default coreId to empty string when CoreId is empty', () => {
			const packages: ConfiguredApplicationPackage[] = [
				{
					Name: 'Pkg',
					Enabled: true,
					CoreId: '',
					Images: [
						{
							Name: 'Image',
							LocationType: 'hexAddress',
							LocationAddress: '0x1000',
							SlotSize: 4096,
							PadHeader: false,
							Path: '/path/app.bin',
							HeaderSize: 32,
							Bootable: true,
							SwapAlignment: '4',
							ImageVersion: '1.0.0'
						}
					]
				}
			];

			const result = applyPersistedApplicationPackages(packages);

			expect(result[0].coreId).to.equal('');
		});

		it('should deserialize package-level version and securityCounter', () => {
			const packages: ConfiguredApplicationPackage[] = [
				{
					Name: 'Pkg',
					Enabled: true,
					CoreId: 'core-0',
					Version: '4.2.0',
					SecurityCounter: 20
				}
			];

			const result = applyPersistedApplicationPackages(packages);

			expect(result[0].version).to.equal('4.2.0');
			expect(result[0].securityCounter).to.equal(20);
		});

		it('should set package securityCounter to undefined when SecurityCounter is auto', () => {
			const packages: ConfiguredApplicationPackage[] = [
				{
					Name: 'Pkg',
					Enabled: true,
					SecurityCounter: 'auto'
				}
			];

			const result = applyPersistedApplicationPackages(packages);

			expect(result[0].securityCounter).to.equal(undefined);
		});

		it('should strip 0x prefix from locationAddress during deserialization', () => {
			const packages: ConfiguredApplicationPackage[] = [
				{
					Name: 'Pkg',
					Enabled: true,
					Images: [
						{
							Name: 'Image',
							LocationType: 'hexAddress',
							LocationAddress: '0xABCD1234',
							SlotSize: 4096,
							PadHeader: false,
							Path: '/path/app.bin',
							HeaderSize: 32,
							Bootable: true,
							SwapAlignment: '4',
							ImageVersion: '1.0.0'
						}
					]
				}
			];

			const result = applyPersistedApplicationPackages(packages);
			const img = result[0].images![0];

			expect(img.locationAddress).to.equal('ABCD1234');
		});
	});

	describe('round-trip: format then apply', () => {
		it('should preserve data through serialization/deserialization', () => {
			const originalKeys: KeyData[] = [
				{
					name: 'prod-key.pem',
					path: '/keys/prod-key.pem',
					algorithm: 'rsa-3072',
					description: 'Production key'
				}
			];

			const originalPackages: ApplicationPackage[] = [
				{
					id: 'original-id',
					name: 'Deploy Package',
					description: 'For deployment',
					enabled: true,
					coreId: 'core-0',
					version: '2.0.0',
					securityCounter: 7,
					signKey: '/keys/prod-key.pem',
					images: [
						{
							id: 'original-img-id',
							name: 'Firmware',
							locationType: 'hexAddress',
							locationAddress: '08000000',
							slotSize: 262144,
							slotSizeUnit: 'KB',
							padHeader: true,
							path: '/build/firmware.bin',
							headerSize: 1024,
							headerSizeUnit: 'bytes',
							bootable: true,
							swapAlignment: '4',
							imageVersion: '2.0.0',
							securityCounter: 5,
							aesKwKeyPath: '/keys/aes-kw.bin',
							aesGcmKeyPath: '/keys/aes-gcm.bin',
							customTLVs: [
								{
									id: 'original-tlv-id',
									name: 'Version TLV',
									tag: 0x0010,
									value: '0xABCD'
								}
							]
						},
						{
							id: 'original-img-id-2',
							name: 'Bootloader',
							locationType: 'hexAddress',
							locationAddress: '09000000',
							slotSize: 131072,
							padHeader: false,
							path: '/build/bootloader.bin',
							headerSize: 512,
							bootable: true,
							swapAlignment: '4',
							imageVersion: '2.0.0'
						}
					]
				}
			];

			// Serialize
			const serializedSettings = formatSettingsPersistencePayload(
				'enabled',
				originalKeys
			);
			const serializedPackages =
				formatApplicationPackagesPersistencePayload(originalPackages);

			// Deserialize
			const {mcubootEnableState, signingKeys} =
				applyPersistedSettings(serializedSettings);
			const restoredPackages = applyPersistedApplicationPackages(
				serializedPackages
			);

			// Verify settings round-trip
			expect(mcubootEnableState).to.equal('enabled');
			expect(signingKeys[0].name).to.equal('prod-key.pem');
			expect(signingKeys[0].path).to.equal('/keys/prod-key.pem');
			expect(signingKeys[0].algorithm).to.equal('rsa-3072');
			expect(signingKeys[0].description).to.equal('Production key');

			// Verify packages round-trip (id will be different)
			expect(restoredPackages[0].name).to.equal('Deploy Package');
			expect(restoredPackages[0].description).to.equal(
				'For deployment'
			);
			expect(restoredPackages[0].enabled).to.equal(true);
			expect(restoredPackages[0].version).to.equal('2.0.0');
			expect(restoredPackages[0].securityCounter).to.equal(7);
			expect(restoredPackages[0].signKey).to.equal(
				'/keys/prod-key.pem'
			);

			// Verify image round-trip
			const img = restoredPackages[0].images![0];
			expect(img.name).to.equal('Firmware');
			expect(img.locationAddress).to.equal('08000000');
			expect(img.slotSize).to.equal(262144);
			expect(img.slotSizeUnit).to.equal('KB');
			expect(img.headerSize).to.equal(1024);
			expect(img.headerSizeUnit).to.equal('bytes');
			expect(img.imageVersion).to.equal('2.0.0');
			expect(img.bootable).to.equal(true);
			expect(img.securityCounter).to.equal(5);
			expect(img.aesKwKeyPath).to.equal('/keys/aes-kw.bin');
			expect(img.aesGcmKeyPath).to.equal('/keys/aes-gcm.bin');

			// Verify TLV round-trip
			const tlv = img.customTLVs![0];
			expect(tlv.name).to.equal('Version TLV');
			expect(tlv.tag).to.equal(0x0010);
			expect(tlv.value).to.equal('0xABCD');
		});
	});
});
