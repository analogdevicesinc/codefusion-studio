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
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState
} from 'react';
import {createPortal} from 'react-dom';
import {type ApplicationPackage} from '../../../../types/application-packages';
import {setActivePackageId} from '../../../../state/slices/application-packages/applicationPackages.reducer';
import {useActivePackageId} from '../../../../state/slices/application-packages/applicationPackages.selector';
import {useAppDispatch} from '../../../../state/store';
import styles from '../mcuboot-config-sidebar.module.scss';
import {DisabledIcon} from 'cfs-react-library';
import {
	useLocaleContext,
	type TLocaleContext
} from '../../../../../../common/contexts/LocaleContext';
import ConflictIcon from '../../../../../../common/icons/Conflict';
import {
	validateCustomTlvTag,
	validateCustomTlvValue
} from '../../custom-tlv/validate-custom-tlv-value';
import {
	countImageValidationErrors,
	validatePackageCoreId,
	validatePackageVersion
} from '../../../../utils/application-package-validation';
import {isPrimaryCore} from '../../../../utils/config';

type MCUBootSidebarListItemProps = {
	readonly applicationPackage: ApplicationPackage;
};

function MCUBootSidebarListItem({
	applicationPackage
}: MCUBootSidebarListItemProps) {
	const dispatch = useAppDispatch();
	const activePackageId = useActivePackageId();
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.mcubootConfig?.applicationPackage;
	const isActive = activePackageId === applicationPackage.id;

	const iconRef = useRef<HTMLSpanElement>(null);
	const [tooltipVisible, setTooltipVisible] = useState(false);
	const [tooltipCoords, setTooltipCoords] = useState({
		top: 0,
		left: 0
	});
	const tooltipTimeoutRef = useRef<
		ReturnType<typeof setTimeout> | undefined
	>(undefined);

	const handleIconMouseEnter = useCallback(() => {
		tooltipTimeoutRef.current = setTimeout(() => {
			if (iconRef.current) {
				const rect = iconRef.current.getBoundingClientRect();
				setTooltipCoords({
					top: rect.bottom + 6,
					left: rect.left + rect.width / 2
				});
				setTooltipVisible(true);
			}
		}, 400);
	}, []);

	const handleIconMouseLeave = useCallback(() => {
		if (tooltipTimeoutRef.current) {
			clearTimeout(tooltipTimeoutRef.current);
			tooltipTimeoutRef.current = undefined;
		}

		setTooltipVisible(false);
	}, []);

	useEffect(
		() => () => {
			if (tooltipTimeoutRef.current) {
				clearTimeout(tooltipTimeoutRef.current);
			}
		},
		[]
	);

	const hasError = useMemo(() => {
		if (validatePackageCoreId(applicationPackage.coreId)) return true;

		if (
			(applicationPackage.images?.length ?? 0) > 1 &&
			isPrimaryCore(applicationPackage.coreId) &&
			validatePackageVersion(applicationPackage.version)
		)
			return true;

		const errorMessages = {
			invalidHex: 'error',
			oddHexLength: 'error',
			hexValueExceedsMax: 'error',
			valueTooLong: 'error',
			tagOutOfRange: 'error'
		};

		const hasTlvError = (tlvs: Array<{tag: number; value: string}>) =>
			tlvs.some(
				tlv =>
					validateCustomTlvValue(tlv.value, errorMessages) ??
					validateCustomTlvTag(tlv.tag, errorMessages)
			);

		return (applicationPackage.images ?? []).some(
			image =>
				countImageValidationErrors(image, {}) > 0 ||
				(Boolean(image.customTLVs?.length) &&
					hasTlvError(image.customTLVs ?? []))
		);
	}, [
		applicationPackage.coreId,
		applicationPackage.version,
		applicationPackage.images
	]);

	const handleClick = useCallback(() => {
		dispatch(setActivePackageId(applicationPackage.id));
	}, [dispatch, applicationPackage.id]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				handleClick();
			}
		},
		[handleClick]
	);

	return (
		<div
			className={`${styles.listItem} ${
				isActive ? styles.active : ''
			}`}
			role='button'
			tabIndex={0}
			data-test={`sidebar:app-pack-item:${applicationPackage.id}`}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
		>
			<div className={styles.listItemDetails}>
				<span className={styles.listItemName}>
					{applicationPackage.name}
				</span>
				{applicationPackage.description && (
					<span className={styles.listItemDescription}>
						{applicationPackage.description}
					</span>
				)}
			</div>
			{applicationPackage.enabled ? (
				hasError && (
					<span
						ref={iconRef}
						className={styles.disabledIcon}
						data-test='sidebar-conflict-icon'
						onMouseEnter={handleIconMouseEnter}
						onMouseLeave={handleIconMouseLeave}
					>
						<ConflictIcon width='13' height='13' />
						{tooltipVisible &&
							createPortal(
								<span
									className={styles.fixedTooltip}
									style={{
										top: tooltipCoords.top,
										left: tooltipCoords.left
									}}
								>
									{l10n?.applicationPackageError?.title}
								</span>,
								document.body
							)}
					</span>
				)
			) : (
				<span
					ref={iconRef}
					className={styles.disabledIcon}
					onMouseEnter={handleIconMouseEnter}
					onMouseLeave={handleIconMouseLeave}
				>
					<DisabledIcon width={13} height={13} />
					{tooltipVisible &&
						createPortal(
							<span
								className={styles.fixedTooltip}
								style={{
									top: tooltipCoords.top,
									left: tooltipCoords.left
								}}
							>
								{l10n?.disabledApplicationPackage?.title}
							</span>,
							document.body
						)}
				</span>
			)}
		</div>
	);
}

export default MCUBootSidebarListItem;
