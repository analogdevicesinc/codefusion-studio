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
import {useEffect, useRef, useState} from 'react';
import {Badge} from 'cfs-react-library';
import type {
	SruNavigationSection,
	SruPeripheralSignalGroup
} from '../../../../utils/sru-navigation';
import Accordion from '@common/components/accordion/Accordion';
import {usePeripheralHighlight} from '../../../../hooks/use-peripheral-highlight';
import {clearNavigationGroupReveal} from '../../../../state/slices/sru/sru.reducer';
import {
	useSruSelectedSignalGroupKey,
	useSruSelectionSequence,
	useSruNavigationGroupReveal
} from '../../../../state/slices/sru/sru.selector';
import {useAppDispatch} from '../../../../state/store';
import styles from './sru-peripheral-group.module.scss';
import SruPeripheralItem from './sru-peripheral-item';

type SruPeripheralGroupProps = Readonly<{
	sectionKind: SruNavigationSection['kind'];
	group: string;
	signalGroups: SruPeripheralSignalGroup[];
}>;

/**
 * Expandable/collapsible top-level SRU group in the Connections side panel.
 * `group` is either a real peripheral-level group name (e.g. "SPORT",
 * bucketing multiple peripherals) or a single peripheral's own name, used as
 * a wrapper when that peripheral has SRU input/output subgroups but no
 * peripheral-level group. Its signal groups are SRU input/output subgroups
 * (plus, as a fallback, a peripheral's ungrouped signals).
 *
 * Collapsed by default; expand state is local to this group so multiple
 * groups can be open independently of one another. If a search result (or
 * any other action) selects one of this group's signal groups while it's
 * collapsed, it auto-opens once and briefly flashes, so the selection is
 * never hidden inside a closed accordion. The user remains free to collapse
 * it again afterwards - selecting an already-visible row in an open group
 * doesn't retrigger the flash, but reselecting the same row again after a
 * manual collapse does reopen it.
 */
export default function SruPeripheralGroup({
	sectionKind,
	group,
	signalGroups
}: SruPeripheralGroupProps) {
	const [isOpen, setIsOpen] = useState(false);
	const isOpenRef = useRef(isOpen);
	const containerRef = useRef<HTMLDivElement>(null);
	isOpenRef.current = isOpen;

	const dispatch = useAppDispatch();
	const selectedSignalGroupKey = useSruSelectedSignalGroupKey();
	const selectionSequence = useSruSelectionSequence();
	const navigationGroupReveal = useSruNavigationGroupReveal();

	const {highlighted, triggerHighlight} = usePeripheralHighlight(
		() => {
			setIsOpen(true);
		}
	);

	useEffect(() => {
		const containsSelection = signalGroups.some(
			signalGroup => signalGroup.key === selectedSignalGroupKey
		);

		if (containsSelection && !isOpenRef.current) {
			triggerHighlight();
		}
		// Keyed on `selectionSequence` rather than `selectedSignalGroupKey`
		// so that reselecting the same key after a manual collapse still
		// re-runs this - the key alone doesn't change value in that case.
		// Re-running on every `signalGroups`/`triggerHighlight` identity
		// change would risk re-flashing without a new selection.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectionSequence]);

	useEffect(() => {
		if (
			navigationGroupReveal?.sectionKind === sectionKind &&
			navigationGroupReveal.group === group
		) {
			triggerHighlight();
			containerRef.current?.scrollIntoView({
				behavior: 'instant' as ScrollBehavior,
				block: 'nearest'
			});
			dispatch(clearNavigationGroupReveal());
		}
		// Keyed on the sequence so repeat requests reopen and re-highlight a
		// group even when the section and group values are unchanged.
		// Cleared after handling so a remount does not replay the last reveal.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [navigationGroupReveal?.sequence]);

	return (
		<div ref={containerRef} className={styles.groupContainer}>
			<Accordion
				title={group}
				caption={
					<Badge
						appearance='primary'
						size='medium'
						dataTest={`sru-group-count-${group}`}
					>
						{signalGroups.length}
					</Badge>
				}
				isOpen={isOpen}
				highlight={highlighted}
				toggleExpand={() => {
					setIsOpen(open => !open);
				}}
				body={
					<div>
						{signalGroups.map(signalGroup => (
							<SruPeripheralItem
								key={signalGroup.key}
								signalGroup={signalGroup}
							/>
						))}
					</div>
				}
			/>
		</div>
	);
}
