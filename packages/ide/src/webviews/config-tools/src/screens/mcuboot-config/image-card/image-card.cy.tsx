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

import type {Soc} from '../../../../../common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import {
	addApplicationPackage,
	setActivePackageId
} from '../../../state/slices/application-packages/applicationPackages.reducer';
import {addSigningKey} from '../../../state/slices/app-context/appContext.reducer';
import {LocalizationProvider} from '../../../../../common/contexts/LocaleContext';
import type {
	ApplicationPackage,
	CustomTLV,
	Image
} from '../../../types/application-packages';
import type {KeyData} from '../../../types/workspace-settings';
import {INHERIT_VALUE} from '../application-packages/assign-sign-key/assign-sign-key';
import ImageCard from './image-card';

const soc = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

const mockImageEditableField: Image = {
	id: 'img-1',
	name: '',
	description: '',
	locationType: 'hexAddress',
	locationAddress: '30000',
	slotSize: 4096,
	path: '/path/to/binary/test.bin',
	headerSize: 512,
	padHeader: true,
	bootable: true,
	imageVersion: '1.0.0',
	swapAlignment: '4'
};
const mockImage: Image = {
	id: 'img-1',
	name: 'Test Image',
	description: 'A test image description',
	locationType: 'hexAddress',
	locationAddress: '30000',
	slotSize: 4096,
	path: '/path/to/binary/test.bin',
	headerSize: 512,
	padHeader: true,
	bootable: true,
	imageVersion: '1.0.0',
	swapAlignment: '4'
};

const mockImageWithError: Image = {
	id: 'img-error',
	name: 'Error Image',
	locationType: 'hexAddress',
	locationAddress: '',
	slotSize: 0,
	path: '',
	headerSize: 0,
	padHeader: false,
	bootable: false,
	imageVersion: '1.0.0',
	swapAlignment: '4'
};

const mockPackage: ApplicationPackage = {
	id: 'pkg-1',
	name: 'Test Package',
	description: 'A test package',
	enabled: true,
	coreId: '',
	images: [mockImage]
};

function mountImageCard(
	image: Image,
	pkg: ApplicationPackage,
	onDelete: (id: string) => void = cy.stub()
) {
	const reduxStore = configurePreloadedStore(soc);
	reduxStore.dispatch(addApplicationPackage(pkg));
	reduxStore.dispatch(setActivePackageId(pkg.id));

	cy.mount(
		<LocalizationProvider namespace='cfgtools'>
			<ImageCard image={image} onDelete={onDelete} />
		</LocalizationProvider>,
		reduxStore
	);

	return reduxStore;
}

function getImageFromStore(
	store: ReturnType<typeof configurePreloadedStore>,
	pkgId: string,
	imageId: string
) {
	const state = store.getState();
	const pkg =
		state.applicationPackagesReducer.applicationPackages.find(
			p => p.id === pkgId
		);

	return pkg?.images?.find(i => i.id === imageId);
}

