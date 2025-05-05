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
import type React from 'react';
import {Component} from 'react';

type State = {
	didCatch: boolean;
	error: Error | undefined;
};

const initialState = {
	didCatch: false,
	error: undefined
};

class ErrorBoundary extends Component<{
	children: React.ReactNode;
}> {
	static getDerivedStateFromError(error: Error) {
		return {didCatch: true, error};
	}

	state: State = initialState;

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	resetErrorBoundary = (..._args: unknown[]) => {
		const {error} = this.state;

		if (error !== null) {
			this.setState(initialState);
		}
	};

	componentDidCatch(error: Error, info: React.ErrorInfo) {
		console.error(error, info);
	}

	componentDidUpdate(_prevProps: unknown, prevState: State) {
		const {didCatch} = this.state;

		if (didCatch && prevState.error !== undefined) {
			this.setState(initialState);
		}
	}

	render() {
		const {children} = this.props;
		const {didCatch, error} = this.state;

		const childToRender = children;

		if (didCatch) {
			return (
				<>
					The following error: &quot;{error?.message ?? ''}&quot; was
					thrown by the underlying component.
				</>
			);
		}

		return childToRender;
	}
}

export default ErrorBoundary;
