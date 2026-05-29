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
import {EmptyState} from 'cfs-react-library';
import {type TLocaleContext} from '../../../../common/types/l10n';
import {useLocaleContext} from '../../../../common/contexts/LocaleContext';

type EmptyReason = 'noSessions' | 'notHalted' | 'noData' | 'readError';

const errorReasons = new Set<EmptyReason>(['readError']);

type EmptyContainerProps = {
	readonly emptyReason: EmptyReason;
	readonly dataTest?: string;
};

export default function EmptyContainer({
	emptyReason,
	dataTest
}: EmptyContainerProps) {
	const l10n: TLocaleContext | undefined = useLocaleContext()?.empty;

	return (
		<EmptyState
			type={errorReasons.has(emptyReason) ? 'error' : 'warning'}
			dataTest={dataTest}
			hasBorder={false}
			title={l10n?.[emptyReason]?.title}
			description={l10n?.[emptyReason]?.description}
		/>
	);
}
