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

import {useEffect, useRef} from 'react';
import type {CfsPackageReference} from 'cfs-package-manager';
import {Button} from 'cfs-react-library';
import styles from './package-dependency-review-card.module.scss';
import ChevronRight from '@common/icons/ChevronRight';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import RightArrow from '@common/icons/RightArrow';
import {useMessenger} from '../../../../common/contexts/MessengerContext';
import {openLicensePreviewRequest} from '@constants/messages/package-manager-messages';
import {
	usePackageList,
	useVersionMeta
} from '../../state/slices/packages/packages.selector';
import {formatCachedVersions, formatSupportedSocs} from '../../utils';

/** A request to expand and scroll to a specific dependency card. */
export type FocusRequest = {
	/** The unique cardKey of the dependency card to focus. */
	readonly key: string;
	/** Bumped on every click so repeated clicks on the same dependency re-apply. */
	readonly nonce: number;
};

type PackageDependencyReviewCardProps = {
	readonly dependency: CfsPackageReference;
	/** Unique key of this card occurrence. */
	readonly cardKey: string;
	/** True when the parent package is required by the workspace. */
	readonly isRequired: boolean;
	readonly isCollapsed: boolean;
	/** True when this dependency is the one the selection disagrees about. */
	readonly hasConflict?: boolean;
	/** Toggles the collapsed state. */
	readonly onToggle: () => void;
	/** When targeted from the parent's dependency list, scrolls into view. */
	readonly focusRequest: FocusRequest | undefined;
};

export default function PackageDependencyReviewCard({
	dependency,
	cardKey,
	isRequired,
	isCollapsed,
	hasConflict,
	onToggle,
	focusRequest
}: PackageDependencyReviewCardProps) {
	const l10n = useLocaleContext()?.packageCard;
	const messenger = useMessenger();
	const packageList = usePackageList();
	const containerRef = useRef<HTMLDivElement>(null);

	// Undefined for a dependency the catalog does not list; its rows show dashes.
	const detail = useVersionMeta(dependency.name, dependency.version);
	const entry = packageList.find(e => e.name === dependency.name);
	const socs = detail?.socs ?? [];

	/** Scroll into view when this card is targeted from the parent's dependency
	 * list. Matched by the unique cardKey so duplicate name/version entries
	 * stay distinct. Expansion is driven by the header via `isCollapsed`, so
	 * this only handles the scroll.
	 */
	useEffect(() => {
		if (focusRequest?.key !== cardKey) {
			return;
		}

		containerRef.current?.scrollIntoView({
			behavior: 'smooth',
			block: 'center'
		});
	}, [focusRequest, cardKey]);

	const cachedVersions = entry ? formatCachedVersions(entry) : '—';

	const handleViewLicense = async () => {
		await messenger.sendRequest(
			openLicensePreviewRequest,
			{type: 'extension'},
			{
				name: dependency.name,
				version: dependency.version,
				license: detail?.license ?? ''
			}
		);
	};

	return (
		<div ref={containerRef} className={styles.container}>
			<div
				className={`${styles.card}${
					hasConflict ? ` ${styles.conflicting}` : ''
				}`}
				data-test={
					hasConflict ? 'dependency-card-conflicting' : undefined
				}
			>
				<div className={styles.cardContent}>
					<div className={styles.header}>
						<span className={styles.name}>{dependency.name}</span>
						<div className={styles.status}>
							<span className={styles.version}>
								v{dependency.version}
								{isRequired
									? ` (${l10n?.required ?? 'Required'})`
									: ''}
							</span>
							<Button appearance='icon' onClick={onToggle}>
								<ChevronRight
									className={
										isCollapsed
											? styles.collapsedIcon
											: styles.expandedIcon
									}
								/>
							</Button>
						</div>
					</div>

					{!isCollapsed && (
						<div className={styles.cardBody}>
							<div className={styles.packageDetailsRow}>
								<div className={styles.rowHeader}>
									{l10n?.detail?.description}
								</div>
								<div className={styles.rowValue}>
									{detail?.description ?? '—'}
								</div>
							</div>
							<div className={styles.packageDetailsRow}>
								<div className={styles.rowHeader}>
									{l10n?.detail?.type}
								</div>
								<div className={styles.rowValue}>
									{detail?.type ?? '—'}
								</div>
							</div>
							<div className={styles.packageDetailsRow}>
								<div className={styles.rowHeader}>
									{l10n?.detail?.cfsCompatibility}
								</div>
								<div className={styles.rowValue}>
									{detail?.cfsVersionConstraint ?? '—'}
								</div>
							</div>
							<div className={styles.packageDetailsRow}>
								<div className={styles.rowHeader}>
									{l10n?.detail?.license}
								</div>
								<div className={styles.rowValue}>
									{detail?.license ?? '—'} &nbsp;
									<button
										type='button'
										className={styles.link}
										onClick={handleViewLicense}
									>
										{l10n?.detail?.viewLicense} <RightArrow />{' '}
									</button>
								</div>
							</div>
							<div className={styles.packageDetailsRow}>
								<div className={styles.rowHeader}>
									{l10n?.detail?.cachedVersions}
								</div>
								<div className={styles.rowValue}>
									{cachedVersions}
								</div>
							</div>
							<div className={styles.packageDetailsRow}>
								<div className={styles.rowHeader}>
									{l10n?.detail?.supportedSocs}
								</div>
								<div className={styles.rowValue}>
									{formatSupportedSocs(socs)}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
