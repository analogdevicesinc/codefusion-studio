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
import styles from './App.module.scss';
import {useContext} from 'react';
import {MessengerProvider} from '../../common/contexts/MessengerContext';
import {ReportContext, ReportProvider} from './report';
import {CompatibilityReport} from './views/compat/compatibility-report';
import {ProfilingReport} from './views/profile/profiling-report';
import {
	LocalizationProvider,
	useLocaleContext
} from '../../common/contexts/LocaleContext';
import CfsTopBar from '../../common/components/cfs-top-bar/CfsTopBar';
import '../../../../../../node_modules/@vscode/codicons/dist/codicon.css';

function App() {
	return (
		<MessengerProvider>
			<ReportProvider>
				<LocalizationProvider namespace='report-viewer'>
					<ReportViewer />
				</LocalizationProvider>
			</ReportProvider>
		</MessengerProvider>
	);
}

export function ReportViewer() {
	const reportContext = useContext(ReportContext);
	const l10n = useLocaleContext();

	if (!reportContext) return;

	if (reportContext.loading) {
		// Rendering a spinner here would probably take longer than the report loading itself, so just show a loading message instead
		return <div>Loading report...</div>;
	}

	if (reportContext.error) {
		return (
			<div>
				{l10n?.errors['report-load-error']} {reportContext.error}
			</div>
		);
	}

	switch (reportContext.report?.info.type) {
		case 'compat':
			return (
				<div className={styles.appContainer}>
					<CfsTopBar>
						<div slot='center'>
							{reportContext.report?.model_summary?.model_name}{' '}
							{l10n?.compatibility.title}
						</div>
					</CfsTopBar>
					<div className={styles.body}>
						<CompatibilityReport />
					</div>
				</div>
			);
		case 'profile':
			return (
				<div className={styles.appContainer}>
					<CfsTopBar>
						<div slot='center'>
							{reportContext.report?.model_summary?.model_name}{' '}
							{l10n?.profiling.title}
						</div>
					</CfsTopBar>
					<div className={styles.body}>
						<ProfilingReport />
					</div>
				</div>
			);
		default:
			return <div>{l10n?.errors['unknown-report-type']}</div>;
	}
}

export default App;
