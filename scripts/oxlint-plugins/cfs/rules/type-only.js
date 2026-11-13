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

/*
  Replacement for the `no-restricted-syntax` guard that `cfs-types` relied on under
  ESLint. Oxlint has no `no-restricted-syntax` rule, so the three restricted node
  types are enforced here instead.

  Scope is exactly the three declaration forms the ESLint selectors listed. It is not a
  complete "no runtime code" check: `namespace` blocks containing values, and module
  scope `const`/`let`/`var`, also emit runtime code and are not reported. Both gaps
  predate this rule.

  Messages are reproduced verbatim from the original
  packages/cfs-types/.eslintrc.json so the developer-facing wording does not change.
*/

// Keys double as `messageId`s, so each one must be a node type the rule visits.
const MESSAGES = {
	TSEnumDeclaration:
		"Enums are not allowed in cfs-types. Use union types instead to avoid generating runtime code.",
	ClassDeclaration:
		"Classes are not allowed in cfs-types. This package must contain only type definitions (types and interfaces).",
	FunctionDeclaration:
		"Functions are not allowed in cfs-types. This package must contain only type definitions (types and interfaces)."
};

/**
 * Reports the declaration forms restricted by the original ESLint config.
 *
 * Scope matches those selectors exactly, including ambient `declare` declarations.
 * Widening it is a behaviour change, not a migration concern.
 * @type {import('eslint').Rule.RuleModule}
 */
export const typeOnly = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Disallow declarations that generate runtime code in type-only packages"
		},
		schema: [],
		messages: MESSAGES
	},
	create(context) {
		const report = (node) => {
			context.report({ node, messageId: node.type });
		};

		return {
			TSEnumDeclaration: report,
			ClassDeclaration: report,
			FunctionDeclaration: report
		};
	}
};
