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
	memo,
	useCallback,
	useLayoutEffect,
	useRef,
	useState
} from 'react';

import styles from './CfsGroupedRadioSelection.module.scss';
import {Accordion, Badge, Radio} from 'cfs-react-library';
import {
	createHighlightForElements,
	isHighlightsAPISupported
} from '../../utils/highlightApi';

const highlightGroup = 'search-highlight';

export type SelectionGroup = {
	id: string;
	label: string;
	options: SelectionOption[];
};

export type SelectionOption = {
	id: string;
	label: string;
	description?: string;
	disabled?: boolean;
};

type CfsGroupedRadioSelectionProps = Readonly<{
	options: SelectionGroup[];
	selectedId?: string;
	dataTest?: string;
	highlightQuery?: string | RegExp;
	openGroups?: Record<string, boolean>;
	onChange?: (id: string) => void;
	renderSelectedContent?: (id: string) => React.ReactNode;
	renderTitleEnhancement?: (id: string) => React.ReactNode;
	setOpenGroups?: (openGroups: Record<string, boolean>) => void;
}>;

/**
 * A radio based selection component that supports grouping of options inside of an accordion and highlighting of search terms.
 *
 * The openGroups state can be controlled by the parent by providing both `openGroups` and `onOpenGroupsChange`,
 * or the component will manage it internally if neither are provided (hybrid/uncontrolled pattern).
 */
function CfsGroupedRadioSelection({
	dataTest = "cfs-grouped-radio-selection",
	options,
	selectedId,
	highlightQuery,
	renderSelectedContent,
	renderTitleEnhancement,
	onChange,
	openGroups: controlledOpenGroups,
	setOpenGroups
}: CfsGroupedRadioSelectionProps) {
	const [uncontrolledOpenGroups, setUncontrolledOpenGroups] =
		useState<Record<string, boolean>>({});

	const isControlled =
		controlledOpenGroups !== undefined && setOpenGroups !== undefined;

	const openGroups = isControlled
		? controlledOpenGroups
		: uncontrolledOpenGroups;

	const containerRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		if (!isHighlightsAPISupported()) {
			console.warn(
				"Browser does not support CSS highlights API, search term highlighting will not work"
			);

			return;
		}

		CSS.highlights.delete(highlightGroup);

		if (containerRef.current && highlightQuery) {
			const highlightableElements =
				containerRef.current.getElementsByClassName(
					styles.highlightable as string
				);
			const highlight = createHighlightForElements(
				highlightableElements,
				highlightQuery
			);
			CSS.highlights.set(highlightGroup, highlight);
		}
	}, [highlightQuery, openGroups, options]);

	const toggleGroup = useCallback(
		(groupId: string) => {
			const newOpenGroups = {
				...openGroups,
				[groupId]: !openGroups[groupId]
			};

			if (isControlled) {
				setOpenGroups(newOpenGroups);
			} else {
				setUncontrolledOpenGroups(newOpenGroups);
			}
		},
		[openGroups, isControlled, setOpenGroups]
	);

	return (
		<div
			ref={containerRef}
			className={styles.container}
			data-test={`${dataTest}:group-container`}
		>
			{options.map((group) => (
				<Accordion
					key={group.label}
					open={openGroups[group.id]}
					dataTest={`${dataTest}:group:${group.id}`}
					title={
						<div className={styles.groupTitle}>
							<div className={styles.highlightable}>
								{group.label}
							</div>
							<Badge appearance='secondary'>
								{group.options.length}
							</Badge>
						</div>
					}
					onToggle={() => {
						toggleGroup(group.id);
					}}
				>
					<div>
						{group.options.map((option) => (
							<div key={option.id}>
								<Option
									option={option}
									isSelected={selectedId === option.id}
									dataTest={`${dataTest}:option:${option.id}`}
									renderTitleEnhancement={renderTitleEnhancement}
									onChange={onChange}
								/>
								{selectedId === option.id &&
									renderSelectedContent && (
										<div>{renderSelectedContent(option.id)}</div>
									)}
							</div>
						))}
					</div>
				</Accordion>
			))}
		</div>
	);
}

export function Option({
	option,
	isSelected,
	dataTest,
	renderTitleEnhancement,
	onChange
}: {
	readonly option: SelectionOption;
	readonly isSelected: boolean;
	readonly dataTest?: string;
	readonly renderTitleEnhancement?: (id: string) => React.ReactNode;
	readonly onChange?: (id: string) => void;
}) {
	return (
		<div
			key={option.id}
			id={option.id}
			className={styles.option}
			data-test={dataTest}
			data-active={isSelected}
			onClick={() => {
				onChange?.(option.id);
			}}
		>
			<Radio
				checked={isSelected}
				value={option.id}
				className={styles.radio}
				onChange={(e) => {
					if ((e.target as HTMLInputElement).checked) {
						onChange?.(option.id);
					}
				}}
			/>
			<div className={styles.optionLabel}>
				<div
					className={`${styles.optionLabelTitle} ${styles.highlightable}`}
				>
					{option.label}
					{renderTitleEnhancement &&
						renderTitleEnhancement(option.id)}
				</div>
				<span className={styles.optionLabelDescription}>
					{option.description}
				</span>
			</div>
		</div>
	);
}

export default memo(CfsGroupedRadioSelection);
