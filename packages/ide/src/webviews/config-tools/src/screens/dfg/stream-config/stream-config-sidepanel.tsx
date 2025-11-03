/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import type {DFGEndpoint, DFGStream} from 'cfs-plugins-api';
import {
	Button,
	CfsSuspense,
	Divider,
	DropDown,
	MultiSelect,
	type MultiSelectOption,
	SlidingPanel,
	TextField
} from 'cfs-react-library';
import React, {
	useCallback,
	useEffect,
	useMemo,
	useState
} from 'react';
import DeleteIcon from '../../../../../common/icons/Delete';
import type {ConfigFields} from '../../../../../common/types/soc';
import {CONTROL_SCOPES} from '../../../constants/scopes';
import {
	addNewStream,
	setEditingStream,
	setSelectedGaskets,
	setSelectedStreams,
	updateStream
} from '../../../state/slices/gaskets/gasket.reducer';
import {
	useEditingStream,
	useGasketInputStreamMap,
	useGasketOutputStreamMap,
	useGasketUIProps,
	useStreams
} from '../../../state/slices/gaskets/gasket.selector';
import {useAppDispatch} from '../../../state/store';
import {getControlsForProjectIds} from '../../../utils/api';
import {getProjectInfoList} from '../../../utils/config';
import {
	getGasketDictionary,
	getGasketModel
} from '../../../utils/dfg';
import {DFGControlsView} from '../common/dfg-controls-view';
import {StreamDeleteModal} from '../common/stream-delete-modal';
import styles from './stream-config-sidepanel.module.scss';
import {StreamGroupSelector} from './stream-groups/stream-groups-select';
import {TiedStreamDropdown} from './tied-stream-dropdown';

