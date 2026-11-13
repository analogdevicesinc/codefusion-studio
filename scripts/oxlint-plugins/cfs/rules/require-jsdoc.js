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
  Replacement for `jsdoc-js/require-jsdoc` (eslint-plugin-jsdoc, loaded via an eslint
  jsPlugin) as configured for `cfs-ccm-lib`: `publicOnly: true`,
  `require: { ClassExpression: true, MethodDefinition: true }`, `checkConstructors: true`
  (the default). Note `require.FunctionDeclaration` also defaults to `true` upstream and
  `cfs-ccm-lib` never overrides it, so that's checked here too. eslint-plugin-jsdoc
  requires `eslint` at runtime even when only this rule is enabled (its entry point
  unconditionally imports a rule that imports `eslint`), so this is a native
  reimplementation with no such dependency.

  Scope is deliberately narrower than the general-purpose ESLint rule:
    - `ClassExpression` itself is not checked (only `MethodDefinition` and
      `FunctionDeclaration`): `cfs-ccm-lib` has no `const X = class {}` declarations, so
      that visitor was always a no-op in practice.
    - "Exported" is resolved by walking up to the nearest `export`-wrapping ancestor
      (`export class X`, `export default class X`, `export function f() {}`, or
      `export const X = class {}`). The original rule's ESM fast path
      (`exportParser.isUncommentedExport`) covers additional CJS/global patterns that
      `cfs-ccm-lib` (an ESM package) does not use.
    - `exemptEmptyConstructors` is approximated as "constructor takes no parameters".
      The original also checks for an explicit return value, which a constructor
      practically never has.
    - `checkGetters`/`checkSetters` overrides, `contexts`, and the auto-fixer are not
      supported since `cfs-ccm-lib` does not configure them.
*/

/**
 * @param {import('eslint').Rule.Node} node a MethodDefinition
 * @returns {boolean} true if the method is TS-private/protected or a `#`-named field
 */
function isNonPublicMember(node) {
	return (
		(node.accessibility != null && node.accessibility !== "public") ||
		node.key.type === "PrivateIdentifier"
	);
}

/**
 * @param {import('eslint').Rule.Node} node a MethodDefinition
 * @returns {boolean} true for a zero-parameter constructor
 */
function isExemptConstructor(node) {
	return node.kind === "constructor" && node.value.params.length === 0;
}

/**
 * The comment that documents a declaration doesn't always sit directly above the
 * declaration node itself — `export class X` and `export function f() {}` have their
 * leading comment above the `export` keyword, i.e. above the `ExportNamedDeclaration`/
 * `ExportDefaultDeclaration` wrapping the declaration, not above the declaration node.
 * Same for `export const X = <expr>`, whose comment sits above the whole
 * `VariableDeclaration`. Everywhere else, the declaration node is its own anchor.
 * @param {import('eslint').Rule.Node} node a ClassDeclaration, ClassExpression, or
 *   FunctionDeclaration
 * @returns {import('eslint').Rule.Node} the node whose leading position anchors the
 *   JSDoc comment, and whose export-wrapping ancestor (if any) determines visibility
 */
function getDeclarationAnchor(node) {
	const parent = node.parent;
	if (
		parent?.type === "ExportNamedDeclaration" ||
		parent?.type === "ExportDefaultDeclaration"
	) {
		return parent;
	}

	// `export const X = class {}` (only form relevant here; functions assigned to a
	// const are ArrowFunctionExpression/FunctionExpression, not FunctionDeclaration).
	if (parent?.type === "VariableDeclarator") {
		const declaration = parent.parent;
		if (declaration?.type === "VariableDeclaration") {
			return declaration.parent?.type === "ExportNamedDeclaration"
				? declaration.parent
				: declaration;
		}
	}

	return node;
}

/**
 * @param {import('eslint').Rule.Node} anchor the result of {@link getDeclarationAnchor}
 * @returns {boolean} true if the declaration is exported
 */
function isExported(anchor) {
	return (
		anchor.type === "ExportNamedDeclaration" ||
		anchor.type === "ExportDefaultDeclaration"
	);
}

/**
 * @param {import('eslint').SourceCode} sourceCode the rule's source code
 * @param {import('eslint').Rule.Node} node the node to check
 * @returns {boolean} true if a `/** ... *\/` block comment immediately precedes `node`
 */
function hasLeadingJsdoc(sourceCode, node) {
	const comments = sourceCode.getCommentsBefore(node);
	const last = comments.at(-1);
	return last?.type === "Block" && last.value.startsWith("*");
}

/** @type {import('eslint').Rule.RuleModule} */
export const requireJsdoc = {
	meta: {
		type: "problem",
		schema: [],
		messages: {
			missingJsDoc: "Missing JSDoc comment."
		}
	},
	create(context) {
		return {
			MethodDefinition(node) {
				if (isNonPublicMember(node) || isExemptConstructor(node)) {
					return;
				}

				const classBody = node.parent;
				const classNode = classBody?.parent;
				if (!classNode || !isExported(getDeclarationAnchor(classNode))) {
					return;
				}

				if (!hasLeadingJsdoc(context.sourceCode, node)) {
					context.report({ node, messageId: "missingJsDoc" });
				}
			},
			FunctionDeclaration(node) {
				const anchor = getDeclarationAnchor(node);
				if (!isExported(anchor)) {
					return;
				}

				if (!hasLeadingJsdoc(context.sourceCode, anchor)) {
					context.report({ node, messageId: "missingJsDoc" });
				}
			}
		};
	}
};
