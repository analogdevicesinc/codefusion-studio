/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import Accordion from '@common/components/accordion/Accordion';
import {
	setActiveClockNodeType,
	setClockNodeDetailsTargetNode
} from '../../../state/slices/clock-nodes/clockNodes.reducer';
import {
	useActiveClockNodeType,
	useClockNodeDetailsTargetNode,
	useClockNodes,
	useDiagramData
} from '../../../state/slices/clock-nodes/clockNodes.selector';
import {useAppDispatch} from '../../../state/store';
import ClockDetails from '../clock-details/ClockDetails';
import type {ClockNodeState} from '@common/types/soc';
import ConflictIcon from '../../../../../common/icons/Conflict';
import styles from '@common/components/accordion/Accordion.module.scss';

export default function ClockConfigSideContainer() {
	const dispatch = useAppDispatch();
	const clockNodes = useClockNodes();
	const activeClockNodeType = useActiveClockNodeType();
	const clockNodeDetailsTargetNode = useClockNodeDetailsTargetNode();
	const diagramData = useDiagramData();

	const sortedClockNodeTypes = Object.keys(clockNodes).sort();

	const sortedClockNodes: Array<
		[string, Record<string, ClockNodeState>]
	> = sortedClockNodeTypes.map(clockNodeType => [
		clockNodeType,
		Object.values(clockNodes[clockNodeType])
			.sort((a, b) =>
				a.Name.localeCompare(b.Name, 'en-US', {
					numeric: true,
					sensitivity: 'base'
				})
			)
			// First sort the clockNodes for every type.. then change a structure to something more easily map-able below
			// (this resembles type of Object.entries(clockNodes))
			.reduce<Record<string, ClockNodeState>>(
				(acc, currentClockNode) => ({
					...acc,
					[currentClockNode.Name]: {...currentClockNode}
				}),
				{}
			)
	]);

	const toggleExpandMenu = (clockNodeType: string) => {
		dispatch(setActiveClockNodeType(clockNodeType));
	};

	const handleClockClick = (clockNode: string) => {
		dispatch(setClockNodeDetailsTargetNode(clockNode));
	};

	if (clockNodeDetailsTargetNode) {
		return <ClockDetails />;
	}

	return (
		<>
			{sortedClockNodes.map(([clockNodeType, clockNodesForType]) => (
				<Accordion
					key={clockNodeType}
					title={clockNodeType.toUpperCase()}
					hasError={Object.values(clockNodesForType).some(
						clockNode => {
							const isNodeEnabled =
								diagramData[clockNode.Name]?.enabled;

							return (
								isNodeEnabled &&
								Object.values(clockNode.Errors ?? {}).length
							);
						}
					)}
					body={Object.values(clockNodesForType).map(clockNode => (
						<div
							key={clockNode.Name}
							style={{cursor: 'pointer'}}
							data-test={clockNode.Name}
							onClick={() => {
								handleClockClick(clockNode.Name);
							}}
						>
							<div style={{display: 'flex', alignItems: 'center'}}>
								{clockNode.Name}
								<div style={{flex: 1}} />
								{Object.values(clockNode.Errors ?? {}).length > 0 && (
									<div
										id={`${clockNode.Name}-conflict`}
										className={styles.conflictIcon}
									>
										<ConflictIcon />
									</div>
								)}
							</div>
						</div>
					))}
					isOpen={
						activeClockNodeType?.toLowerCase() ===
						clockNodeType?.toLowerCase()
					}
					toggleExpandMenu={toggleExpandMenu}
				/>
			))}
		</>
	);
}