export function StreamConfigSidePanel() {
	const activeStream = useEditingStream();
	const gaskets = getGasketModel();
	const streams = useStreams();
	const dispatch = useAppDispatch();
	const gasketUIProps = useGasketUIProps();

	// Extract gasket properties
	const sourceGasketProps = activeStream?.Source.Gasket
		? gasketUIProps[activeStream.Source.Gasket]
		: undefined;
	const sourceBufferSizeChoices =
		sourceGasketProps?.OutputBufferSizeChoices ?? [];
	const isSourceEnabled = Boolean(
		activeStream?.Source.Gasket && sourceBufferSizeChoices.length > 1
	);

	const [streamModified, setStreamModified] = useState(false);
	const initialSelectedDestinations =
		activeStream?.Destinations?.map(d => d.Gasket) ?? [];

	const closeSidePanel = useCallback(() => {
		dispatch(setEditingStream(undefined));
		dispatch(setSelectedStreams([]));
		dispatch(setSelectedGaskets([]));
		setStreamModified(false);
	}, [dispatch]);

	const [errors, setErrors] = useState<Record<string, string>>({});

	const [
		additionalAvailableInputGaskets,
		setAdditionalAvailableInputGaskets
	] = useState<Set<string>>(new Set());
	const [
		additionalAvailableOutputGaskets,
		setAdditionalAvailableOutputGaskets
	] = useState<Set<string>>(new Set());

	const [streamToDelete, setStreamToDelete] = useState<
		DFGStream | undefined
	>();

	useEffect(() => {
		if (activeStream === undefined) {
			setErrors({});
			setAdditionalAvailableInputGaskets(new Set());
			setAdditionalAvailableOutputGaskets(new Set());
		}
	}, [activeStream]);

	const streamExists = useMemo(
		() =>
			activeStream &&
			streams.find(s => s.StreamId === activeStream.StreamId),
		[activeStream, streams]
	);

	const handleStreamSubmit = useCallback(() => {
		const errors = validateStream(activeStream);

		if (activeStream && !Object.keys(errors).length) {
			if (streamExists) {
				dispatch(updateStream({updatedStream: activeStream}));
			} else {
				dispatch(addNewStream(activeStream));
			}

			closeSidePanel();
		} else {
			setErrors(errors);
		}
	}, [activeStream, streamExists, dispatch, closeSidePanel]);

	const gasketOutputStreamMap = useGasketOutputStreamMap();
	const gasketInputStreamMap = useGasketInputStreamMap();

	const [availableInputGaskets, availableOutputGaskets] =
		useMemo(() => {
			const availableInput: Record<string, boolean> = {};
			const availableOutput: Record<string, boolean> = {};

			for (const gasket of gaskets) {
				const gasketName: string = gasket.Name;
				// Input gasket availability
				const inputUsage =
					gasketInputStreamMap[gasket.Name]?.length ?? 0;
				const isCurrentDestination =
					activeStream?.Destinations?.some(
						dest => dest.Gasket === gasket.Name
					) ?? false;
				const adjustedInputUsage = isCurrentDestination
					? inputUsage - 1
					: inputUsage;
				const naturallyAvailableInput =
					adjustedInputUsage < gasket.InputStreams.length;
				availableInput[gasket.Name] =
					naturallyAvailableInput ||
					additionalAvailableInputGaskets.has(gasketName);

				// Output gasket availability
				const outputUsage =
					gasketOutputStreamMap[gasket.Name]?.length ?? 0;
				const adjustedOutputUsage =
					gasket.Name === activeStream?.Source.Gasket
						? outputUsage - 1
						: outputUsage;
				const naturallyAvailableOutput =
					adjustedOutputUsage < gasket.OutputStreams.length;
				availableOutput[gasket.Name] =
					naturallyAvailableOutput ||
					additionalAvailableOutputGaskets.has(gasketName);
			}

			return [availableInput, availableOutput];
		}, [
			gaskets,
			gasketInputStreamMap,
			gasketOutputStreamMap,
			activeStream?.Source.Gasket,
			activeStream?.Destinations,
			additionalAvailableInputGaskets,
			additionalAvailableOutputGaskets
		]);

	const setValue = useCallback(
		(value: Partial<DFGStream>) => {
			const sourceGasketProps = value.Source?.Gasket
				? gasketUIProps[value.Source.Gasket]
				: undefined;

			const sourceBufferOutputSizeChoices =
				sourceGasketProps?.OutputBufferSizeChoices ?? [];

			// Handle source gasket changes
			if (value.Source?.Gasket) {
				if (value.Source.Gasket !== activeStream?.Source.Gasket) {
					value.Source.BufferSize = 0;

					// If we're changing away from a previously selected gasket, mark it as additionally available
					// This is used when we select a different gasket, that is otherwise full, it still needs to be selectable in our dropdown
					if (activeStream?.Source.Gasket) {
						setAdditionalAvailableOutputGaskets(prev =>
							new Set(prev).add(activeStream.Source.Gasket)
						);
					}

					// A default override if there is only one choice
					// Since the user will not be able to change the buffer size (disabled dropdown)
					if (sourceBufferOutputSizeChoices.length === 1) {
						value.Source.BufferSize =
							sourceBufferOutputSizeChoices[0];
					}
				}
			}

			const newStream = {...activeStream, ...value};
			dispatch(setEditingStream(newStream));
			setStreamModified(true);
		},
		[activeStream, dispatch, gasketUIProps]
	);

	const updateDestinations = useCallback(
		(options: MultiSelectOption[]) => {
			// Find gaskets that were removed (previously selected but not in new options)
			const currentDestinationGaskets =
				activeStream?.Destinations?.map(d => d.Gasket) ?? [];
			const newDestinationGaskets = options.map(
				option => option.value
			);
			const removedGaskets = currentDestinationGaskets.filter(
				gasket => !newDestinationGaskets.includes(gasket)
			);

			// Add removed gaskets to additionalAvailableInputGaskets
			if (removedGaskets.length > 0) {
				setAdditionalAvailableInputGaskets(prev => {
					const newSet = new Set(prev);

					removedGaskets.forEach(gasket => newSet.add(gasket));

					return newSet;
				});
			}

			const destinations = options.map(option => {
				if (
					activeStream?.Destinations?.find(
						d => d.Gasket === option.value
					)
				) {
					return {
						...activeStream?.Destinations?.find(
							d => d.Gasket === option.value
						)
					};
				}

				// Create a new destination, prefill with a valid buffersize if the selected gasket has only one choice
				const gasket = option.value;
				const bufferSizeChoices =
					gasketUIProps[gasket]?.InputBufferSizeChoices ?? [];
				const bufferSize =
					bufferSizeChoices.length === 1 ? bufferSizeChoices[0] : 0;

				return {
					Gasket: option.value,
					Index: 0,
					BufferSize: bufferSize,
					BufferAddress: 0,
					Config: {}
				};
			});

			setValue({Destinations: destinations as DFGEndpoint[]});
		},
		[
			activeStream,
			gasketUIProps,
			setValue,
			setAdditionalAvailableInputGaskets
		]
	);

	const outputStreamConfig = useMemo(() => {
		const streamIndex =
			(streamExists
				? activeStream?.Source.Index
				: gasketOutputStreamMap[activeStream?.Source.Gasket ?? '']
						?.length) ?? 0;

		return getGasketDictionary()[activeStream?.Source.Gasket ?? '']
			?.OutputStreams?.[streamIndex].Config;
	}, [
		activeStream?.Source.Gasket,
		activeStream?.Source.Index,
		gasketOutputStreamMap,
		streamExists
	]);

	const inputStreamConfigs = useMemo(
		() =>
			activeStream?.Destinations?.map(dest => {
				const gasket = getGasketDictionary()[dest.Gasket ?? ''];
				const streamIndex =
					(streamExists
						? dest.Index
						: gasketInputStreamMap[
								activeStream?.Destinations?.find(
									d => d.Gasket === dest.Gasket
								)?.Gasket ?? ''
							]?.length) ?? 0;

				return gasket?.InputStreams?.[streamIndex].Config;
			}) ?? [],
		[activeStream?.Destinations, gasketInputStreamMap, streamExists]
	);

	const destinationOptions = useMemo(
		() =>
			gaskets
				.filter(g => g.Name && g.Name.trim() !== '') // Filter out empty gasket names
				.map(g => ({
					label: g.Name,
					value: g.Name,
					disabled: !availableInputGaskets[g.Name]
				})),
		[gaskets, availableInputGaskets]
	);

	return (
		<SlidingPanel
			title={
				<div className={styles.title}>
					<StreamDeleteModal
						isOpen={Boolean(streamToDelete)}
						stream={streamToDelete}
						onClose={deleted => {
							setStreamToDelete(undefined);
							if (deleted) closeSidePanel();
						}}
					/>
					{streamExists ? 'Edit' : 'Create'} Stream
					{streamExists && (
						<Button
							dataTest='delete-stream-button'
							appearance='icon'
							onClick={() => {
								setStreamToDelete(activeStream);
							}}
						>
							<DeleteIcon />
						</Button>
					)}
				</div>
			}
			isMinimised={!activeStream}
			closeSlider={() => {
				closeSidePanel();
			}}
			footer={
				<div className={styles.footer}>
					<Button
						id={
							streamExists
								? 'sidepanel-edit-stream'
								: 'sidepanel-create-stream'
						}
						disabled={Boolean(streamExists) && !streamModified}
						onClick={handleStreamSubmit}
					>
						{streamExists ? 'Update' : 'Create'}
					</Button>
				</div>
			}
		>
			{activeStream && (
				<div className={styles.streamConfigPanel}>
					<h5>STREAM OPTIONS</h5>
					<FieldWithLabel label='Source'>
						<DropDown
							controlId='stream-source'
							currentControlValue={activeStream.Source.Gasket}
							dataTest='stream-source'
							error={errors['Source.Gasket']}
							options={[
								{label: '', value: ''},
								...gaskets.map(g => ({
									label: g.Name,
									value: g.Name,
									disabled: !availableOutputGaskets[g.Name]
								}))
							]}
							onHandleDropdown={e => {
								setValue({
									Source: {
										...activeStream.Source,
										Gasket: e
									}
								});
							}}
						/>
					</FieldWithLabel>
					<FieldWithLabel label='Destination'>
						<MultiSelect
							allowClear
							className={styles.fullWidthMultiselect}
							dataTest='stream-destination'
							initialSelectedOptions={initialSelectedDestinations.map(
								d => ({
									label: d,
									value: d
								})
							)}
							error={errors['Destinations.Gasket']}
							options={destinationOptions}
							dropdownText={
								initialSelectedDestinations.length > 0
									? initialSelectedDestinations.length +
										' destinations selected'
									: 'Select Destination DFG'
							}
							size='lg'
							onSelection={updateDestinations}
						/>
					</FieldWithLabel>
					<FieldWithLabel label='Stream Description'>
						<TextField
							inputVal={activeStream.Description}
							dataTest='stream-alias'
							onInputChange={value => {
								setValue({Description: value});
							}}
						/>
					</FieldWithLabel>
					<Divider />
					<GasketOptionsSection
						name={activeStream.Source.Gasket}
						errors={errors}
						stream={activeStream}
						fieldName='Source'
						isEnabled={isSourceEnabled}
						streamConfig={outputStreamConfig}
						setValue={setValue}
						values={sourceBufferSizeChoices}
						defaultValue={activeStream.Source.BufferSize}
					/>
					<Divider />
					{activeStream.Destinations.map((dest, index) => {
						const destinationGasketProps = dest.Gasket
							? gasketUIProps[dest.Gasket]
							: undefined;
						const destinationBufferSizeChoices =
							destinationGasketProps?.InputBufferSizeChoices ?? [];
						const isDestinationEnabled = Boolean(
							dest.Gasket && destinationBufferSizeChoices.length > 1
						);

						return (
							<React.Fragment key={dest.Gasket}>
								<GasketOptionsSection
									name={dest.Gasket}
									errors={errors}
									stream={activeStream}
									fieldName='Destinations'
									defaultValue={dest.BufferSize}
									isEnabled={isDestinationEnabled}
									streamConfig={inputStreamConfigs?.[index]}
									setValue={setValue}
									values={destinationBufferSizeChoices}
									destinationIndex={index}
								/>
								<Divider />
							</React.Fragment>
						);
					})}
					<h5>GROUP</h5>
					<FieldWithLabel label='Group'>
						<StreamGroupSelector
							onSelect={groupName => {
								setValue({Group: groupName});
							}}
						/>
					</FieldWithLabel>
				</div>
			)}
		</SlidingPanel>
	);
}

