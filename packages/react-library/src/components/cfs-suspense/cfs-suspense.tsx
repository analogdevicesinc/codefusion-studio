/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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

import {Suspense, type ReactNode} from 'react';
import ProgressRing from '../progress-ring/progress-ring';
import ErrorBoundary from '../error-boundary/error-boundary';

interface CfsSuspenseProps {
	readonly children: ReactNode;
	readonly fallbackPosition?: 'start' | 'center';
	readonly fallback?: ReactNode;
}

/**
 * CfsSuspense - A component that wraps children in an error boundary and suspense
 * with ProgressRing as the default fallback
 */
function CfsSuspense({
	children,
	fallbackPosition,
	fallback = <ProgressRing position={fallbackPosition}/>
}: CfsSuspenseProps) {
	return (
		<ErrorBoundary>
			<Suspense fallback={fallback}>{children}</Suspense>
		</ErrorBoundary>
	);
}

export default CfsSuspense;
