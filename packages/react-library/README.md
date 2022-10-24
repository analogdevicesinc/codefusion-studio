# React Library

This is a shared react library of components for re-use within this monorepo. Components are built and bundled with vite and can be previewed with Storybook.

## Adding New Components

Add new components in their own directory under `src/components`. Each component should consist, at the minimum, of: a `.tsx` file defining the component, a `.stories.tsx` file which documents the component usage, and a CSS module file for styling. Any new components will need to be exported in `src/main.ts`.

## Integrating This Library

To add these components to another library in the monorepo, include the package as a dependency via the package.json:

```bash
dependencies: {
	...
	"cfs-react-library": "workspace:^",
	...
}
```

## Resources

Some helpful links for developing UI components:

* [ADI's UI/UX Documentation Hub](https://harmonic.app.analog.com/1816b7bc5/p/187bc5-harmonic-design-system#)
* [VS Code UX Guidelines for Extension Developers](https://code.visualstudio.com/api/ux-guidelines/overview)
* [Component Gallery - A collection of many design systems and open source components](https://component.gallery/)
* [WAI Guidelines and Code Examples for UI Patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