type GasketOptionsSectionProps = {
	readonly name?: string;
	readonly fieldName: 'Source' | 'Destinations';
	readonly isEnabled: boolean;
	readonly stream: DFGStream;
	readonly setValue: (value: Partial<DFGStream>) => void;
	readonly values: number[];
	readonly defaultValue: number | undefined;
	readonly errors: Record<string, string>;
	readonly streamConfig?: ConfigFields;
	readonly destinationIndex?: number;
};

function GasketOptionsSection({
	name,
	stream,
	isEnabled,
	fieldName,
	values,
	setValue,
	errors,
	defaultValue,
	streamConfig,
	destinationIndex = 0
}: GasketOptionsSectionProps): React.JSX.Element {
	const setOptions = useCallback(
		(options: Partial<DFGEndpoint>) => {
			if (fieldName === 'Destinations') {
				const updatedDestinations = [...(stream.Destinations ?? [])];
				updatedDestinations[destinationIndex] = {
					...updatedDestinations[destinationIndex],
					...options
				};
				setValue({
					Destinations: updatedDestinations
				});
			} else {
				setValue({
					[fieldName]: {
						...stream[fieldName],
						...options
					}
				});
			}
		},
		[fieldName, setValue, stream, destinationIndex]
	);

	const gasket = getGasketModel().find(g => {
		const endpoint =
			fieldName === 'Source'
				? stream.Source
				: stream.Destinations?.[destinationIndex];

		return g.Name === endpoint?.Gasket;
	});

	const [currentControlValue, setCurrentControlValue] = useState<
		string | undefined
	>(defaultValue?.toString() ?? undefined);

	useEffect(() => {
		setCurrentControlValue(defaultValue?.toString() ?? undefined);
	}, [defaultValue]);

	const relatedProjects = useMemo(
		() =>
			getProjectInfoList()
				?.filter(p =>
					gasket?.AssociatedCore
						? p.CoreId === gasket.AssociatedCore
						: p.IsPrimary
				)
				.map(p => p.ProjectId),
		[gasket]
	);

	const controlsPrms = useMemo(async () => {
		const ctls = await getControlsForProjectIds(
			relatedProjects ?? [],
			CONTROL_SCOPES.DFG
		);

		return ctls;
	}, [relatedProjects]);

	return (
		<>
			<h5>
				{fieldName === 'Source' ? 'SOURCE' : 'DESTINATION'} OPTIONS{' '}
				{fieldName === 'Destinations' ? `(${name})` : ''}
			</h5>
			{gasket?.InputAndOutputBuffersTied &&
				fieldName === 'Source' && (
					<FieldWithLabel label='Source Stream'>
						<TiedStreamDropdown
							gasketName={gasket.Name}
							stream={stream}
							onChange={(value: DFGStream) => {
								const inputIndex =
									value.Destinations.find(
										d => d.Gasket === gasket.Name
									)?.Index ?? -1;
								setValue({
									StreamId: gasket.OutputStreams[inputIndex].Index,
									Source: {
										...stream.Source,
										Index: inputIndex
									}
								});
							}}
						/>
						{errors['Source.TiedStream'] && (
							<div
								data-test='source-stream-error'
								className={styles.errorMessage}
							>
								{errors['Source.TiedStream']}
							</div>
						)}
					</FieldWithLabel>
				)}
			<FieldWithLabel label='Buffer Size (Bytes)'>
				<DropDown
					currentControlValue={currentControlValue}
					error={
						errors[
							fieldName === 'Destinations'
								? `${fieldName}.${destinationIndex}.BufferSize`
								: `${fieldName}.BufferSize`
						]
					}
					controlId={fieldName}
					dataTest={`${
						fieldName === 'Source' ? 'Source' : `${name}-Destinations`
					}-buffer-size-selector`}
					isDisabled={!isEnabled}
					options={[
						{label: '', value: ''},
						...values.map(size => ({
							label: size.toString(),
							value: size.toString()
						}))
					]}
					onHandleDropdown={(value: string) => {
						setOptions({
							BufferSize: value ? parseInt(value, 10) : undefined
						});
					}}
				/>
			</FieldWithLabel>
			<CfsSuspense>
				<DFGControlsView
					controlsPrms={controlsPrms}
					propertyName={`${gasket?.Name} DFGStreamConfig`}
					fieldName={fieldName}
					gasketName={name}
					data={
						(fieldName === 'Source'
							? stream.Source.Config
							: stream.Destinations?.[destinationIndex]?.Config) ?? {}
					}
					socConfig={streamConfig ?? {}}
					testId={`${fieldName}-${name}-additionalControls`}
					onControlChange={(field, value) => {
						setOptions({
							Config: {
								...(fieldName === 'Source'
									? stream.Source.Config
									: stream.Destinations?.[destinationIndex]?.Config),
								[field]: value
							}
						});
					}}
				/>
			</CfsSuspense>
		</>
	);
}

