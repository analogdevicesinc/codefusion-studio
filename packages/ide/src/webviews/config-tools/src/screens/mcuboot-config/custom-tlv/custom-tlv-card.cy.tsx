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

import {useCallback} from 'react';
import type {Soc} from '../../../../../common/types/soc';
import {
	configurePreloadedStore,
	useAppDispatch
} from '../../../state/store';
import {
	addApplicationPackage,
	setActivePackageId,
	updateApplicationPackage
} from '../../../state/slices/application-packages/applicationPackages.reducer';
import {useActiveApplicationPackage} from '../../../state/slices/application-packages/applicationPackages.selector';
import {LocalizationProvider} from '../../../../../common/contexts/LocaleContext';
import type {
	ApplicationPackage,
	CustomTLV,
	Image
} from '../../../types/application-packages';
import CustomTLVCard from './custom-tlv-card';

const soc = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

const mockTLVEditableField: CustomTLV = {
	id: 'tlv-editable',
	name: '',
	description: '',
	tag: 100,
	value: '0x0A0B'
};

const mockTLV: CustomTLV = {
	id: 'tlv-1',
	name: 'Test TLV',
	description: 'A test TLV description',
	tag: 100,
	value: '0x0A0B'
};

const mockTLVWithError: CustomTLV = {
	id: 'tlv-error',
	name: 'Error TLV',
	description: 'TLV with invalid value',
	tag: 200,
	value: '0xZZZZ'
};

