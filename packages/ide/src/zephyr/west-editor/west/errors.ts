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

import type { WestEngineErrorKind } from "../types";

export type { WestEngineErrorKind };

/** A failure of the West engine, typed so callers can tell causes apart. */
export class WestEngineError extends Error {
  constructor(
    public readonly kind: WestEngineErrorKind,
    message: string,
    /** Standard error of the command that failed, when there was one. */
    public readonly stderr = "",
  ) {
    super(message);
    this.name = "WestEngineError";
  }
}
