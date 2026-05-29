/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import {memo} from 'react';
import {createPortal} from 'react-dom';
import DragDropIcon from '@common/icons/drag-drop';

import styles from './floating-card-overlay.module.scss';

type FloatingCardOverlayProps = Readonly<{
	cardOverlay: {
		y: number; // Viewport Y position
		containerLeft: number; // Viewport X of scrollContent
		containerWidth: number;
		listWidth: number;
		rowHeight: number;
		name: string;
		chartImageSrc?: string; // Snapshot of the chart canvas
	};
}>;

/**
 * A lightweight overlay rendered into document.body during drag operations.
 * It composes the left list item + the chart snapshot.
 */
function FloatingCardOverlay({
	cardOverlay: {
		y,
		containerLeft,
		containerWidth,
		listWidth,
		rowHeight,
		name,
		chartImageSrc
	}
}: FloatingCardOverlayProps) {
	const floatingCardStyle: React.CSSProperties = {
		left: `${containerLeft}px`,
		top: `${y - rowHeight / 2}px`,
		width: `${containerWidth}px`,
		height: `${rowHeight}px`
	};

	const card = () => (
		<div
			style={floatingCardStyle}
			className={styles.floatingCardContainer}
		>
			<div className={styles.card}>
				<div
					style={{flex: `0 0 ${listWidth}px`}}
					className={styles.listItem}
				>
					<span className={styles.dragIcon}>
						<DragDropIcon />
					</span>
					<h5 className={styles.name}>{name}</h5>
				</div>
				<div className={styles.chartSnapshot}>
					{chartImageSrc ? (
						<img
							src={chartImageSrc}
							alt='chart snapshot'
							className={styles.chartImage}
						/>
					) : null}
				</div>
			</div>
		</div>
	);

	return createPortal(card(), document.body);
}

export default memo(FloatingCardOverlay);
