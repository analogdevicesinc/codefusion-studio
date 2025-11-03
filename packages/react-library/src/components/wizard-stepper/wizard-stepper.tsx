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

import Badge from '../badge/badge';
import CheckedIcon from '../icons/checked-icon';
import EditIcon from '../icons/edit-icon';
import styles from './wizard-stepper.module.scss';

export type Step = {
	title: string;
	description?: string;
	substeps?: SubStep[];
	completed?: boolean;
	disabled?: boolean;
};

export type SubStep = {
	title: string;
	badges?: string[];
	disabled?: boolean;
};

export type StepListProps = {
	steps: Step[];
	activeStepIndex?: number;
	onStepClick: (stepIndex: number, substepIndex?: number) => void;
};

export default function StepList({
	steps,
	activeStepIndex,
	onStepClick
}: StepListProps): JSX.Element {
	return (
		<>
			{steps.map((step, index) => (
				<Step
					step={step}
					key={step.title + index}
					active={index === activeStepIndex}
					isLast={index === steps.length - 1}
					onStepClick={substep => onStepClick(index, substep)}
				/>
			))}
		</>
	);
}

type StepProps = {
	step: Step;
	onStepClick: (substep?: number) => void;
	active: boolean;
	isLast: boolean;
};

function Step({
	step,
	onStepClick,
	active,
	isLast
}: StepProps): JSX.Element {
	return (
		<div className={styles.step}>
			<div
				className={styles.stepSidebar}
				onClick={() => onStepClick()}
			>
				<StepStatusCircle
					completed={step.completed}
					active={active}
				/>
				{!isLast && <span className={styles.stepConnectionLine} />}
			</div>
			<div className={styles.stepContent}>
				<div
					className={`${styles.stepInfo} ${step.disabled ? styles.disabled : ''}`}
					tabIndex={step.disabled ? -1 : 0}
					onClick={() => !step.disabled && onStepClick()}
					onKeyDown={e =>
						e.key === 'Enter' && !step.disabled && onStepClick()
					}
				>
					<div className={styles.stepInfoHeader}>
						<h6 className={styles.stepTitle}>{step.title}</h6>
						<div className={styles.editIcon}>
							<EditIcon />
						</div>
					</div>
					{step.description && (
						<span className={styles.stepDescription}>
							{step.description}
						</span>
					)}
				</div>
				{step.substeps?.map((substep, index) => (
					<SubStep
						key={substep.title + index}
						{...substep}
						disabled={step.disabled ? true : substep.disabled}
						onClick={() => onStepClick(index)}
					/>
				))}
			</div>
		</div>
	);
}

type StepStatusCircleProps = {
	completed?: boolean;
	active: boolean;
};

function StepStatusCircle({
	completed,
	active
}: StepStatusCircleProps): JSX.Element {
	return (
		<div
			className={`${styles.stepStatusCircle} ${active ? styles.stepStatusCircleActive : ''}`}
		>
			{completed && <CheckedIcon />}
		</div>
	);
}

type SubStepProps = SubStep & {
	onClick: () => void;
};

function SubStep({
	title,
	badges,
	disabled,
	onClick
}: SubStepProps): JSX.Element {
	return (
		<div
			className={`${styles.substep}  ${disabled ? styles.disabled : ''}`}
			tabIndex={disabled ? -1 : 0}
			onClick={() => !disabled && onClick()}
			onKeyDown={e => e.key === 'Enter' && !disabled && onClick()}
		>
			<span className={styles.substepTitle}>{title}</span>
			<div className={styles.substepBadges}>
				{badges?.map((badge, i) => (
					<Badge key={badge + i}>{badge}</Badge>
				))}
			</div>
			<div className={styles.editIcon}>
				<EditIcon />
			</div>
		</div>
	);
}
