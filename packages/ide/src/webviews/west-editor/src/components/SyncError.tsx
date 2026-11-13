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
import {InlineMessage} from 'cfs-react-library';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {useMessenger} from '@common/contexts/MessengerContext';
import {localizeWithArgs} from '@common/utils/string';
import {westEditorRevealRequest} from '@west-editor/messages';
import type {WestYamlProblem} from '@west-editor/types';
import {useWestEditor} from '../contexts/WestEditorContext';
import styles from './SyncError.module.scss';

/**
 * The manifest sync error, listing each YAML problem with its location as a
 * link to the text editor. Renders nothing while the manifest is in sync.
 */
export default function SyncError() {
	const l10n = useLocaleContext();
	const messenger = useMessenger();
	const {error, problems} = useWestEditor();

	if (!error) {
		return null;
	}

	const reveal = ({start, end}: WestYamlProblem) => {
		messenger
			.sendRequest(
				westEditorRevealRequest,
				{type: 'extension'},
				{start, end}
			)
			.catch(() => {
				// The host has already logged the failure in the Output Channel
			});
	};

	return (
		<div className={styles.syncError}>
			<InlineMessage
				type='error'
				className={styles.errorMessage}
				dataTest='west-editor:error'
			>
				<div>
					{l10n?.errors.sync}
					{problems ? (
						<>
							{' '}
							{l10n?.errors.invalidYaml}
							{problems.map((problem, index) => (
								<div
									// Errors can share a start offset; the list is rebuilt whole
									key={`${problem.start}-${index}`}
									className={styles.problem}
								>
									<pre className={styles.errorText}>
										{problem.message}{' '}
										<button
											type='button'
											className={styles.location}
											aria-label={localizeWithArgs(
												l10n,
												'errors.revealLabel',
												{line: problem.line, column: problem.column}
											)}
											data-test={`west-editor:error-reveal-${index}`}
											onClick={() => {
												reveal(problem);
											}}
										>
											{localizeWithArgs(l10n, 'errors.location', {
												line: problem.line,
												column: problem.column
											})}
										</button>
										{':\n\n'}
										{problem.frame}
									</pre>
								</div>
							))}
						</>
					) : (
						<pre className={styles.errorText}>{error}</pre>
					)}
				</div>
			</InlineMessage>
		</div>
	);
}
