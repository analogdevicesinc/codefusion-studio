import type React from 'react';
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState
} from 'react';
import {useMessenger} from '../../common/contexts/MessengerContext';
import type {Report} from '@ide-types/report-view-types';
import {reportRequestMessage} from '@constants/messages/report-view-messages';

type ReportContextValue = {
	report?: Report;
	loading: boolean;
	error?: string;
};

export const ReportContext = createContext<
	ReportContextValue | undefined
>({
	loading: true
});

export function useReport<T extends Report>() {
	const ctx = useContext(ReportContext);

	if (!ctx) {
		throw new Error('useReport must be used within ReportProvider');
	} else if (!ctx.report) {
		throw new Error('Report is not loaded yet');
	}

	return ctx.report as T;
}

export function ReportProvider({children}: React.PropsWithChildren) {
	const messenger = useMessenger();
	const [report, setReport] = useState<Report>();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>();

	const fetchReport = useCallback(() => {
		setLoading(true);
		setError(undefined);

		messenger
			.sendRequest(reportRequestMessage, {type: 'extension'})
			.then(res => {
				console.log('Fetched report:', res);
				setReport(res);
			})
			.catch(e => {
				console.error('Error fetching report:', e);
				setError(e instanceof Error ? e.message : String(e));
				setReport(undefined);
			})
			.finally(() => {
				console.log('Finished fetching report');
				setLoading(false);
			});
	}, [messenger]);

	useEffect(() => {
		fetchReport();
	}, [fetchReport]);

	const value = useMemo<ReportContextValue>(
		() => ({
			report,
			loading,
			error
		}),
		[report, loading, error]
	);

	return (
		<ReportContext.Provider value={value}>
			{children}
		</ReportContext.Provider>
	);
}