type FieldWithLabelProps = {
	readonly label: string;
	readonly children: React.ReactNode;
};

function FieldWithLabel({
	label,
	children
}: FieldWithLabelProps): React.JSX.Element {
	return (
		<div className={styles.fieldWithLabel}>
			<label>{label}</label>
			{children}
		</div>
	);
}

function validateStream(
	stream: DFGStream | undefined
): Record<string, string> {
	if (!stream) {
		return {
			'Source.Gasket': 'Source gasket is required',
			'Destinations.Gasket': 'Destination gasket is required',
			'Source.BufferSize': 'Source buffer size is required',
			'Destinations.BufferSize': 'Destination buffer size is required'
		};
	}

	const errors: Record<string, string> = {};

	if (!stream.Source.Gasket) {
		errors['Source.Gasket'] = 'Source gasket is required';
	}

	if (!stream.Destinations || stream.Destinations.length === 0) {
		errors['Destinations.Gasket'] =
			'At least one destination gasket is required';
	}

	if (!stream.Source.BufferSize) {
		errors['Source.BufferSize'] = 'Source buffer size is required';
	}

	// Validate all destinations have buffer sizes
	stream.Destinations.forEach((dest, index) => {
		if (!dest.BufferSize) {
			errors[`Destinations.${index}.BufferSize`] =
				`Destination ${index + 1} buffer size is required`;
		}
	});

	const gaskets = getGasketDictionary();

	if (
		gaskets[stream.Source.Gasket].InputAndOutputBuffersTied &&
		(stream.Source.Index < 0 || stream.StreamId < 1)
	) {
		errors['Source.TiedStream'] =
			'A valid source stream must be selected for this gasket';
	}

	return errors;
}
