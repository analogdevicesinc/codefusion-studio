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
import {useMemo} from 'react';
import {
	DropDown,
	EmptyState,
	type DropDownOptions
} from 'cfs-react-library';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../common/contexts/LocaleContext';
import {navigationItems} from '../../../../../../common/constants/navigation';
import {setActiveScreen} from '../../../../state/slices/app-context/appContext.reducer';
import {useSigningKeys} from '../../../../state/slices/app-context/appContext.selector';
import {useAppDispatch} from '../../../../state/store';
import styles from './assign-sign-key.module.scss';

export const INHERIT_VALUE = 'inherit';

type AssignSignKeyProps = Readonly<{
	className?: string;
	variant?: 'package' | 'image';
	selectedKey?: string;
	onKeyChange?: (key: string | undefined) => void;
}>;

function AssignSignKey({
	className,
	variant = 'package',
	selectedKey,
	onKeyChange
}: AssignSignKeyProps) {
	const dispatch = useAppDispatch();
	const signingKeys = useSigningKeys();
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.mcubootConfig?.applicationPackage?.[
			'sign-key'
		];

	const hasKeys = signingKeys.length > 0;

	const inheritLabel =
		l10n?.inheritFromParent ?? 'Inherit from parent';

	const dropdownOptions: DropDownOptions = useMemo(() => {
		const options: DropDownOptions = [
			{
				value: '',
				label: l10n?.noKey ?? 'No key',
				dataTest: 'assign-sign-key:no-key'
			}
		];

		if (variant === 'image') {
			options.push({
				value: INHERIT_VALUE,
				label: inheritLabel,
				dataTest: 'assign-sign-key:inherit'
			});
		}

		for (const key of signingKeys) {
			options.push({
				value: key.path,
				label: key.name,
				dataTest: `assign-sign-key:${key.name}`
			});
		}

		return options;
	}, [signingKeys, variant, l10n, inheritLabel]);

	const displayValue = useMemo(
		() => selectedKey ?? '',
		[selectedKey]
	);

	const handleDropdownChange = (value: string) => {
		if (!onKeyChange) return;

		if (value === '') {
			onKeyChange(undefined);
		} else {
			onKeyChange(value);
		}
	};

	return (
		<div
			className={
				className
					? `${styles.container} ${className}`
					: styles.container
			}
			data-test='application-package-summary:assign-sign-key'
		>
			<div className={styles.header}>
				<span className={styles.title}>{l10n?.title}</span>
				<span className={styles.optionalText}>{l10n?.optional}</span>
			</div>
			{hasKeys ? (
				<div className={styles.keyContainer}>
					<div className={styles.description}>
						{variant === 'image'
							? l10n?.imageDescription
							: l10n?.description}{' '}
						<button
							type='button'
							className={styles.link}
							onClick={() => {
								dispatch(setActiveScreen(navigationItems.settings));
							}}
						>
							{l10n?.settingslinkText}
						</button>
					</div>
					<div className={styles.dropdownContainer}>
						<DropDown
							controlId='assign-sign-key'
							currentControlValue={displayValue}
							options={dropdownOptions}
							dataTest='assign-sign-key:dropdown'
							onHandleDropdown={handleDropdownChange}
						/>
					</div>
				</div>
			) : (
				<div className={styles.noKeyContainer}>
					<EmptyState
						title={l10n?.emptyKey}
						description={l10n?.emptyKeyDescription}
						linkText={l10n?.settingslinkText}
						dataTest='application-package-summary:assign-key-empty-state'
						onLinkClick={() => {
							dispatch(setActiveScreen(navigationItems.settings));
						}}
					/>
				</div>
			)}
		</div>
	);
}

export default AssignSignKey;