const mockImage: Image = {
	id: 'img-1',
	name: 'Test Image',
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

const mockPackage: ApplicationPackage = {
	id: 'pkg-1',
	name: 'Test Package',
	description: 'A test package',
	enabled: true,
	coreId: ''
};

/**
 * Wrapper component that reads the custom TLV from the Redux store
 * and passes it as a prop, mirroring how ImageCard renders CustomTLVCard.
 */
function TestCustomTLVCard({
	tlvId,
	imageId,
	onDelete
}: {
	readonly tlvId: string;
	readonly imageId: string;
	readonly onDelete: (id: string) => void;
}) {
	const dispatch = useAppDispatch();
	const activePackage = useActiveApplicationPackage();
	const currentImage = activePackage?.images?.find(
		img => img.id === imageId
	);
	const currentTlv = currentImage?.customTLVs?.find(
		t => t.id === tlvId
	);

	const handleUpdate = useCallback(
		(id: string, updates: Partial<Omit<CustomTLV, 'id'>>) => {
			if (!activePackage || !currentImage) return;

			const updatedTLVs = (currentImage.customTLVs ?? []).map(tlv =>
				tlv.id === id ? {...tlv, ...updates} : tlv
			);

			const updatedImages = (activePackage.images ?? []).map(img =>
				img.id === imageId ? {...img, customTLVs: updatedTLVs} : img
			);

			dispatch(
				updateApplicationPackage({
					id: activePackage.id,
					updates: {images: updatedImages}
				})
			);
		},
		[activePackage, currentImage, imageId, dispatch]
	);

	if (!currentTlv) return null;

	return (
		<CustomTLVCard
			customTLV={currentTlv}
			siblingTlvs={currentImage?.customTLVs ?? []}
			onDelete={onDelete}
			onUpdate={handleUpdate}
		/>
	);
}

function createStoreWithCustomTLV(
	tlv: CustomTLV,
	pkg: ApplicationPackage,
	siblingTlvs?: CustomTLV[]
) {
	const image: Image = {
		...mockImage,
		customTLVs: siblingTlvs ?? [tlv]
	};

	const fullPkg: ApplicationPackage = {
		...pkg,
		images: [image]
	};

	const reduxStore = configurePreloadedStore(soc);
	reduxStore.dispatch(addApplicationPackage(fullPkg));
	reduxStore.dispatch(setActivePackageId(fullPkg.id));

	return reduxStore;
}

function mountCustomTLVCard(
	tlv: CustomTLV,
	pkg: ApplicationPackage,
	onDelete: (id: string) => void = cy.stub()
) {
	const reduxStore = createStoreWithCustomTLV(tlv, pkg);

	cy.mount(
		<LocalizationProvider namespace='cfgtools'>
			<TestCustomTLVCard
				tlvId={tlv.id}
				imageId={mockImage.id}
				onDelete={onDelete}
			/>
		</LocalizationProvider>,
		reduxStore
	);

	return reduxStore;
}

function mountCustomTLVCardWithSiblings(
	tlv: CustomTLV,
	pkg: ApplicationPackage,
	siblingTlvs: CustomTLV[]
) {
	const reduxStore = createStoreWithCustomTLV(tlv, pkg, siblingTlvs);

	cy.mount(
		<LocalizationProvider namespace='cfgtools'>
			<TestCustomTLVCard
				tlvId={tlv.id}
				imageId={mockImage.id}
				onDelete={cy.stub()}
			/>
		</LocalizationProvider>,
		reduxStore
	);

	return reduxStore;
}

function getCustomTLVFromStore(
	store: ReturnType<typeof configurePreloadedStore>,
	pkgId: string,
	imageId: string,
	tlvId: string
) {
	const state = store.getState();
	const pkg =
		state.applicationPackagesReducer.applicationPackages.find(
			p => p.id === pkgId
		);

	const image = pkg?.images?.find(i => i.id === imageId);

	return image?.customTLVs?.find(t => t.id === tlvId);
}

describe('CustomTLVCard', () => {
	describe('rendering', () => {
		it('should render the custom TLV card', () => {
			mountCustomTLVCard(mockTLV, mockPackage);

			cy.dataTest(`custom-tlv-card:${mockTLV.id}`).should('exist');
		});

		it('should display the TLV name', () => {
			mountCustomTLVCard(mockTLV, mockPackage);

			cy.contains(mockTLV.name).should('exist');
		});

		it('should display the TLV description', () => {
			mountCustomTLVCard(mockTLV, mockPackage);

			cy.contains(mockTLV.description!).should('exist');
		});

		it('should render the tag field with the correct value', () => {
			mountCustomTLVCard(mockTLV, mockPackage);

			cy.dataTest(`custom-tlv-card:${mockTLV.id}-header`)
				.should('exist')
				.click();

			cy.dataTest('custom-tlv-tag')
				.find('input')
				.should('have.value', mockTLV.tag.toString(16).toUpperCase());
		});

		it('should render the value field with the correct value', () => {
			mountCustomTLVCard(mockTLV, mockPackage);

			cy.dataTest(`custom-tlv-card:${mockTLV.id}-header`)
				.should('exist')
				.click();
			cy.dataTest('custom-tlv-value-control-input').should(
				'have.value',
				mockTLV.value
			);
		});

		it('should render the delete button', () => {
			mountCustomTLVCard(mockTLV, mockPackage);

			cy.dataTest('delete-custom-tlv').should('exist');
		});
	});

	describe('validation', () => {
		it('should show conflict icon when value has an error', () => {
			mountCustomTLVCardWithSiblings(mockTLVWithError, mockPackage, [
				mockTLVWithError
			]);

			cy.dataTest('conflict-icon').should('exist');
		});

		it('should not show conflict icon when value is valid', () => {
			mountCustomTLVCard(mockTLV, mockPackage);

			cy.dataTest('conflict-icon').should('not.exist');
		});

		it('should show error message for invalid hex value', () => {
			mountCustomTLVCardWithSiblings(mockTLVWithError, mockPackage, [
				mockTLVWithError
			]);

			cy.dataTest(`custom-tlv-card:${mockTLVWithError.id}-header`)
				.should('exist')
				.click();

			cy.dataTest('custom-tlv-value-error').should('exist');
		});

		it('should show conflict icon when another sibling TLV has the same tag', () => {
			const duplicateTLV: CustomTLV = {
				id: 'tlv-dup',
				name: 'Duplicate TLV',
				tag: mockTLV.tag,
				value: '0xCC'
			};

			mountCustomTLVCardWithSiblings(mockTLV, mockPackage, [
				mockTLV,
				duplicateTLV
			]);

			cy.dataTest('conflict-icon').should('exist');
		});

		it('should show duplicate tag error message when tag is shared with another TLV', () => {
			const duplicateTLV: CustomTLV = {
				id: 'tlv-dup',
				name: 'Duplicate TLV',
				tag: mockTLV.tag,
				value: '0xCC'
			};

			mountCustomTLVCardWithSiblings(mockTLV, mockPackage, [
				mockTLV,
				duplicateTLV
			]);

			cy.dataTest(`custom-tlv-card:${mockTLV.id}-header`)
				.should('exist')
				.click();

			cy.dataTest('custom-tlv-tag-error').should('exist');
		});

		it('should not show conflict icon when TLVs have different tags', () => {
			const differentTLV: CustomTLV = {
				id: 'tlv-different',
				name: 'Different TLV',
				tag: 999,
				value: '0xEE'
			};

			mountCustomTLVCardWithSiblings(mockTLV, mockPackage, [
				mockTLV,
				differentTLV
			]);

			cy.dataTest('conflict-icon').should('not.exist');
		});
	});

	describe('delete', () => {
		it('should show the warning modal when delete button is clicked', () => {
			mountCustomTLVCard(mockTLV, mockPackage);

			cy.dataTest('delete-custom-tlv').click();

			cy.dataTest('delete-custom-tlv-warning').should('exist');
		});

		it('should call onDelete after confirming the warning modal', () => {
			const onDelete = cy.stub().as('onDelete');

			mountCustomTLVCard(mockTLV, mockPackage, onDelete);

			cy.dataTest('delete-custom-tlv').click();

			cy.dataTest('delete-custom-tlv-warning').should('exist');
			cy.dataTest('delete-custom-tlv-warning:confirm-btn')
				.should('exist')
				.click();

			cy.get('@onDelete').should(
				'have.been.calledOnceWith',
				mockTLV.id
			);
		});

		it('should not call onDelete when cancelling the warning modal', () => {
			const onDelete = cy.stub().as('onDelete');

			mountCustomTLVCard(mockTLV, mockPackage, onDelete);

			cy.dataTest('delete-custom-tlv').click();

			cy.dataTest('delete-custom-tlv-warning').should('exist');
			cy.contains('Cancel').click();

			cy.get('@onDelete').should('not.have.been.called');
		});
	});

	describe('editing name', () => {
		it('should enter edit mode when clicking the name', () => {
			mountCustomTLVCard(mockTLV, mockPackage);

			cy.dataTest(`custom-tlv-card:${mockTLV.id}-name`).click();

			cy.dataTest('edit-tlv-name-control-input').should('exist');
		});

		it('should update the TLV name on confirm', () => {
			const reduxStore = mountCustomTLVCard(
				mockTLVEditableField,
				mockPackage
			);

			cy.dataTest(
				`custom-tlv-card:${mockTLVEditableField.id}-name`
			).click();

			cy.dataTest('edit-tlv-name-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('Updated name');
				});

			cy.dataTest('edit-input-confirm-btn').click();

			cy.then(() => {
				const tlv = getCustomTLVFromStore(
					reduxStore,
					mockPackage.id,
					mockImage.id,
					mockTLVEditableField.id
				);
				expect(tlv?.name).to.equal('Updated name');
			});
		});

		it('should discard changes and exit edit mode on cancel', () => {
			const reduxStore = mountCustomTLVCard(mockTLV, mockPackage);

			cy.dataTest(`custom-tlv-card:${mockTLV.id}-name`).click();

			cy.dataTest('edit-tlv-name-control-input')
				.shadow()
				.within(() => {
					cy.get('input').clear().type('Discarded Name');
				});

			cy.dataTest('edit-input-cancel-btn').click();

			cy.dataTest('edit-tlv-name-control-input').should('not.exist');
			cy.contains(mockTLV.name).should('exist');

			cy.then(() => {
				const tlv = getCustomTLVFromStore(
					reduxStore,
					mockPackage.id,
					mockImage.id,
					mockTLV.id
				);
				expect(tlv?.name).to.equal(mockTLV.name);
			});
		});

		it('should enforce a maximum character limit of 50 on the name field', () => {
			mountCustomTLVCard(mockTLV, mockPackage);

			cy.dataTest(`custom-tlv-card:${mockTLV.id}-name`).click();

			cy.dataTest('edit-tlv-name-control-input')
				.shadow()
				.find('input')
				.should('have.attr', 'maxlength', '50');
		});
	});

	describe('editing description', () => {
		it('should enter edit mode when clicking the description', () => {
			mountCustomTLVCard(mockTLV, mockPackage);

			cy.dataTest(
				`custom-tlv-card:${mockTLV.id}-description`
			).click();

			cy.dataTest('edit-tlv-description-control-input').should(
				'exist'
			);
		});

		it('should update the TLV description on confirm', () => {
			const reduxStore = mountCustomTLVCard(
				mockTLVEditableField,
				mockPackage
			);

			cy.dataTest(
				`custom-tlv-card:${mockTLVEditableField.id}-description`
			).click();

			cy.dataTest('edit-tlv-description-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('Updated Description');
				});

			cy.dataTest('edit-input-confirm-btn').click();

			cy.then(() => {
				const tlv = getCustomTLVFromStore(
					reduxStore,
					mockPackage.id,
					mockImage.id,
					mockTLVEditableField.id
				);
				expect(tlv?.description).to.equal('Updated Description');
			});
		});

		it('should discard changes and exit edit mode on cancel', () => {
			const reduxStore = mountCustomTLVCard(mockTLV, mockPackage);

			cy.dataTest(
				`custom-tlv-card:${mockTLV.id}-description`
			).click();

			cy.dataTest('edit-tlv-description-control-input')
				.shadow()
				.within(() => {
					cy.get('input').clear().type('Discarded Description');
				});

			cy.dataTest('edit-input-cancel-btn').click();

			cy.dataTest('edit-tlv-description-control-input').should(
				'not.exist'
			);
			cy.contains(mockTLV.description!).should('exist');

			cy.then(() => {
				const tlv = getCustomTLVFromStore(
					reduxStore,
					mockPackage.id,
					mockImage.id,
					mockTLV.id
				);
				expect(tlv?.description).to.equal(mockTLV.description);
			});
		});
	});

	describe('updating fields', () => {
		it('should update the tag value in the store', () => {
			const reduxStore = mountCustomTLVCard(mockTLV, mockPackage);

			cy.dataTest(`custom-tlv-card:${mockTLV.id}-header`)
				.should('exist')
				.click();

			cy.dataTest('custom-tlv-tag').find('input').clear().type('2A');

			cy.then(() => {
				const tlv = getCustomTLVFromStore(
					reduxStore,
					mockPackage.id,
					mockImage.id,
					mockTLV.id
				);
				expect(tlv?.tag).to.equal(0x2a);
			});
		});

		it('should update the value field in the store', () => {
			const reduxStore = mountCustomTLVCard(mockTLV, mockPackage);

			cy.dataTest(`custom-tlv-card:${mockTLV.id}-header`)
				.should('exist')
				.click();

			cy.dataTest('custom-tlv-value-control-input')
				.shadow()
				.within(() => {
					cy.get('input').clear().type('0xAABB');
				});

			cy.then(() => {
				const tlv = getCustomTLVFromStore(
					reduxStore,
					mockPackage.id,
					mockImage.id,
					mockTLV.id
				);
				expect(tlv?.value).to.equal('0xAABB');
			});
		});
	});
});
