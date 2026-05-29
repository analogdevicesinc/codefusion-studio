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

import CfsSearchableGroupSelect from "../../../common/components/cfs-searchable-group-select/CfsSearchableGroupSelect";
import {useLocaleContext} from '../../../common/contexts/LocaleContext';
import {
	useBoard,
	useCompatibilityStatus,
	useErrors,
	useRunModelOn,
	useSoc
} from "../state/slices/workspace.selector";
import { useAppDispatch } from "../state/store";
import styles from './SocSection.module.scss';
import { useEffect, useState } from "react";
import { messenger } from "../../../common/contexts/MessengerContext";
import type {CorePart, SoC} from 'cfs-ccm-lib/dist';
import formatCatalog from "../../../workspace-creation/src/utils/catalog-formatter";
import {
	setBoard,
	setSoc,
	toggleRunModelOnCore,
	validateWorkspace
} from '../state/slices/workspace-reducer';
import { type SelectionGroup } from "../../../common/components/cfs-grouped-radio-selection/CfsGroupedRadioSelection";
import { Badge, Divider, DropDown } from "cfs-react-library";
import Toggle from "../../../common/components/toggle/Toggle";
import { Spinner } from "../../../common/components/spinner/Spinner";
import { checkCompatibility } from "../state/thunks/workspace-thunks";
import CircledCheckmarkIcon from "../../../common/icons/CircledCheckmark";
import ConflictIcon from "../../../common/icons/Conflict";
import { getCatalog } from "@constants/messages/model-to-workspace";

type SocCatalog = Array<
	SoC & {
		cores: Array<CorePart & { aiSupported: boolean }>;
	}
>;

export function SocSection() {
	const [socs, setSocs] = useState<SelectionGroup[]>([]);
	const [catalog, setCatalog] = useState<SocCatalog>([]);

	const [socLoadError, setSocLoadError] = useState<string>();
	const [socLoading, setSocLoading] = useState(false);

	useEffect(() => {
		setSocLoading(true);
		messenger
			.sendRequest(getCatalog, {type: 'extension'})
			.then(socs => {
				setCatalog(socs as SocCatalog);
				setSocLoading(false);
				setSocs(
					formatCatalog(socs as SocCatalog).map(family => ({
						id: family.familyId,
						label: family.familyName,
						options: family.socs.map(soc => ({
							id: soc.id,
							label: soc.name,
							description: soc.description
						}))
					}))
				);
			})
			.catch(err => {
				setSocLoading(false);
				setSocLoadError(
					err instanceof Error ? err.message : String(err)
				);
			});
	}, []);

	const l10n = useLocaleContext()?.socSection;

	const dispatch = useAppDispatch();

	const soc = useSoc();

	return (
		<div className={styles.container}>
			<h2 className={styles.title}>{l10n?.title}</h2>
			{!socLoadError && !socLoading && (
				<CfsSearchableGroupSelect
					groupedOptions={socs}
					selectedOption={soc}
					setSelectedOption={opt => {
						dispatch(setSoc(opt));
						void dispatch(checkCompatibility());
					}}
					renderSelectedContent={soc => (
						<SelectedSocContent catalog={catalog} soc={soc} />
					)}
					renderTitleEnhancement={socId => (
						<CompatibilityTestState soc={socId} />
					)}
				/>
			)}
			{socLoadError && (
				<div className={styles.error}>{l10n?.unsupported}</div>
			)}
			{socLoading && (
				<div className={styles.loading}>
					<Spinner />
				</div>
			)}
		</div>
	);
}

function CompatibilityTestState({ soc }: { readonly soc: string }) {
	const l10n = useLocaleContext()?.socSection;

	const compatStatus = useCompatibilityStatus(soc);

	if (!compatStatus) {
		return null;
	}

	if (compatStatus === "error") {
		return (
			<div className={styles.compatibilityStatus}>
				<ConflictIcon />
				{l10n?.compatibilityTestError}
			</div>
		);
	}

	if (typeof compatStatus === "object") {
		const anyCompatible = Object.values(compatStatus).some(
			status => typeof status === 'boolean' && status
		);

		return anyCompatible ? (
			<div className={styles.compatibilityStatus}>
				<CircledCheckmarkIcon />
				{l10n?.compatible}
			</div>
		) : (
			<div className={styles.compatibilityStatus}>
				<ConflictIcon />
				{l10n?.incompatible}
			</div>
		);
	}

	return (
		<div className={styles.compatibilityStatus}>
			<Spinner />
			{l10n?.testingCompatibility}
		</div>
	);
}

function SelectedSocContent({
	catalog,
	soc
}: {
	readonly catalog: SocCatalog;
	readonly soc?: string;
}) {
	const dispatch = useAppDispatch();
	const l10n = useLocaleContext()?.socSection;

	const board = useBoard();
	const runModelOn = useRunModelOn();
	const errors = useErrors();

	const compatStatus = useCompatibilityStatus(soc ?? "");

	const socData = catalog.find((s) => s.name === soc);

	return (
		<div className={styles.selectedContent}>
			<Divider />
			<div className={styles.option}>
				<h6>{l10n?.selectBoard}</h6>
				<DropDown
					controlId='board-select'
					error={errors?.board}
					noValueOption={{
						label: l10n?.selectBoardPlaceholder,
						value: ''
					}}
					dataTest='select-soc-board-select'
					currentControlValue={board}
					options={
						socData?.boards.map(b => ({
							label: b.name,
							id: b.id,
							value: b.name
						})) ?? []
					}
					onHandleDropdown={val => {
						dispatch(setBoard(val));
						void dispatch(checkCompatibility());

						if (errors?.board) {
							dispatch(validateWorkspace());
						}
					}}
				/>
			</div>
			<Divider />
			<h6>{l10n?.cores}</h6>
			{socData?.cores.map(
				(core: CorePart & {aiSupported: boolean}) => (
					<div key={core.id} className={styles.option}>
						<span>
							{core.name}
							{!core.aiSupported && (
								<Badge appearance='secondary'>
									{l10n?.unsupported}
								</Badge>
							)}
							{typeof compatStatus === 'object' &&
								compatStatus[core.dataModelCoreID] !== undefined && (
									<Badge appearance='secondary'>
										{compatStatus[core.dataModelCoreID] === 'error'
											? l10n?.error
											: compatStatus[core.dataModelCoreID]
												? l10n?.compatible
												: l10n?.incompatible}
									</Badge>
								)}
						</span>
						<div
							className={`${styles.toggleContainer} ${core.aiSupported ? '' : styles.disabled}`}
						>
							<Toggle
								isToggledOn={runModelOn?.includes(core.id)}
								isDisabled={!core.aiSupported}
								handleToggle={() => {
									dispatch(toggleRunModelOnCore(core.id));
								}}
							/>
							<span>{l10n?.runModelOnCore}</span>
						</div>
					</div>
				)
			)}
		</div>
	);
}

