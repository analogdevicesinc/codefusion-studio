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
import {LocalizationProvider} from '../../../../../common/contexts/LocaleContext';
import ApplicationPackages from './application-packages';
import type {
	ApplicationPackage,
	CustomTLV,
	Image
} from '../../../types/application-packages';
import React from 'react';

import type {CfsConfig} from 'cfs-types';

const soc = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

const scrollContainerRef: React.RefObject<HTMLDivElement> =
	React.createRef();

function TestApplicationPackages() {
	return (
		<LocalizationProvider namespace='cfgtools'>
			<ApplicationPackages scrollContainerRef={scrollContainerRef} />
		</LocalizationProvider>
	);
}

const emptyMockPackage: ApplicationPackage = {
	id: 'app-pkg-1',
	name: '',
	description: '',
	enabled: true,
	coreId: ''
};

const mockPackage: ApplicationPackage = {
	id: 'app-pkg-1',
	name: 'Test Package',
	description: 'A test description',
	enabled: true,
	coreId: '',
	version: '1.0.0'
};

const mockImage: Image = {
	id: 'img-1',
	name: 'Image 1',
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

const mockImage2: Image = {
	id: 'img-2',
	name: 'Image 2',
	locationType: 'hexAddress',
	locationAddress: '40000',
	slotSize: 4096,
	path: '/path/to/binary/test2.bin',
	headerSize: 512,
	padHeader: true,
	bootable: true,
	imageVersion: '2.0.0',
	swapAlignment: '4'
};

const mockPackageWithImage: ApplicationPackage = {
	...mockPackage,
	id: 'app-pkg-img',
	images: [mockImage]
};

const mockPackageWithMultipleImages: ApplicationPackage = {
	...mockPackage,
	id: 'app-pkg-multi-img',
	images: [mockImage, mockImage2]
};

function createStoreWithActivePackage(pkg: ApplicationPackage) {
	const reduxStore = configurePreloadedStore(soc);
	reduxStore.dispatch(addApplicationPackage(pkg));
	reduxStore.dispatch(setActivePackageId(pkg.id));

	return reduxStore;
}

function getPackageFromStore(
	store: ReturnType<typeof configurePreloadedStore>,
	pkgId: string
) {
	const state = store.getState();

	return state.applicationPackagesReducer.applicationPackages.find(
		p => p.id === pkgId
	);
}

const configWithCores = {
	BoardName: 'AD-APARD32690-SL',
	Package: 'WLP',
	Soc: 'MAX32690',
	Projects: [
		{
			CoreNum: 0,
			Description: 'ARM Cortex-M4',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			IsPrimary: true,
			Name: 'ARM Cortex-M4',
			PluginId: '',
			Secure: false,
			ProjectId: 'CM4-proj',
			CoreId: 'CM4'
		},
		{
			CoreNum: 0,
			Description: 'Risc-V (RV32)',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			IsPrimary: true,
			Name: 'RISC-V (RV32)',
			PluginId: '',
			Secure: false,
			ProjectId: 'RV-proj',
			CoreId: 'RV'
		}
	]
} as unknown as CfsConfig;

function createStoreWithCoresAndActivePackage(
	pkg: ApplicationPackage
) {
	const reduxStore = configurePreloadedStore(soc, configWithCores);
	reduxStore.dispatch(addApplicationPackage(pkg));
	reduxStore.dispatch(setActivePackageId(pkg.id));

	return reduxStore;
}

const configWithNonPrimaryCore = {
	BoardName: 'AD-APARD32690-SL',
	Package: 'WLP',
	Soc: 'MAX32690',
	Projects: [
		{
			CoreNum: 0,
			Description: 'ARM Cortex-M4',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			IsPrimary: true,
			Name: 'ARM Cortex-M4',
			PluginId: '',
			Secure: false,
			ProjectId: 'CM4-proj',
			CoreId: 'CM4'
		},
		{
			CoreNum: 1,
			Description: 'Non-Primary Core',
			ExternallyManaged: true,
			FirmwarePlatform: '',
			IsPrimary: false,
			Name: 'Non-Primary Core',
			PluginId: '',
			Secure: false,
			ProjectId: 'NP-proj',
			CoreId: 'NONPRIMARY'
		}
	]
} as unknown as CfsConfig;

function createStoreWithNonPrimaryCoreAndActivePackage(
	pkg: ApplicationPackage
) {
	const reduxStore = configurePreloadedStore(
		soc,
		configWithNonPrimaryCore
	);
	reduxStore.dispatch(addApplicationPackage(pkg));
	reduxStore.dispatch(setActivePackageId(pkg.id));

	return reduxStore;
}

describe('ApplicationPackages', () => {
	describe('rendering', () => {
		it('should render the package name and description', () => {
			const reduxStore = createStoreWithActivePackage(mockPackage);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('mcuboot-config:app-packages-summary').should(
				'exist'
			);
			cy.contains(mockPackage.name).should('exist');
			cy.contains(mockPackage.description!).should('exist');
		});

		it('should display "Click to add a description" when description is empty', () => {
			const pkg: ApplicationPackage = {
				...mockPackage,
				id: 'no-desc-pkg',
				description: ''
			};
			const reduxStore = createStoreWithActivePackage(pkg);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.contains('Click to add a description').should('exist');
		});

		it('should render the Sign Key section', () => {
			const reduxStore = createStoreWithActivePackage(mockPackage);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest(
				'application-package-summary:assign-sign-key'
			).should('exist');
			cy.dataTest(
				'application-package-summary:assign-key-empty-state'
			).should('exist');
		});

		it('should render the NewAppPackage section when no images exist', () => {
			const reduxStore = createStoreWithActivePackage(mockPackage);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest(
				'application-package-summary:new-app-package'
			).should('exist');
			cy.dataTest(
				'application-package-summary:new-app-package:add-image-button'
			).should('exist');
		});

		it('should render image cards when images exist', () => {
			const reduxStore = createStoreWithActivePackage(
				mockPackageWithImage
			);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest(`image-card:${mockImage.id}`).should('exist');
		});
	});

	describe('toggle enabled state', () => {
		it('should toggle the application package enabled state', () => {
			const reduxStore = createStoreWithActivePackage(mockPackage);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('app-packages-summary:enabled-toggle-span')
				.should('exist')
				.click();

			cy.then(() => {
				const pkg = getPackageFromStore(reduxStore, mockPackage.id);
				expect(pkg?.enabled).to.equal(false);
			});
		});

		it('should re-enable a disabled package when toggled again', () => {
			const disabledPkg: ApplicationPackage = {
				...mockPackage,
				id: 'disabled-pkg',
				enabled: false
			};
			const reduxStore = createStoreWithActivePackage(disabledPkg);

			cy.mount(<TestApplicationPackages />, reduxStore);
			cy.dataTest('app-packages-summary:enabled-toggle-span')
				.should('exist')
				.click();

			cy.then(() => {
				const pkg = getPackageFromStore(reduxStore, disabledPkg.id);
				expect(pkg?.enabled).to.equal(true);
			});
		});
	});

	describe('remove package', () => {
		it('should remove the active package when clicking the delete button', () => {
			const reduxStore = createStoreWithActivePackage(mockPackage);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('app-packages-summary:remove-app-pack-button')
				.should('exist')
				.click();

			cy.dataTest('delete-app-pack-warning').should('exist');
			cy.dataTest('delete-app-pack-warning:confirm-btn')
				.should('exist')
				.click();

			cy.then(() => {
				const state = reduxStore.getState();
				expect(
					state.applicationPackagesReducer.applicationPackages
				).to.have.length(0);
			});
		});

		it('should set the next package as active after removing', () => {
			const secondPkg: ApplicationPackage = {
				id: 'app-pkg-2',
				name: 'Second Package',
				enabled: true,
				coreId: ''
			};

			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(addApplicationPackage(mockPackage));
			reduxStore.dispatch(addApplicationPackage(secondPkg));
			reduxStore.dispatch(setActivePackageId(mockPackage.id));

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('app-packages-summary:remove-app-pack-button')
				.should('exist')
				.click();

			cy.dataTest('delete-app-pack-warning').should('exist');
			cy.dataTest('delete-app-pack-warning:confirm-btn')
				.should('exist')
				.click();

			cy.then(() => {
				const state = reduxStore.getState();
				expect(
					state.applicationPackagesReducer.activePackageId
				).to.equal(secondPkg.id);
			});
		});
	});

	describe('editing package name', () => {
		it('should show the edit input when clicking the name edit button', () => {
			const reduxStore =
				createStoreWithActivePackage(emptyMockPackage);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('app-packages-summary:edit-name-trigger')
				.should('exist')
				.click();

			cy.dataTest('edit-package-name-control-input').should('exist');
		});

		it('should update the package name on confirm', () => {
			const reduxStore =
				createStoreWithActivePackage(emptyMockPackage);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('app-packages-summary:edit-name-trigger')
				.should('exist')
				.click();

			cy.dataTest('edit-package-name-control-input')
				.shadow()
				.within(() => {
					cy.get('input').clear().type('Updated Package Name');
				});

			cy.dataTest('edit-package-name-control-input').within(() => {
				cy.dataTest('edit-input-confirm-btn').click();
			});

			cy.then(() => {
				const pkg = getPackageFromStore(
					reduxStore,
					emptyMockPackage.id
				);
				expect(pkg?.name).to.equal('Updated Package Name');
			});
		});

		it('should discard changes and exit edit mode on cancel', () => {
			const reduxStore = createStoreWithActivePackage(mockPackage);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('app-packages-summary:edit-name-trigger')
				.should('exist')
				.click();

			cy.dataTest('edit-package-name-control-input')
				.shadow()
				.within(() => {
					cy.get('input').clear().type('Discarded Name');
				});

			cy.dataTest('edit-package-name-control-input').within(() => {
				cy.dataTest('edit-input-cancel-btn').click();
			});

			cy.dataTest('edit-package-name-control-input').should(
				'not.exist'
			);
			cy.contains(mockPackage.name).should('exist');

			cy.then(() => {
				const pkg = getPackageFromStore(reduxStore, mockPackage.id);
				expect(pkg?.name).to.equal(mockPackage.name);
			});
		});

		it('should enforce a maximum character limit of 50 on the name field', () => {
			const reduxStore = createStoreWithActivePackage(mockPackage);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('app-packages-summary:edit-name-trigger')
				.should('exist')
				.click();

			cy.dataTest('edit-package-name-control-input')
				.shadow()
				.find('input')
				.should('have.attr', 'maxlength', '50');
		});
	});

	describe('editing package description', () => {
		it('should show the edit input when clicking the description edit button', () => {
			const reduxStore = createStoreWithActivePackage(mockPackage);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('app-packages-summary:edit-description-trigger')
				.should('exist')
				.click();

			cy.dataTest('edit-package-description-control-input').should(
				'exist'
			);
		});
	});

	describe('adding app package image', () => {

		it('should add an image card when clicking the add image button', () => {
			const reduxStore = createStoreWithActivePackage(mockPackage);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('app-packages-summary:add-app-pack-button')
				.should('exist')
				.click();

			cy.then(() => {
				const pkg = getPackageFromStore(reduxStore, mockPackage.id);
				expect(pkg?.images).to.have.length(1);
				expect(pkg?.images?.[0].name).to.equal('Image 1');
			});
		});
	});

	describe('create an image on button click', () => {
		it('should add a new image to the active package', () => {
			const reduxStore = createStoreWithActivePackage(mockPackage);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest(
				'application-package-summary:new-app-package:add-image-button'
			)
				.should('exist')
				.click();

			cy.then(() => {
				const pkg = getPackageFromStore(reduxStore, mockPackage.id);
				expect(pkg?.images).to.have.length(1);
				expect(pkg?.images?.[0].name).to.equal('Image 1');
			});
		});
	});

	describe('error count with duplicate TLV tags', () => {
		it('should include duplicate tag errors from image TLVs in the total error count', () => {
			const tlv1: CustomTLV = {
				id: 'img-tlv-1',
				name: 'TLV A',
				tag: 100,
				value: '0x0A0B'
			};

			const tlv2: CustomTLV = {
				id: 'img-tlv-2',
				name: 'TLV B',
				tag: 100,
				value: '0xCCDD'
			};

			const imageWithDupTlvs: Image = {
				...mockImage,
				customTLVs: [tlv1, tlv2]
			};

			const pkg: ApplicationPackage = {
				...mockPackage,
				id: 'pkg-dup-img-tlv',
				images: [imageWithDupTlvs]
			};

			const reduxStore = createStoreWithActivePackage(pkg);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('peripheral:error').should('exist');
		});

		it('should not include duplicate tag errors between image TLVs', () => {
			const imageTlv: CustomTLV = {
				id: 'img-tlv-1',
				name: 'Image TLV',
				tag: 200,
				value: '0xCCDD'
			};

			const imageTlv2: CustomTLV = {
				id: 'img-tlv-2',
				name: 'Image TLV 2',
				tag: 200,
				value: '0xAABB'
			};

			const imageWithTlv: Image = {
				...mockImage,
				imageVersion: '1.0.0',
				customTLVs: [imageTlv, imageTlv2]
			};

			const pkg: ApplicationPackage = {
				...mockPackage,
				id: 'pkg-cross-dup',
				images: [imageWithTlv]
			};

			const reduxStore = createStoreWithActivePackage(pkg);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('peripheral:error').should('exist');
		});

		it('should not show error count when TLVs have unique tags', () => {
			const tlv1: CustomTLV = {
				id: 'tlv-unique-1',
				name: 'TLV A',
				tag: 100,
				value: '0x0A0B'
			};

			const tlv2: CustomTLV = {
				id: 'tlv-unique-2',
				name: 'TLV B',
				tag: 200,
				value: '0xCCDD'
			};

			const imageWithUniqueTlvs: Image = {
				...mockImage,
				imageVersion: '1.0.0',
				customTLVs: [tlv1, tlv2]
			};

			const pkg: ApplicationPackage = {
				...mockPackage,
				id: 'pkg-unique-tlv',
				images: [imageWithUniqueTlvs]
			};

			const reduxStore = createStoreWithActivePackage(pkg);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('peripheral:error').should('not.exist');
		});
	});

	describe('core dropdown validation', () => {
		it('should show validation error when cores are available but no core is assigned', () => {
			const pkg: ApplicationPackage = {
				...mockPackage,
				id: 'pkg-no-core',
				coreId: ''
			};

			const reduxStore = createStoreWithCoresAndActivePackage(pkg);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('package-core-error').should('exist');
		});

		it('should not show validation error when a core is assigned', () => {
			const pkg: ApplicationPackage = {
				...mockPackage,
				id: 'pkg-with-core',
				coreId: 'CM4'
			};

			const reduxStore = createStoreWithCoresAndActivePackage(pkg);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('package-core-error').should('not.exist');
		});

		it('should include coreId error in the error count', () => {
			const pkg: ApplicationPackage = {
				...mockPackage,
				id: 'pkg-core-error-count',
				coreId: ''
			};

			const reduxStore = createStoreWithCoresAndActivePackage(pkg);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('peripheral:error').should('exist');
		});

		it('should not include coreId error in error count when core is assigned', () => {
			const pkg: ApplicationPackage = {
				...mockPackage,
				id: 'pkg-core-no-error-count',
				coreId: 'CM4'
			};

			const reduxStore = createStoreWithCoresAndActivePackage(pkg);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('peripheral:error').should('not.exist');
		});
	});

	describe('version field', () => {
		it('should render the version input field when multiple images exist', () => {
			const reduxStore = createStoreWithActivePackage(
				mockPackageWithMultipleImages
			);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('package-version-control-input').should('exist');
		});

		it('should not render the version input field when only one image exists', () => {
			const reduxStore = createStoreWithActivePackage(
				mockPackageWithImage
			);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('package-version-control-input').should(
				'not.exist'
			);
		});

		it('should not render the version input field when no images exist', () => {
			const reduxStore = createStoreWithActivePackage(mockPackage);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('package-version-control-input').should(
				'not.exist'
			);
		});

		it('should update the package version on input', () => {
			const reduxStore = createStoreWithActivePackage(
				mockPackageWithMultipleImages
			);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('package-version-control-input')
				.shadow()
				.find('input')
				.clear()
				.type('1.2.3');

			cy.then(() => {
				const pkg = getPackageFromStore(
					reduxStore,
					mockPackageWithMultipleImages.id
				);
				expect(pkg?.version).to.equal('1.2.3');
			});
		});

		it('should show validation error when version is empty', () => {
			const pkg: ApplicationPackage = {
				...mockPackageWithMultipleImages,
				id: 'pkg-no-version',
				version: undefined
			};
			const reduxStore = createStoreWithActivePackage(pkg);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('package-version-error').should('exist');
		});

		it('should not show validation error when version is empty and only one image', () => {
			const pkg: ApplicationPackage = {
				...mockPackageWithImage,
				id: 'pkg-no-version-single',
				version: undefined
			};
			const reduxStore = createStoreWithActivePackage(pkg);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('package-version-error').should('not.exist');
		});

		it('should not render the version input field when core is not primary', () => {
			const pkg: ApplicationPackage = {
				...mockPackageWithMultipleImages,
				id: 'pkg-non-primary',
				coreId: 'NONPRIMARY'
			};
			const reduxStore =
				createStoreWithNonPrimaryCoreAndActivePackage(pkg);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('package-version-control-input').should(
				'not.exist'
			);
		});
	});

	describe('security counter field', () => {
		it('should render the security counter input field when multiple images exist', () => {
			const reduxStore = createStoreWithActivePackage(
				mockPackageWithMultipleImages
			);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('package-security-counter-control-input').should(
				'exist'
			);
		});

		it('should not render the security counter input field when only one image exists', () => {
			const reduxStore = createStoreWithActivePackage(
				mockPackageWithImage
			);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('package-security-counter-control-input').should(
				'not.exist'
			);
		});

		it('should not render the security counter input field when no images exist', () => {
			const reduxStore = createStoreWithActivePackage(mockPackage);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('package-security-counter-control-input').should(
				'not.exist'
			);
		});

		it('should update the package security counter on input', () => {
			const reduxStore = createStoreWithActivePackage(
				mockPackageWithMultipleImages
			);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('package-security-counter-control-input')
				.shadow()
				.find('input')
				.clear()
				.type('42');

			cy.then(() => {
				const pkg = getPackageFromStore(
					reduxStore,
					mockPackageWithMultipleImages.id
				);
				expect(pkg?.securityCounter).to.equal(42);
			});
		});

		it('should not render the security counter input field when core is not primary', () => {
			const pkg: ApplicationPackage = {
				...mockPackageWithMultipleImages,
				id: 'pkg-non-primary-sc',
				coreId: 'NONPRIMARY'
			};
			const reduxStore =
				createStoreWithNonPrimaryCoreAndActivePackage(pkg);

			cy.mount(<TestApplicationPackages />, reduxStore);

			cy.dataTest('package-security-counter-control-input').should(
				'not.exist'
			);
		});
	});
});
