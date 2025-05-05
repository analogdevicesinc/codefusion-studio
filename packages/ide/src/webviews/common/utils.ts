import React, {type ReactNode, type ReactElement} from 'react';

export const isReactElement = (
	node: ReactNode
): node is ReactElement => React.isValidElement(node);
