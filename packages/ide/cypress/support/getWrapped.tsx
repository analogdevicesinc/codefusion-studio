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
import { Provider } from "react-redux";
import { configurePreloadedStore } from "../../src/webviews/config-tools/src/state/store";
import type { Soc } from "../../src/webviews/common/types/soc";
import { Suspense } from "react";
const mock = await import(
  `../../../cli/src/socs/${Cypress.env("DEV_SOC_ID")}.json`
);

type ResolvedType<T> = T extends Promise<infer R> ? R : T;

function getPreloadedStateStore() {
  return configurePreloadedStore(mock as Soc);
}

type getWrappedProps = {
  readonly component: React.ReactNode;
  readonly reduxStore: ResolvedType<ReturnType<typeof getPreloadedStateStore>>;
};

export function getWrapped({ component, reduxStore }: getWrappedProps) {
  return <Provider store={reduxStore}>{component}</Provider>;
}

export function getSuspendedWrapped({
  component,
  reduxStore,
}: getWrappedProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Provider store={reduxStore}>{component}</Provider>
    </Suspense>
  );
}
