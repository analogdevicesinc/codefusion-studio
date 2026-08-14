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

import {useState} from 'react';
import type {CfsPackageReference} from 'cfs-package-manager';
import PackageReviewCard from '../package-review-card/PackageReviewCard';
import PackageDependencyReviewCard, {
	type FocusRequest
} from '../package-dependency-review-card/PackageDependencyReviewCard';
import {usePackageList} from '../../state/slices/packages/packages.selector';
import {buildDependencyCardKey} from '../review-summary/useDependencyGroups';
import styles from './package-review-group.module.scss';

type PackageReviewGroupProps = {
	readonly reference: CfsPackageReference;
	readonly dependencies: CfsPackageReference[];
	/** True while this package's dependencies are still being resolved. */
	readonly isLoading: boolean;
	/** Keys of the dependency cards that are currently expanded. */
	readonly expandedKeys: ReadonlySet<string>;
	/** Toggles the collapsed state of the dependency card with this key. */
	readonly onToggle: (key: string) => void;
};

export default function PackageReviewGroup({
	reference,
	dependencies,
	isLoading,
	expandedKeys,
	onToggle
}: PackageReviewGroupProps) {
	const packageList = usePackageList();
	const [focusRequest, setFocusRequest] = useState<
		FocusRequest | undefined
	>(undefined);

	// A dependency is "required" when its parent package is required
	const isRequired =
		packageList.find(e => e.name === reference.name)?.isRequired ??
		false;

	/**
	 * Clicking a dependency in the summary expands its card (via the header's
	 * collapse state) and scrolls to it. The index identifies the exact
	 * occurrence, so duplicate name/version entries stay distinct.
	 */
	const handleDependencyClick = (
		dependency: CfsPackageReference,
		index: number
	) => {
		const cardKey = buildDependencyCardKey(
			reference,
			dependency,
			index
		);

		if (!expandedKeys.has(cardKey)) {
			onToggle(cardKey);
		}

		setFocusRequest(prev => ({
			key: cardKey,
			nonce: (prev?.nonce ?? 0) + 1
		}));
	};

	return (
		<div className={styles.container}>
			<PackageReviewCard
				reference={reference}
				dependencies={dependencies}
				isDependenciesLoading={isLoading}
				onDependencyClick={handleDependencyClick}
			/>
			{!isLoading &&
				dependencies.map((dependency, i) => {
					const cardKey = buildDependencyCardKey(
						reference,
						dependency,
						i
					);

					return (
						<PackageDependencyReviewCard
							key={cardKey}
							cardKey={cardKey}
							dependency={dependency}
							isRequired={isRequired}
							isCollapsed={!expandedKeys.has(cardKey)}
							focusRequest={focusRequest}
							onToggle={() => {
								onToggle(cardKey);
							}}
						/>
					);
				})}
		</div>
	);
}
