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
  Replacement for `jsdoc-js/require-throws` (eslint-plugin-jsdoc, loaded via an eslint
  jsPlugin), as used by `cfs-ccm-lib` at its default options. See require-jsdoc.js for
  why this can't just stay an eslint-plugin-jsdoc jsPlugin.

  Verified empirically against the original rule (see PR description for the spikes):
  it only fires on functions that *already* have a leading JSDoc block (functions with
  no docs at all are require-jsdoc's concern, not this one's); it ignores `async`
  functions entirely (an async function's throw rejects the returned promise, it
  doesn't throw synchronously); it only looks at throws in the function's own body,
  not in nested function/arrow expressions; and — confirmed by testing real
  `cfs-ccm-lib` constructors against an isolated install of eslint-plugin-jsdoc, since
  the "why" isn't obvious from a quick read of its source — it never flags
  constructors, accessibility modifier or not.

  `@abstract`/`@virtual`/`@type` tag exemptions and the "@throws {never}" mismatch
  check are not reimplemented: `cfs-ccm-lib` uses none of them today.
*/

/**
 * Does `node`'s own function body contain a throw, without descending into nested
 * function bodies.
 * @param {import('eslint').Rule.Node | null | undefined} node a statement or expression
 * @returns {boolean} true if a throw statement was found
 */
function hasOwnThrow(node) {
	if (!node) {
		return false;
	}

	switch (node.type) {
		case "ThrowStatement":
			return true;
		case "BlockStatement":
			return node.body.some(hasOwnThrow);
		case "IfStatement":
			return hasOwnThrow(node.consequent) || hasOwnThrow(node.alternate);
		case "DoWhileStatement":
		case "ForInStatement":
		case "ForOfStatement":
		case "ForStatement":
		case "LabeledStatement":
		case "WhileStatement":
			return hasOwnThrow(node.body);
		case "SwitchStatement":
			return node.cases.some((switchCase) =>
				switchCase.consequent.some(hasOwnThrow)
			);
		case "TryStatement":
			return (
				hasOwnThrow(node.handler?.body) || hasOwnThrow(node.finalizer)
			);
		default:
			return false;
	}
}

/**
 * @param {import('eslint').Rule.Node} fnNode a function-like node
 * @returns {boolean} true if the function synchronously throws in its own scope
 */
function throwsSynchronously(fnNode) {
	return !fnNode.async && hasOwnThrow(fnNode.body);
}

/**
 * The comment documenting a declaration doesn't always sit directly above the
 * declaration node itself: `export function f() {}` and `export const f = () => {}`
 * have their leading comment above the `export` keyword (or, for the latter, above the
 * whole `const` statement), not above the function node. Everywhere else, the function
 * node is its own anchor. Class method values are handled separately by the caller,
 * since their anchor is the enclosing `MethodDefinition`, not an export wrapper.
 * @param {import('eslint').Rule.Node} node a FunctionDeclaration, FunctionExpression,
 *   or ArrowFunctionExpression
 * @returns {import('eslint').Rule.Node} the node whose leading position anchors the
 *   JSDoc comment
 */
function getDeclarationAnchor(node) {
	const parent = node.parent;
	if (
		parent?.type === "ExportNamedDeclaration" ||
		parent?.type === "ExportDefaultDeclaration"
	) {
		return parent;
	}

	// `export const f = () => {}` / `export const f = function () {}`
	if (parent?.type === "VariableDeclarator" && parent.init === node) {
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
 * @param {import('eslint').SourceCode} sourceCode the rule's source code
 * @param {import('eslint').Rule.Node} node a function-like node
 * @returns {string | undefined} the JSDoc block's text, if one immediately precedes it
 */
function getLeadingJsdocText(sourceCode, node) {
	const comments = sourceCode.getCommentsBefore(node);
	const last = comments.at(-1);
	return last?.type === "Block" && last.value.startsWith("*")
		? last.value
		: undefined;
}

const EXEMPT_TAGS = /(?:^|\n)\s*\*\s*@(abstract|virtual|type)\b/;
const THROWS_TAG = /(?:^|\n)\s*\*\s*@(throws|exception)\b/;

/**
 * @param {import('eslint').SourceCode} sourceCode the rule's source code
 * @param {import('eslint').Rule.Node} fnNode a function-like node
 * @param {import('eslint').Rule.Node} [commentAnchor] the node the JSDoc block
 *   actually precedes, if different from `fnNode` (e.g. a method's `MethodDefinition`
 *   rather than its value `FunctionExpression`, which starts after the method name)
 */
function checkFunction(context, sourceCode, fnNode, commentAnchor = fnNode) {
	const jsdocText = getLeadingJsdocText(sourceCode, commentAnchor);
	if (jsdocText === undefined || EXEMPT_TAGS.test(jsdocText)) {
		return;
	}

	if (THROWS_TAG.test(jsdocText)) {
		return;
	}

	if (throwsSynchronously(fnNode)) {
		context.report({ node: fnNode, messageId: "missingThrows" });
	}
}

/** @type {import('eslint').Rule.RuleModule} */
export const requireThrows = {
	meta: {
		type: "suggestion",
		schema: [],
		messages: {
			missingThrows: "Missing JSDoc @throws declaration."
		}
	},
	create(context) {
		const { sourceCode } = context;

		return {
			FunctionDeclaration(node) {
				checkFunction(context, sourceCode, node, getDeclarationAnchor(node));
			},
			FunctionExpression(node) {
				const { parent } = node;
				if (parent?.type === "MethodDefinition") {
					if (parent.kind !== "constructor") {
						checkFunction(context, sourceCode, node, parent);
					}
				} else {
					checkFunction(
						context,
						sourceCode,
						node,
						getDeclarationAnchor(node)
					);
				}
			},
			ArrowFunctionExpression(node) {
				checkFunction(context, sourceCode, node, getDeclarationAnchor(node));
			}
		};
	}
};
