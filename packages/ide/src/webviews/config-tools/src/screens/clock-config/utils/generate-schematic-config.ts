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
import {colorVariablesIds} from '../constants/color-variables';

const fallbackColors = {
	foreground: '#ffffff',
	background: '#000000',
	error: '#F14C4C'
};

export function generateSchematicConfig(
	colorsRecord: Record<string, string>
) {
	return {
		AccessConfig: {
			DisableEditing: true,
			DisablePartEditing: true,
			DisablePartDeleting: true,
			DisableAnnotationEditing: true,
			DisableAnnotationDeleting: true,
			DisableSelectSymbols: true
		},
		LTXConfig: {
			DisableLTXPartSelection: false,
			DisablePartDragIcons: true,
			PartDefaultColor: colorsRecord[colorVariablesIds.foreground],
			PartSelectedColor: colorsRecord[colorVariablesIds.foreground],
			SelectionBoxStrokeColor:
				colorsRecord[colorVariablesIds.foreground],
			HighlightBoxStrokeColor:
				colorsRecord[colorVariablesIds.foreground],
			HighlightBoxFillColor: 'transparent',
			HighlightBoxStrokeThickness: 2,
			HighlightBoxFillOpacity: 0,
			HighlightBoxStrokeOpacity: 1,
			HighlightBoxRadius: 4
		},
		UIConfig: {
			DisableAllUI: false,
			DisablePan: false,
			DisableZoom: false,
			DisableDragInterface: false,
			DisableLeftClickPan: false,
			DisableHotkeys: true,
			DisableContextMenus: true,
			DisableScroll: false,
			DisableGroupSelectBox: true,
			DisableMultiSelect: true,
			DisableSelectAndMultiSelect: true,
			DisablePartResize: true,
			DisablePartNWResize: true,
			DisablePartNEResize: true,
			DisablePartSEResize: true,
			DisablePartSWResize: true,
			DisableSnackbar: true
		},
		CanvasConfig: {
			HideWatermarkADI: true,
			HideToolbar: false,
			HideToolbox: true,
			HideVisualGrid: true,
			InitialZoomFactor: 1,
			PartResizeHandlePartHoverOpacity: 0.5,
			PartResizeHandleHoverOpacity: 1,
			PartDropShadowOpacity: 0,
			PartDropShadowHoverOpacity: 0,
			SchematicDotColor:
				colorsRecord[colorVariablesIds.clockStroke] ?? '#7f7f7f',
			ShowBackgroundColor: false,
			VisualGridOpacity: 0,
			VisualGridColor: 'transparent',
			WireThickness: 2,
			WireColor:
				colorsRecord[colorVariablesIds.foreground] ??
				fallbackColors.foreground,
			WireColorSelected:
				colorsRecord[colorVariablesIds.foreground] ??
				fallbackColors.foreground,
			ZoomFitOnResize: false,
			ZoomFitToInitialZoom: false,
			ZoomMin: 0.08,
			ZoomMax: 3,
			ZoomIncrement: 0.05,
			HighlightStyles: {
				disabled: {
					padding: 0,
					stroke:
						colorsRecord[colorVariablesIds.inactiveBorder] ??
						'#3C3C3C',
					fill:
						colorsRecord[colorVariablesIds.inactiveBorder] ??
						'#3C3C3C',
					rx: 8
				},
				error: {
					padding: 0,
					stroke:
						colorsRecord[colorVariablesIds.error] ??
						fallbackColors.error,
					fill: 'transparent',
					rx: 8
				}
			}
		}
	};
}
