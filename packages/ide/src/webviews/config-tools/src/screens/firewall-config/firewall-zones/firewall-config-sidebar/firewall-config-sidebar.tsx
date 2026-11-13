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

import {useEffect} from 'react';
import {
	DropDown,
	type DropDownOptions,
	InlineEditField,
	SlidingPanel,
	ConflictIcon,
	EditIcon
} from 'cfs-react-library';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../common/contexts/LocaleContext';
import {localizeMessage} from '../../../../../../common/utils/localization';
import {formatAddressOverlapMessage} from '../../firewall-conflict-messages';
import {
	setActiveResponderConfig,
	updateResponderConfig
} from '../../../../state/slices/firewall/firewall.reducer';
import {
	useActiveResponderConfig,
	useResponderConfig,
	useResponderOverlapConflict
} from '../../../../state/slices/firewall/firewall.selector';
import {useAppDispatch} from '../../../../state/store';
import {useEditableField} from '../../../../hooks/use-editable-field';
import {
	findResponderChild,
	getResponderRegionInfo,
	getResponderStartAddressOptions,
	getResponderSubtitle,
	isMemoryRegionResponder,
	resolveResponderFields
} from '../../firewall-data';
import styles from './firewall-config-sidebar.module.scss';

function FirewallConfigSidebar() {
	const dispatch = useAppDispatch();
	const target = useActiveResponderConfig();
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.firewallZones?.['responder-config'];

	const parent: string | undefined = target?.parent;
	const child: string | undefined = target?.child;
	const isEditable =
		parent && child ? isMemoryRegionResponder(parent, child) : false;

	const config = useResponderConfig(parent, child);
	const {name, description, startAddress} = resolveResponderFields(
		target,
		config
	);

	const startAddressOptions: DropDownOptions =
		getResponderStartAddressOptions().map(address => ({
			value: address,
			label: address,
			dataTest: `firewall-zones:responder-config:start-address:${address}`
		}));

	const regionInfo = getResponderRegionInfo(startAddress);

	const overlappingRegion = useResponderOverlapConflict(
		parent,
		child
	);

	const overlapError = overlappingRegion
		? formatAddressOverlapMessage(l10n, overlappingRegion)
		: undefined;

	const overlapBanner =
		overlappingRegion && parent && child
			? localizeMessage(l10n, 'addressOverlapBanner', {
					regionName:
						findResponderChild(parent, child)?.name ?? child,
					conflictingRegionName: overlappingRegion
				})
			: undefined;

	const labels = {
		name: (l10n?.name as string) ?? 'Name',
		namePlaceholder:
			(l10n?.namePlaceholder as string) ?? 'Enter name',
		description: (l10n?.description as string) ?? 'Description',
		descriptionPlaceholder:
			(l10n?.descriptionPlaceholder as string) ??
			'<description goes in here — click to inline edit>',
		noDescription:
			(l10n?.noDescription as string) ?? 'No description',
		startAddress: (l10n?.startAddress as string) ?? 'Start Address'
	};

	const nameField = useEditableField({
		initialValue: name,
		onConfirm(value: string) {
			if (!parent || !child) return;
			dispatch(
				updateResponderConfig({
					parent,
					child,
					updates: {name: value}
				})
			);
		}
	});

	const descriptionField = useEditableField({
		initialValue: description,
		allowEmpty: true,
		onConfirm(value: string) {
			if (!parent || !child) return;
			dispatch(
				updateResponderConfig({
					parent,
					child,
					updates: {description: value}
				})
			);
		}
	});

	useEffect(() => {
		nameField.cancelEdit();
		descriptionField.cancelEdit();
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only reset on responder switch, callbacks are stable
	}, [parent, child]);

	const handleClose = () => {
		dispatch(setActiveResponderConfig(undefined));
	};

	const renderReadOnly = (value: string, fallback: string) => (
		<span className={styles.readOnlyValue}>
			{value.trim() ? value : fallback}
		</span>
	);

	const renderEditable = ({
		field,
		value,
		placeholder,
		dataTest,
		className
	}: {
		field: ReturnType<typeof useEditableField>;
		value: string;
		placeholder: string;
		dataTest: string;
		className?: string;
	}) =>
		field.isEditing ? (
			<div className={styles.editFieldSlot}>
				<InlineEditField
					ref={field.inputRef}
					inputVal={field.editValue}
					placeholder={placeholder}
					dataTest={`${dataTest}:edit`}
					maxLength={field.maxLength}
					onInputChange={field.setEditValue}
					onConfirm={field.confirmEdit}
					onCancel={field.cancelEdit}
				/>
			</div>
		) : (
			<div
				className={`${styles.editableField} ${
					className ?? ''
				}`.trim()}
				role='button'
				tabIndex={0}
				data-test={`${dataTest}:trigger`}
				onClick={field.startEditing}
				onKeyDown={event => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						field.startEditing();
					}
				}}
			>
				<span>{value.trim() ? value : placeholder}</span>
				<span>
					<EditIcon />
				</span>
			</div>
		);

	const title = isEditable
		? renderEditable({
				field: nameField,
				value: name,
				placeholder: labels.namePlaceholder,
				dataTest: 'firewall-zones:responder-config:name',
				className: styles.titleField as string
			})
		: (child ?? '').toUpperCase();

	return (
		<SlidingPanel
			title={title}
			description={
				parent && child
					? getResponderSubtitle(parent, child)
					: undefined
			}
			isMinimised={!target}
			dataTest='firewall-zones:responder-config'
			closeSlider={handleClose}
		>
			{target ? (
				<>
					{overlapBanner ? (
						<div
							className={styles.conflictBanner}
							data-test='firewall-zones:responder-config:conflict-banner'
						>
							<span className={styles.conflictBannerIcon}>
								<ConflictIcon width={16} height={16} />
							</span>
							<span className={styles.conflictBannerMessage}>
								{overlapBanner}
							</span>
						</div>
					) : null}
					<div className={styles.content}>
						<span className={styles.label}>{labels.description}</span>
						{isEditable
							? renderEditable({
									field: descriptionField,
									value: description,
									placeholder: labels.descriptionPlaceholder,
									dataTest:
										'firewall-zones:responder-config:description'
								})
							: renderReadOnly(description, labels.noDescription)}
					</div>
					{isEditable ? (
						<div className={styles.content}>
							<span className={styles.label}>
								{labels.startAddress}
							</span>
							<div className={styles.startAddressContainer}>
								<DropDown
									controlId='firewall-zones:responder-config:start-address'
									currentControlValue={startAddress}
									options={startAddressOptions}
									error={overlapError}
									className={styles.startAddressDropdown as string}
									dataTest='firewall-zones:responder-config:start-address'
									onHandleDropdown={value => {
										if (!parent || !child) return;
										dispatch(
											updateResponderConfig({
												parent,
												child,
												updates: {startAddress: value}
											})
										);
									}}
								/>
								{regionInfo ? (
									<div
										className={styles.subtitle}
										data-test='firewall-zones:responder-config:start-address:subtitle'
									>
										<span>{`${regionInfo.sizeLabel} region · Ends at ${regionInfo.endAddress}`}</span>
									</div>
								) : null}
							</div>
						</div>
					) : null}
				</>
			) : null}
		</SlidingPanel>
	);
}

export default FirewallConfigSidebar;