describe('ImageCard', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
	});
	describe('rendering', () => {
		it('should render the image card', () => {
			mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}`).should('exist');
		});

		it('should display the image name', () => {
			mountImageCard(mockImage, mockPackage);

			cy.contains(mockImage.name).should('exist');
		});

		it('should display the image description', () => {
			mountImageCard(mockImage, mockPackage);

			cy.contains(mockImage.description!).should('exist');
		});

		it('should render the delete button', () => {
			mountImageCard(mockImage, mockPackage);

			cy.dataTest('delete-image').should('exist');
		});
	});

	describe('address range', () => {
		it('should display the address range when locationAddress and slotSize are valid', () => {
			mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}-address-range`)
				.should('exist')
				.and('contain.text', '0x30000')
				.and('contain.text', '0x31000');
		});

		it('should not display the address range when locationAddress is empty', () => {
			const imageNoAddress: Image = {
				...mockImage,
				id: 'img-no-addr',
				locationAddress: '',
				slotSize: 4096
			};

			const pkg: ApplicationPackage = {
				...mockPackage,
				images: [imageNoAddress]
			};

			mountImageCard(imageNoAddress, pkg);

			cy.dataTest(
				`image-card:${imageNoAddress.id}-address-range`
			).should('not.exist');
		});

		it('should not display the address range when slotSize is zero', () => {
			const imageNoSlot: Image = {
				...mockImage,
				id: 'img-no-slot',
				locationAddress: '30000',
				slotSize: 0
			};

			const pkg: ApplicationPackage = {
				...mockPackage,
				images: [imageNoSlot]
			};

			mountImageCard(imageNoSlot, pkg);

			cy.dataTest(
				`image-card:${imageNoSlot.id}-address-range`
			).should('not.exist');
		});
	});

	describe('validation', () => {
		it('should show conflict icon when image has validation errors', () => {
			const pkg: ApplicationPackage = {
				...mockPackage,
				id: 'pkg-error',
				images: [mockImageWithError]
			};

			mountImageCard(mockImageWithError, pkg);

			cy.dataTest('conflict-icon').should('exist');
		});

		it('should not show conflict icon when image is valid', () => {
			mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}-header`)
				.should('exist')
				.click();

			cy.dataTest('conflict-icon').should('not.exist');
		});

		it('should accept valid version format: single number (1)', () => {
			const reduxStore = mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}-header`)
				.should('exist')
				.click();

			cy.dataTest(
				`image:${mockImage.name}-image-version-control-input`
			)
				.shadow()
				.within(() => {
					cy.get('input').clear().type('1');
				});

			cy.then(() => {
				const img = getImageFromStore(
					reduxStore,
					mockPackage.id,
					mockImage.id
				);
				expect(img?.imageVersion).to.equal('1');
			});

			cy.dataTest('conflict-icon').should('not.exist');
		});

		it('should accept valid version format: major.minor (1.0)', () => {
			const reduxStore = mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}-header`)
				.should('exist')
				.click();

			cy.dataTest(
				`image:${mockImage.name}-image-version-control-input`
			)
				.shadow()
				.within(() => {
					cy.get('input').clear().type('1.0');
				});

			cy.then(() => {
				const img = getImageFromStore(
					reduxStore,
					mockPackage.id,
					mockImage.id
				);
				expect(img?.imageVersion).to.equal('1.0');
			});

			cy.dataTest('conflict-icon').should('not.exist');
		});

		it('should show error for invalid version format with text', () => {
			mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}-header`)
				.should('exist')
				.click();

			cy.dataTest(
				`image:${mockImage.name}-image-version-control-input`
			)
				.shadow()
				.within(() => {
					cy.get('input').clear().type('abc');
				});

			cy.dataTest('conflict-icon').should('exist');
		});
	});

	describe('delete', () => {
		it('should call onDelete with the image id when delete button is clicked', () => {
			const onDelete = cy.stub().as('onDelete');

			mountImageCard(mockImage, mockPackage, onDelete);

			cy.dataTest('delete-image').click();

			cy.get('@onDelete').should(
				'have.been.calledOnceWith',
				mockImage.id
			);
		});
	});

	describe('editing name', () => {
		it('should enter edit mode when clicking the name', () => {
			mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}-name`).click();

			cy.dataTest('edit-image-name-control-input').should('exist');
		});

		it('should update the image name on confirm', () => {
			const reduxStore = mountImageCard(
				mockImageEditableField,
				mockPackage
			);

			cy.dataTest(
				`image-card:${mockImageEditableField.id}-name`
			).click();

			cy.dataTest('edit-image-name-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('Updated name');
				});

			cy.dataTest('edit-input-confirm-btn').click();

			cy.then(() => {
				const img = getImageFromStore(
					reduxStore,
					mockPackage.id,
					mockImageEditableField.id
				);
				expect(img?.name).to.equal('Updated name');
			});
		});

		it('should discard changes and exit edit mode on cancel', () => {
			const reduxStore = mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}-name`).click();

			cy.dataTest('edit-image-name-control-input')
				.shadow()
				.within(() => {
					cy.get('input').clear().type('Discarded Name');
				});

			cy.dataTest('edit-input-cancel-btn').click();

			cy.dataTest('edit-image-name-control-input').should(
				'not.exist'
			);
			cy.contains(mockImage.name).should('exist');

			cy.then(() => {
				const img = getImageFromStore(
					reduxStore,
					mockPackage.id,
					mockImage.id
				);
				expect(img?.name).to.equal(mockImage.name);
			});
		});

		it('should enforce a maximum character limit of 50 on the name field', () => {
			mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}-name`).click();

			cy.dataTest('edit-image-name-control-input')
				.shadow()
				.find('input')
				.should('have.attr', 'maxlength', '50');
		});
	});

	describe('editing description', () => {
		it('should enter edit mode when clicking the description', () => {
			mountImageCard(mockImageEditableField, mockPackage);

			cy.dataTest(
				`image-card:${mockImageEditableField.id}-description`
			).click();

			cy.dataTest('edit-image-description-control-input').should(
				'exist'
			);
		});

		it('should update the image description on confirm', () => {
			const reduxStore = mountImageCard(
				mockImageEditableField,
				mockPackage
			);

			cy.dataTest(
				`image-card:${mockImageEditableField.id}-description`
			).click();

			cy.dataTest('edit-image-description-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('Updated Description');
				});

			cy.dataTest('edit-input-confirm-btn').click();

			cy.then(() => {
				const img = getImageFromStore(
					reduxStore,
					mockPackage.id,
					mockImageEditableField.id
				);
				expect(img?.description).to.equal('Updated Description');
			});
		});

		it('should discard changes and exit edit mode on cancel', () => {
			const reduxStore = mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}-description`).click();

			cy.dataTest('edit-image-description-control-input')
				.shadow()
				.within(() => {
					cy.get('input').clear().type('Discarded Description');
				});

			cy.dataTest('edit-input-cancel-btn').click();

			cy.dataTest('edit-image-description-control-input').should(
				'not.exist'
			);
			cy.contains(mockImage.description!).should('exist');

			cy.then(() => {
				const img = getImageFromStore(
					reduxStore,
					mockPackage.id,
					mockImage.id
				);
				expect(img?.description).to.equal(mockImage.description);
			});
		});
	});

	describe('updating fields', () => {
		it('should update the location address in the store', () => {
			const reduxStore = mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}-header`)
				.should('exist')
				.click();

			cy.dataTest(`image:${mockImage.name}-location-address`)
				.find('input')
				.clear()
				.type('50000');

			cy.then(() => {
				const img = getImageFromStore(
					reduxStore,
					mockPackage.id,
					mockImage.id
				);
				expect(img?.locationAddress).to.equal('50000');
			});
		});

		it('should update the path in the store', () => {
			const reduxStore = mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}-header`)
				.should('exist')
				.click();

			cy.dataTest(`image:${mockImage.name}-path-control-input`)
				.shadow()
				.within(() => {
					cy.get('input').clear().type('/new/path/to/binary');
				});

			cy.then(() => {
				const img = getImageFromStore(
					reduxStore,
					mockPackage.id,
					mockImage.id
				);
				expect(img?.path).to.equal('/new/path/to/binary');
			});
		});

		it('should update the image version in the store', () => {
			const reduxStore = mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}-header`)
				.should('exist')
				.click();

			cy.dataTest(
				`image:${mockImage.name}-image-version-control-input`
			)
				.shadow()
				.within(() => {
					cy.get('input').clear().type('2.0.0');
				});

			cy.then(() => {
				const img = getImageFromStore(
					reduxStore,
					mockPackage.id,
					mockImage.id
				);
				expect(img?.imageVersion).to.equal('2.0.0');
			});
		});

		it('should toggle the bootable checkbox in the store', () => {
			const reduxStore = mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}-header`)
				.should('exist')
				.click();

			cy.dataTest('image-bootable').click();

			cy.then(() => {
				const img = getImageFromStore(
					reduxStore,
					mockPackage.id,
					mockImage.id
				);
				expect(img?.bootable).to.equal(false);
			});
		});

		it('should update the custom arguments in the store', () => {
			const reduxStore = mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}-header`)
				.should('exist')
				.click();

			cy.dataTest('image-custom-arguments-control-input')
				.shadow()
				.within(() => {
					cy.get('input').clear().type('--confirm --pad');
				});

			cy.then(() => {
				const img = getImageFromStore(
					reduxStore,
					mockPackage.id,
					mockImage.id
				);
				expect(img?.customArguments).to.equal('--confirm --pad');
			});
		});

		it('should enforce a maximum character limit of 255 on the image version field', () => {
			mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}-header`)
				.should('exist')
				.click();

			cy.dataTest(
				`image:${mockImage.name}-image-version-control-input`
			)
				.shadow()
				.find('input')
				.should('have.attr', 'maxlength', '255');
		});

		it('should enforce a maximum character limit of 255 on the custom arguments field', () => {
			mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}-header`)
				.should('exist')
				.click();

			cy.dataTest('image-custom-arguments-control-input')
				.shadow()
				.find('input')
				.should('have.attr', 'maxlength', '255');
		});

		it('should render the AES KW Key field', () => {
			mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}-header`)
				.should('exist')
				.click();

			cy.dataTest('image-aes-kw-key-path-control-input').should(
				'exist'
			);
		});

		it('should render the AES GCM Key field', () => {
			mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}-header`)
				.should('exist')
				.click();

			cy.dataTest('image-aes-gcm-key-path-control-input').should(
				'exist'
			);
		});

		it('should update the AES KW Key path in the store', () => {
			const reduxStore = mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}-header`)
				.should('exist')
				.click();

			cy.dataTest('image-aes-kw-key-path-control-input')
				.shadow()
				.find('input')
				.type('/keys/aes-kw.bin');

			cy.then(() => {
				const img = getImageFromStore(
					reduxStore,
					mockPackage.id,
					mockImage.id
				);
				expect(img?.aesKwKeyPath).to.equal('/keys/aes-kw.bin');
			});
		});

		it('should update the AES GCM Key path in the store', () => {
			const reduxStore = mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}-header`)
				.should('exist')
				.click();

			cy.dataTest('image-aes-gcm-key-path-control-input')
				.shadow()
				.find('input')
				.type('/keys/aes-gcm.bin');

			cy.then(() => {
				const img = getImageFromStore(
					reduxStore,
					mockPackage.id,
					mockImage.id
				);
				expect(img?.aesGcmKeyPath).to.equal('/keys/aes-gcm.bin');
			});
		});

		it('should update image signKey in store when selecting a key from the dropdown', () => {
			const mockKey: KeyData = {
				name: 'test-key.pem',
				path: '/path/to/test-key.pem',
				algorithm: 'RSA-2048'
			};

			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(addApplicationPackage(mockPackage));
			reduxStore.dispatch(setActivePackageId(mockPackage.id));
			reduxStore.dispatch(addSigningKey(mockKey));

			cy.mount(
				<LocalizationProvider namespace='cfgtools'>
					<ImageCard image={mockImage} onDelete={cy.stub()} />
				</LocalizationProvider>,
				reduxStore
			);

			cy.dataTest(`image-card:${mockImage.id}-header`)
				.should('exist')
				.click();

			cy.get('#assign-sign-key-controlDropdown')
				.scrollIntoView()
				.should('be.visible')
				.click();

			cy.get('#assign-sign-key-controlDropdown')
				.find('> vscode-option')
				.contains(mockKey.name)
				.click();

			cy.then(() => {
				const img = getImageFromStore(
					reduxStore,
					mockPackage.id,
					mockImage.id
				);
				expect(img?.signKey).to.equal(mockKey.path);
			});
		});

		it('should clear signKey when selecting No key from the dropdown', () => {
			const mockKey: KeyData = {
				name: 'test-key.pem',
				path: '/path/to/test-key.pem',
				algorithm: 'RSA-2048'
			};

			const imageWithKey: Image = {
				...mockImage,
				signKey: mockKey.path
			};

			const pkgWithKeyImage: ApplicationPackage = {
				...mockPackage,
				images: [imageWithKey]
			};

			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(addApplicationPackage(pkgWithKeyImage));
			reduxStore.dispatch(setActivePackageId(pkgWithKeyImage.id));
			reduxStore.dispatch(addSigningKey(mockKey));

			cy.mount(
				<LocalizationProvider namespace='cfgtools'>
					<ImageCard image={imageWithKey} onDelete={cy.stub()} />
				</LocalizationProvider>,
				reduxStore
			);

			cy.dataTest(`image-card:${imageWithKey.id}-header`)
				.should('be.visible')
				.click();

			cy.get('#assign-sign-key-controlDropdown')
				.scrollIntoView()
				.should('be.visible')
				.click();

			cy.get('#assign-sign-key-controlDropdown')
				.find('> vscode-option')
				.contains('No key')
				.click();

			cy.then(() => {
				const img = getImageFromStore(
					reduxStore,
					pkgWithKeyImage.id,
					imageWithKey.id
				);
				expect(img?.signKey).to.equal(undefined);
			});
		});

		it('should set signKey to inherit sentinel when selecting Inherit from parent', () => {
			const mockKey: KeyData = {
				name: 'test-key.pem',
				path: '/path/to/test-key.pem',
				algorithm: 'RSA-2048'
			};

			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(addApplicationPackage(mockPackage));
			reduxStore.dispatch(setActivePackageId(mockPackage.id));
			reduxStore.dispatch(addSigningKey(mockKey));

			cy.mount(
				<LocalizationProvider namespace='cfgtools'>
					<ImageCard image={mockImage} onDelete={cy.stub()} />
				</LocalizationProvider>,
				reduxStore
			);

			cy.dataTest(`image-card:${mockImage.id}-header`)
				.should('exist')
				.click();

			cy.get('#assign-sign-key-controlDropdown')
				.scrollIntoView()
				.should('be.visible')
				.click();

			cy.get('#assign-sign-key-controlDropdown')
				.find('> vscode-option')
				.contains('Inherit from parent')
				.click();

			cy.then(() => {
				const img = getImageFromStore(
					reduxStore,
					mockPackage.id,
					mockImage.id
				);
				expect(img?.signKey).to.equal(INHERIT_VALUE);
			});
		});

		it('should update the security counter in the store', () => {
			const reduxStore = mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}-header`)
				.should('exist')
				.click();

			cy.dataTest('image-security-counter-control-input')
				.shadow()
				.find('input')
				.type('42');

			cy.then(() => {
				const img = getImageFromStore(
					reduxStore,
					mockPackage.id,
					mockImage.id
				);
				expect(img?.securityCounter).to.equal(42);
			});
		});

		it('should only allow numeric input for security counter', () => {
			const reduxStore = mountImageCard(mockImage, mockPackage);

			cy.dataTest(`image-card:${mockImage.id}-header`)
				.should('exist')
				.click();

			cy.dataTest('image-security-counter-control-input')
				.shadow()
				.find('input')
				.type('abc123def');

			cy.then(() => {
				const img = getImageFromStore(
					reduxStore,
					mockPackage.id,
					mockImage.id
				);
				expect(img?.securityCounter).to.equal(123);
			});
		});
	});

	describe('image custom TLV duplicate tag validation', () => {
		const baseTLV: CustomTLV = {
			id: 'img-tlv-1',
			name: 'Image TLV 1',
			tag: 0x00a0,
			value: '0x0A0B'
		};

		const duplicateTLV: CustomTLV = {
			id: 'img-tlv-2',
			name: 'Image TLV 2',
			tag: 0x00a0,
			value: '0xCCDD'
		};

		it('should show conflict icon on image TLV when another image TLV has the same tag', () => {
			const imageWithDuplicateTlvs: Image = {
				...mockImage,
				customTLVs: [baseTLV, duplicateTLV]
			};

			const pkg: ApplicationPackage = {
				...mockPackage,
				images: [imageWithDuplicateTlvs]
			};

			mountImageCard(imageWithDuplicateTlvs, pkg);

			cy.dataTest(`image-card:${mockImage.id}-header`)
				.should('exist')
				.click();

			cy.dataTest('conflict-icon').should('exist');
		});

		it('should not show conflict icon on image TLV when a TLV in a different image has the same tag', () => {
			const testTLV: CustomTLV = {
				id: 'testTlv',
				name: 'Other Image TLV',
				tag: baseTLV.tag,
				value: '0xEEFF'
			};

			const imageWithTlv: Image = {
				...mockImage,
				customTLVs: [baseTLV]
			};

			const additionalImage: Image = {
				id: 'img-2',
				name: 'Other Image',
				locationType: 'hexAddress',
				locationAddress: '40000',
				slotSize: 4096,
				path: '/path/to/other.bin',
				headerSize: 512,
				padHeader: true,
				bootable: true,
				imageVersion: '2.0.0',
				swapAlignment: '4',
				customTLVs: [testTLV]
			};

			const pkg: ApplicationPackage = {
				...mockPackage,
				images: [imageWithTlv, additionalImage]
			};

			mountImageCard(imageWithTlv, pkg);

			cy.dataTest(`image-card:${mockImage.id}-header`)
				.should('exist')
				.click();

			cy.dataTest('conflict-icon').should('not.exist');
		});

		it('should not show conflict icon on image TLVs with unique tags', () => {
			const uniqueTLV: CustomTLV = {
				id: 'img-tlv-unique',
				name: 'Unique TLV',
				tag: 999,
				value: '0xAABB'
			};

			const imageWithUniqueTlvs: Image = {
				...mockImage,
				customTLVs: [baseTLV, uniqueTLV]
			};

			const pkg: ApplicationPackage = {
				...mockPackage,
				images: [imageWithUniqueTlvs]
			};

			mountImageCard(imageWithUniqueTlvs, pkg);

			cy.dataTest(`image-card:${mockImage.id}-header`)
				.should('exist')
				.click();

			cy.dataTest('conflict-icon').should('not.exist');
		});
	});
});
