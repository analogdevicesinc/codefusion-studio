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
import styles from './CodeGenerationError.module.scss';
import {Button} from 'cfs-react-library';
import ConflictIcon from '@common/icons/Conflict';
import type {navigationItems} from '../../../../../common/constants/navigation';
import {useAppDispatch} from '../../../state/store';
import {
	setActiveFilter,
	setActiveScreen
} from '../../../state/slices/app-context/appContext.reducer';
import EightColumnLayout from '../../../components/eight-column-layout/EightColumnLayout';

type CodeGenenerationErrorProps = Readonly<{
	pinConflicts: number;
	hasClockErrors: boolean;
	hasFunctionConfigErrors: boolean;
}>;

function ErrorCard({
	id,
	dataTest,
	label,
	clickHandler
}: Readonly<{
	id: (typeof navigationItems)[keyof typeof navigationItems];
	dataTest: string;
	label: string;
	clickHandler: (
		id: (typeof navigationItems)[keyof typeof navigationItems]
	) => void;
}>) {
	return (
		<div data-test={dataTest} className={styles.errorCard}>
			<h3>
				<ConflictIcon />
				{label}
			</h3>
			<span className={styles.divider} />
			<Button
				appearance='secondary'
				onClick={() => {
					clickHandler(id);
				}}
			>
				View
			</Button>
		</div>
	);
}

export default function CodeGenerationError({
	pinConflicts,
	hasFunctionConfigErrors,
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
				<div className={styles.errorsContainer}>
					{pinConflicts ? (
						<ErrorCard
							id='pinmux'
							dataTest='generate:pin-conflicts'
							label={`Pin Conflicts: ${pinConflicts}`}
							clickHandler={handleViewClick}
						/>
					) : null}
					{hasFunctionConfigErrors ? (
						<ErrorCard
							id='config'
							dataTest='generate:function-config-errors'
							label='Function Config Errors'
							clickHandler={handleViewClick}
						/>
					) : null}
					{hasClockErrors ? (
						<ErrorCard
							id='clockconfig'
							dataTest='generate:clock-errors'
							label='Clock Errors'
							clickHandler={handleViewClick}
						/>
					) : null}
				</div>
			}
		/>
	);
}
