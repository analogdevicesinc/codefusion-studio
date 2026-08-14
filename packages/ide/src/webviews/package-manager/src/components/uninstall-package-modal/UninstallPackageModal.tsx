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

import {Accordion, Button, CheckBox} from 'cfs-react-library';
import {useEffect, useState} from 'react';
import type {ReactNode} from 'react';
import {Modal} from '@common/components/modal/Modal';
import {LocalizedMessage} from '@common/components/l10n/LocalizedMessage';
import type {CfsPackageReference} from 'cfs-package-manager';
import HmcBadge from '../ui-fragments/HmcBadge';
import styles from './uninstall-package-modal.module.scss';
import IndentArrow from '../../../../common/icons/IndentArrow';

type UninstallPackageModalProps = {
	readonly isOpen: boolean;
	/** Batch mode: list of packages that will be uninstalled */
	readonly packages: CfsPackageReference[];
	/** Single mode: other packages that depend on the one being uninstalled */
	readonly dependents?: CfsPackageReference[];
	readonly onClose: () => void;
	readonly onConfirm: (hideConfirmation: boolean) => void;
};

type RemovalAccordionProps = {
	/** The package the user selected for removal. */
	readonly selected: CfsPackageReference;
	/** Parent packages that depend on it and will also be uninstalled. */
	readonly parents: CfsPackageReference[];
	readonly label: ReactNode;
	readonly parentLabel: ReactNode;
};

/**
 * Renders the selected package as an accordion whose body lists the parent
 * packages that will also be uninstalled (each tagged as a parent package).
 */
function RemovalAccordion({
	selected,
	parents,
	label,
	parentLabel
}: RemovalAccordionProps) {
	const [open, setOpen] = useState(true);

	return (
		<div className={styles.removalSection}>
			<span className={styles.removalLabel}>{label}</span>
			<Accordion
				className={styles.removalAccordion}
				open={open}
				title={
					<div className={styles.accordionTitle}>
						<span className={styles.accordionName}>
							{selected.name}
						</span>
						<span className={styles.accordionVersion}>
							v{selected.version}
						</span>
					</div>
				}
				onToggle={() => {
					setOpen(isOpen => !isOpen);
				}}
			>
				<ul className={styles.parentList}>
					{parents.map(parent => (
						<li
							key={`${parent.name}/${parent.version}`}
							className={styles.parentItem}
						>
							<span className={styles.parentArrow} aria-hidden='true'>
								<IndentArrow />
							</span>
							<span className={styles.parentName}>{parent.name}</span>
							<span className={styles.parentVersion}>
								v{parent.version}
							</span>
							<HmcBadge className={styles.parentBadge}>
								{parentLabel}
							</HmcBadge>
						</li>
					))}
				</ul>
			</Accordion>
		</div>
	);
}

export default function UninstallPackageModal({
	isOpen,
	packages,
	dependents,
	onClose,
	onConfirm
}: UninstallPackageModalProps) {
	const [hideConfirmation, setHideConfirmation] = useState(false);

	useEffect(() => {
		if (!isOpen) {
			setHideConfirmation(false);
		}
	}, [isOpen]);

	if (packages.length === 0) return null;

	const isBatchMode = Boolean(packages.length > 1);
	const parentPackages = dependents ?? [];
	const showDependents = !isBatchMode && parentPackages.length > 0;

	// Total packages removed = the selected one plus any parents that depend on it.
	const totalCount = showDependents
		? packages.length + parentPackages.length
		: packages.length;

	return (
		<div className={styles.container}>
			<Modal
				isOpen={isOpen}
				handleModalClose={onClose}
				titleId={`uninstall-package-modal-title-${packages[0].name.replace(/[^A-Za-z0-9_-]/g, '-')}`}
				title={
					isBatchMode ? (
						<LocalizedMessage id='packageCard.uninstallModal.batchTitle' />
					) : (
						<LocalizedMessage id='packageCard.uninstallModal.title' />
					)
				}
				footer={
					<>
						<Button appearance='secondary' onClick={onClose}>
							<LocalizedMessage id='packageCard.uninstallModal.cancel' />
						</Button>
						<Button
							appearance='primary'
							onClick={() => {
								onConfirm(hideConfirmation);
							}}
						>
							{isBatchMode || showDependents ? (
								<LocalizedMessage id='packageCard.uninstallModal.confirmAll' />
							) : (
								<LocalizedMessage id='packageCard.uninstallModal.confirm' />
							)}
						</Button>
					</>
				}
			>
				<div className={styles.uninstallModalContent}>
					{totalCount > 1 && (
						<p className={styles.uninstallModalDescription}>
							<LocalizedMessage
								id='packageCard.uninstallModal.countMessage'
								params={{count: String(totalCount)}}
							/>
						</p>
					)}

					<p className={styles.uninstallModalDescription}>
						{isBatchMode ? (
							<LocalizedMessage id='packageCard.uninstallModal.batchMessage' />
						) : showDependents ? (
							<LocalizedMessage
								id='packageCard.uninstallModal.dependentsMessage'
								params={{name: packages[0].name}}
							/>
						) : (
							<LocalizedMessage id='packageCard.uninstallModal.message' />
						)}
					</p>

					{showDependents && (
						<RemovalAccordion
							selected={packages[0]}
							parents={parentPackages}
							label={
								<LocalizedMessage id='packageCard.uninstallModal.packageForRemoval' />
							}
							parentLabel={
								<LocalizedMessage id='packageCard.uninstallModal.parentPackage' />
							}
						/>
					)}

					{isBatchMode && (
						<ul className={styles.dependentsList}>
							{packages.map(item => (
								<li
									key={`${item.name}/${item.version}`}
									className={styles.dependentItem}
								>
									<span className={styles.dependentItemName}>
										{item.name}
									</span>
									<span className={styles.dependentItemVersion}>
										v{item.version}
									</span>
								</li>
							))}
						</ul>
					)}

					<span className={styles.uninstallModalDescription}>
						<LocalizedMessage id='packageCard.uninstallModal.continue' />
					</span>

					{!isBatchMode && !showDependents && (
						<CheckBox
							checked={hideConfirmation}
							className={styles.uninstallModalCheckbox}
							onClick={() => {
								setHideConfirmation(!hideConfirmation);
							}}
						>
							<LocalizedMessage id='packageCard.uninstallModal.dontShowAgain' />
						</CheckBox>
					)}
				</div>
			</Modal>
		</div>
	);
}
