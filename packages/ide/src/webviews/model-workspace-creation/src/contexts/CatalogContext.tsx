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
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState
} from 'react';
import type React from 'react';
import type {SocCatalog} from '../state/slices/workspace-reducer';

// Module-level ref so thunks can call resolveCoreDataModelId without
// receiving the catalog as a parameter.
let _catalog: SocCatalog = [];

/**
 * Resolves a CorePart.id to its dataModelCoreID for the given SoC.
 * Available as a standalone function for use in Redux thunks, and also
 * exposed on the context value for use in components.
 */
export function resolveCoreDataModelId(
	socName: string,
	corePartId: string
): string | undefined {
	return _catalog
		.find(s => s.name === socName)
		?.cores.find(c => c.id === corePartId)?.dataModelCoreID;
}

type CatalogContextValue = {
	catalog: SocCatalog;
	setCatalog: (catalog: SocCatalog) => void;
	resolveCoreDataModelId: typeof resolveCoreDataModelId;
};

const CatalogContext = createContext<CatalogContextValue>({
	catalog: [],
	setCatalog() {
		/* Noop by default */
	},
	resolveCoreDataModelId
});

export const useCatalogContext = () => useContext(CatalogContext);

export function CatalogProvider({
	children
}: {
	readonly children: React.ReactNode;
}) {
	const [catalog, setCatalog] = useState<SocCatalog>([]);

	const updateCatalog = useCallback((newCatalog: SocCatalog) => {
		_catalog = newCatalog;
		setCatalog(newCatalog);
	}, []);

	const context = useMemo(
		() => ({
			catalog,
			setCatalog: updateCatalog,
			resolveCoreDataModelId
		}),
		[catalog, updateCatalog]
	);

	return (
		<CatalogContext.Provider value={context}>
			{children}
		</CatalogContext.Provider>
	);
}
