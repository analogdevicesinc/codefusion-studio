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
import type {TFormFieldValue} from 'cfs-react-library';
import BooleanControl from '../../../../components/boolean-control/BooleanControl';
import type {ControlCfg} from '@common/types/soc';
import {useAppDispatch} from '../../../../state/store';
import {setAppliedSignalControlValue} from '../../../../state/slices/pins/pins.reducer';

type PinconfigControlToggleProps = Readonly<{
	controlCfg: ControlCfg;
	controlValue?: string;
	defaultControlValue?: string;
	pinId?: string;
	peripheral?: string;
	signal?: string;
	projectId?: string;
}>;

const toBoolean = (value?: string) =>
	typeof value === 'string' && value.toUpperCase() === 'TRUE';

export default function PinconfigControlToggle({
	controlCfg,
	controlValue,
	defaultControlValue,
	pinId,
	peripheral,
	signal,
	projectId
}: PinconfigControlToggleProps) {
	const dispatch = useAppDispatch();
	const {Id, Description} = controlCfg;
	const value = toBoolean(controlValue ?? defaultControlValue);

	const handleControlChange = (
		field: string,
		changedValue: TFormFieldValue | undefined
	) => {
		if (typeof changedValue !== 'boolean') return;

		dispatch(
			setAppliedSignalControlValue({
				control: {
					Peripheral: peripheral,
					Name: signal,
					pinId,
					control: field,
					controlValue: changedValue ? 'TRUE' : 'FALSE'
				},
				projectId
			})
		);
	};

	return (
		<BooleanControl
			control={{
				id: Id,
				type: 'boolean',
				name: Description,
				description: Description
			}}
			testId={`${Id}-${signal}-control-toggle`}
			data={{[Id]: value}}
			onControlChange={handleControlChange}
		/>
	);
}
