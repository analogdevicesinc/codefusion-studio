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
import {VSCodeButton} from '@vscode/webview-ui-toolkit/react';
import styles from './CodeGenerationError.module.scss';
import ConflictIcon from '@common/icons/Conflict';
import type {navigationItems} from '../../../../../common/constants/navigation';
import {useAppDispatch} from '../../../state/store';
import {
	setActiveFilter,
	setActiveScreen
} from '../../../state/slices/app-context/appContext.reducer';
import EightColumnLayout from '../../../components/eight-column-layout/EightColumnLayout';

type CodeGenenerationErrorProps = {
	readonly pinConflicts?: number;
	readonly hasClockErrors?: boolean;
};

export default function CodeGenerationError({
	pinConflicts,
	hasClockErrors
}: CodeGenenerationErrorProps) {
	const dispatch = useAppDispatch();

	const handleViewClick = (
		id: (typeof navigationItems)[keyof typeof navigationItems]
	) => {
		dispatch(setActiveScreen(id));

		if (id === 'pinmux') dispatch(setActiveFilter('conflict'));
	};

	return (
		<EightColumnLayout
			header='Generate Code: Errors'
			icon={<ConflictIcon width='22' height='22' />}
			subtitle='To generate code there must be no pin conflicts or clock errors.'
			body={
				<>
					{pinConflicts ? (
						<div
							className={styles.errorContainer}
							onClick={() => {
								handleViewClick('pinmux');
							}}
						>
							<h3 data-test='generate-pin-conflicts'>
								<ConflictIcon />
								Pin Conflicts: {pinConflicts}
							</h3>
							<span className={styles.divider} />
							<VSCodeButton appearance='secondary'>View</VSCodeButton>
						</div>
					) : null}
					{hasClockErrors ? (
						<div
							className={styles.errorContainer}
							onClick={() => {
								handleViewClick('clockconfig');
							}}
						>
							<h3 data-test='generate-clock-errors'>
								<ConflictIcon />
								Clock Errors
							</h3>
							<span className={styles.divider} />
							<VSCodeButton appearance='secondary'>View</VSCodeButton>
						</div>
					) : null}
				</>
			}
		/>
	);
}
