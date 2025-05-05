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
import {getClockTypeDictionary} from '../../../utils/clock-nodes';

import styles from '@common/components/accordion/Accordion.module.scss';
import {getControlsForProjectIds} from '../../../utils/api';
import {CfsSuspense} from 'cfs-react-library';
import {useMemo} from 'react';
import {getPrimaryProjectId} from '../../../utils/config';
import {CONTROL_SCOPES} from '../../../constants/scopes';

function getIsNodeError(clockNode: ClockNodeState, diagramData: any) {
	const isNodeEnabled = diagramData[clockNode.Name]?.enabled;

	return (
		isNodeEnabled &&
		(Object.values(clockNode.Errors ?? {}).length ||
			Object.values(clockNode.controlValues ?? {}).some(
				controlValue => controlValue === ''
			))
	);
}

export default function ClockConfigSideContainer() {
	const dispatch = useAppDispatch();
	const clockNodesState = useClockNodes();
	const activeClockNodeType = useActiveClockNodeType();
	const clockNodeDetailsTargetNode = useClockNodeDetailsTargetNode();
	const diagramData = useDiagramData();
	const nodeTypeDictionary = getClockTypeDictionary();

	const controlsPromise = useMemo(
		async () =>
			clockNodeDetailsTargetNode
				? getControlsForProjectIds(
						[getPrimaryProjectId() ?? ''],
						CONTROL_SCOPES.CLOCK_CONFIG
					)
				: Promise.resolve({}),
		[clockNodeDetailsTargetNode]
	);

	const toggleExpandMenu = (clockNodeType: string) => {
		dispatch(setActiveClockNodeType(clockNodeType));
	};

	const handleClockClick = (clockNode: string) => {
		dispatch(setClockNodeDetailsTargetNode(clockNode));
	};

	if (clockNodeDetailsTargetNode) {
		return (
			<CfsSuspense>
				<ClockDetails controlsPromise={controlsPromise} />
			</CfsSuspense>
		);
	}

	return (
		<>
			{Object.entries(nodeTypeDictionary).map(
				([clockNodeType, clockNodesForType]) => (
					<Accordion
						key={clockNodeType}
						id={clockNodeType}
						title={clockNodeType.toUpperCase()}
						icon={
							Object.values(clockNodesForType).some(({Name}) =>
								getIsNodeError(clockNodesState[Name], diagramData)
							) ? (
								<div
									data-test={`accordion:conflict:${clockNodeType}`}
									id={`${clockNodeType}-conflict`}
									className={styles.conflictIcon}
								>
									<ConflictIcon />
								</div>
							) : null
						}
						body={
							activeClockNodeType === clockNodeType
								? Object.values(clockNodesForType).map(clockNode => (
										<div
											key={clockNode.Name}
											style={{cursor: 'pointer'}}
											data-test={clockNode.Name}
											onClick={() => {
												handleClockClick(clockNode.Name);
											}}
										>
											<div
												style={{
													display: 'flex',
													alignItems: 'center'
												}}
											>
												{clockNode.Name}
												<div style={{flex: 1}} />
												{getIsNodeError(
													clockNodesState[clockNode.Name],
													diagramData
												) && (
													<div
														data-test={`accordion-item:conflict:${clockNode.Name}`}
														id={`${clockNode.Name}-conflict`}
														className={styles.conflictIcon}
													>
														<ConflictIcon />
													</div>
												)}
											</div>
										</div>
									))
								: null
						}
						isOpen={activeClockNodeType === clockNodeType}
						toggleExpand={toggleExpandMenu}
					/>
				)
			)}
		</>
	);
}
