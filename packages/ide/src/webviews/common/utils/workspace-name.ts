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

/**
 * Checks whether a workspace name contains characters that are not safe
 * to use as a folder name and, downstream, as an identifier embedded in
 * generated build tasks (e.g. `PROJECT=${config:cfs.project.name}`).
 *
 * Only letters, digits, underscores, periods and hyphens are allowed.
 * Spaces and all other special characters are rejected.
 *
 * Shared by both the "New Workspace" and "Workspace from AI Model"
 * creation webviews so the two flows cannot drift apart.
 * @param wrkspName - The workspace name to validate.
 * @returns `true` if the name contains a disallowed character.
 */
export function isWorkspaceNameInvalid(wrkspName: string): boolean {
	return /[^a-zA-Z0-9_.-]/.test(wrkspName ?? '');
}
