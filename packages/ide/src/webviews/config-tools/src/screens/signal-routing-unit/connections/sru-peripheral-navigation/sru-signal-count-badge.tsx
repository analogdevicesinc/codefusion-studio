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
import SmallArrowRightIcon from '@common/components/icons/SmallArrowRightIcon';
import {
	type TLocaleContext,
	useLocaleContext
} from '@common/contexts/LocaleContext';
import {localizeMessage} from '@common/utils/localization';
import styles from './sru-signal-count-badge.module.scss';

type SruSignalCountBadgeProps = Readonly<{
	count: number;
	direction: 'input' | 'output';
	dataTest?: string;
	isHighlighted?: boolean;
}>;

/**
 * Small outlined pill showing an SRU signal count alongside a directional
 * arrow - an arrow-then-count for inputs (`→ 4`), a count-then-arrow for
 * outputs (`10 →`).
 */
export default function SruSignalCountBadge({
	count,
	direction,
	dataTest,
	isHighlighted
}: SruSignalCountBadgeProps) {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.signalRoutingUnit?.connections?.signalCount;

	const pluralKey = count === 1 ? 'one' : 'other';
	const messageId =
		direction === 'input'
			? `inputs.${pluralKey}`
			: `outputs.${pluralKey}`;

	const labelFallback =
		direction === 'input'
			? count === 1
				? `${count} input`
				: `${count} inputs`
			: count === 1
				? `${count} output`
				: `${count} outputs`;

	const label = l10n
		? localizeMessage(l10n, messageId, {count: String(count)})
		: labelFallback;

	return (
		<span
			className={`${styles.badge} ${isHighlighted ? styles.highlighted : ''}`}
			aria-label={label}
			data-test={dataTest}
		>
			{direction === 'input' && <SmallArrowRightIcon />}
			{count}
			{direction === 'output' && <SmallArrowRightIcon />}
		</span>
	);
}
