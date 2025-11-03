export default {
	extends: [
		'stylelint-config-standard-scss',
		'stylelint-config-recess-order'
	],
	rules: {
		'selector-class-pattern': null,
		'declaration-property-unit-allowed-list': null,
		'color-named': null,
		'color-no-hex': null,
		'function-disallowed-list': null,
		'comment-empty-line-before': null,
		'custom-property-pattern': null,
		'lightness-notation': null,
		'scss/operator-no-newline-after': null,
		'no-descending-specificity': null,
		'no-duplicate-selectors': null,
		'scss/at-mixin-pattern': null,
		'scss/double-slash-comment-whitespace-inside': null
	}
};
