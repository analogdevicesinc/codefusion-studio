import {SubStep} from 'cfs-react-library';
import {StateProject} from '../types/state';

import {
	PRIMARY_ABBR as P,
	SECURE_ABBR as S,
	NON_SECURE_ABBR as NS
} from '@common/constants/core-properties';
import {STEPS_LABELS_DICTIONARY as STEP_LABELS_DICT} from '../constants/workspace-stepper';
import {
	SOC,
	BOARD,
	OPTIONS,
	CORES,
	LOCATION
} from '../constants/workspace-stepper';

type DescriptionContext = {
	selectedSoc?: string;
	boardDesc?: string;
	optionsDesc?: string;
};

export const initializeSteps = (
	navigationItems: Record<string, string>,
	isPredefined: boolean,
	cores: Record<string, StateProject>,
	workspaceName: string,
	isSingleCore: boolean,
	context: DescriptionContext
) => {
	return Object.keys(navigationItems)
		.filter(key =>
			Object.prototype.hasOwnProperty.call(STEP_LABELS_DICT, key)
		)
		.map(key => {
			const id = navigationItems[key as keyof typeof navigationItems];
			const value = getStepValue(
				id,
				isPredefined,
				cores,
				workspaceName,
				context
			);

			return {
				id,
				title: STEP_LABELS_DICT[key as keyof typeof STEP_LABELS_DICT],
				completed: getCompleteStatus(
					id,
					value,
					isPredefined,
					context.optionsDesc
				),
				description: value,
				disabled: getDisableStatus(
					id,
					isPredefined,
					context.optionsDesc
				),
				substeps: getSubstepsForStep(
					id,
					isPredefined,
					cores,
					isSingleCore
				)
			};
		});
};

// Helper functions to find and update steps
const getCompleteStatus = (
	id: string,
	value: string,
	isPredefined: boolean,
	optionsDesc: string | undefined
) => {
	// Special case for CORES step when isPredefined is true
	if (id === CORES && isPredefined && optionsDesc) return true;

	return Boolean(value);
};

const getStepValue = (
	stepId: string,
	isPredefined: boolean,
	cores: Record<string, StateProject>,
	workspaceName: string,
	context: DescriptionContext
): string => {
	switch (stepId) {
		case SOC:
			return context.selectedSoc ?? '';
		case BOARD:
			return context.boardDesc ?? '';
		case OPTIONS:
			return context.optionsDesc ?? '';
		case CORES:
			const {coreSelDesc} = getCoreStepData(
				isPredefined,
				cores,
				false
			);
			return coreSelDesc;
		case LOCATION:
			return workspaceName || '';
		default:
			return '';
	}
};

const getDisableStatus = (
	id: string,
	isPredefined: boolean,
	optionsDesc: string | undefined
) => {
	if (id === CORES && isPredefined && optionsDesc) return true;

	return false;
};

const getCoreStepData = (
	isPredefined: boolean,
	selectedCoresObject: Record<string, StateProject>,
	isSingleCore: boolean
) => {
	let coreSelDesc: string = '';
	let substeps: SubStep[] | undefined = undefined;

	if (!isPredefined) {
		const selectedCores = Object.values(selectedCoresObject).filter(
			core => core.isEnabled
		);
		coreSelDesc = selectedCores.length
			? `${selectedCores.length} Core Projects`
			: '';
		substeps = selectedCores.map((core: StateProject) => ({
			title: core.name,
			badges: getBadges(core, isSingleCore)
		})) as SubStep[];
	}

	return {coreSelDesc, substeps};
};

const getSubstepsForStep = (
	stepId: string,
	isPredefined: boolean,
	cores: Record<string, StateProject>,
	isSingleCore: boolean
): SubStep[] | undefined => {
	switch (stepId) {
		case CORES:
			const {substeps} = getCoreStepData(
				isPredefined,
				cores,
				isSingleCore
			);
			return substeps;
		default:
			return;
	}
};

const getBadges = (
	core: StateProject,
	isSingleCore: boolean
): string[] | undefined => {
	const badges: string[] = [];

	if (core?.isPrimary && isSingleCore) badges.push(P);
	if ((core as StateProject & {Secure?: boolean})?.Secure)
		badges.push(S);
	if ((core as StateProject & {Secure?: boolean})?.Secure === false)
		badges.push(NS);

	return badges.length ? badges : undefined;
};
