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
export default ADIDrawingEngine;
declare class ADIDrawingEngine extends React.Component<
	any,
	any,
	any
> {
	/**
	 * Constructor for PowerPlanner element. This is a master element for dropping component, drawing connection line,etc.
	 * @param {any} props: json alike data passed from parent component
	 */
	constructor(props: any);
	_isMounted: boolean;
	drawEngineRef: React.RefObject<any>;
	designAreaRef: React.RefObject<any>;
	adiDiagramRef: React.RefObject<any>;
	toolbarRef: React.RefObject<any>;
	toolboxRef: React.RefObject<any>;
	uploadLegacyProjectRef: React.RefObject<any>;
	uploadCrashProjectRef: React.RefObject<any>;
	devTerminalRef: any;
	devCommands: any;
	contextMenuHandler: any;
	functionsObject: any;
	notSelectableSet: any;
	updatePartSet: any;
	devMousePosRef: React.RefObject<any>;
	canvasItemsBB: React.RefObject<any>;
	onFocus(): void;
	/**
	 * Event handler for dragging design component item into the svg zone
	 * We need to grab all the necessary data so that we can transfer it after we drop it onto the drop zone
	 * @param {Event} e
	 */
	event_dragStart(e: Event): void;
	/**
	 * Event handler for dropping item onto svg zone
	 * Retrieve all the node metadata and call addNode function to add the element onto svg zone
	 * @param {Event} e
	 */
	event_drop(e: Event): void;
	/**
	 * Event handler when we drag an item over svg zone.
	 * Just need to prevent default behavior
	 * @param {Event} e
	 */
	event_dragOver(e: Event): void;
	/**
	 * Zoom in svg by setting delta to negative
	 * @param {Event} e
	 */
	event_clickZoomIn(e: Event): void;
	/**
	 * Zoom out svg by setting delta to positive
	 * @param {Event} e
	 */
	event_clickZoomOut(e: Event): void;
	/**
	 * Reset the svg viewbox back to normal
	 * @param {Event} e : click event to reset the zoom
	 */
	event_clickZoomReset(e: Event): void;
	event_clickUndo(): void;
	event_clickRedo(): void;
	event_closeUndoRedoSnackbar(): void;
	event_onBlur(e: any): void;
	event_clickExportSVG(): void;
	handleDelete(): void;
	/**
	 * Helper function to handle copy to clipboard
	 */
	handleCopyToClipboard(): void;
	/**
	 * Helper function to handle cut to clipboard
	 */
	handleCutToClipboard(): void;
	/**
	 * Helper function to handle paste from clipboard
	 */
	handlePasteFromClipboard(clipX: any, clipY: any): void;
	/**
	 * Helper function to close context menu
	 */
	closeContextMenu(): void;
	handleRotate90(): void;
	handleRotate180(): void;
	handleRotate270(): void;
	handleMoveToFront(): void;
	handleMoveToBack(): void;
	handleMoveUp(): void;
	handleMoveDown(): void;
	event_mac_keydown(): void;
	event_mac_keyup(): void;
	/**
	 *
	 * @param {Event} e
	 * Event handler for pressing keyboard
	 */
	event_hotKeyClick(e: Event): void;
	/**
	 *
	 * @param {Event} e
	 * Event handler for releasing keyboard
	 */
	event_hotKeyRelease(e: Event): void;
	/**
	 *
	 * @param {Event} e
	 * Event handler for start drawing box
	 */
	event_clickDrawBox(e: Event): void;
	/**
	 *
	 * @param {Event} e
	 * Event handler for start drawing line
	 */
	event_clickDrawLine(e: Event): void;
	/**
	 *
	 * @param {Event} e
	 * Event handler for start drawing polyline
	 */
	event_clickDrawPolyline(e: Event): void;
	event_hideShowComponents(e: any): void;
	/**
	 *
	 * @param {Event} e
	 * Click event handler on context menu
	 */
	event_contextMenuItemClick(e: Event, type: any, param: any): void;
	/**
	 *
	 * @param {String} key : React unique key for each type i.e. line, part, symbol
	 * @param {String} type
	 * Helper function to delete a component. There are 3 types of component that can be deleted:
	 * 1. type = wire: delete from react state lineComponents
	 * 2. type = symbol: delete from react state symbolComponents
	 * 3. type = part: delete from react state partComponents
	 * 4. type = schematic_dot: delete from react state schematicDotComponents
	 * Once we delete that specific component, that component will be added into the undo stack
	 */
	deleteComponent(key: string, type: string): void;
	/**
	 * Helper function to remove all the array needed used for group selection
	 */
	resetGroupSelection(): void;
	app_callback_handler(callback_id: any, optionalArgs: any): void;
	openLeftComponentPane(isForce: any): void;
	closeLeftComponentPane(isForce: any): void;
	zoomLeftAdjust(): void;
	onResize: (width: any, height: any) => void;
	configDeclaredJSON: any;
	state: {
		context: any;
		showHideComponents: boolean;
		designToolbarItems: any;
		isSnackbarOpen: boolean;
		snackbarMessage: string;
		contextPosition: {
			x: number;
			y: number;
			canvasX: number;
			canvasY: number;
			visible: boolean;
			menuItems: any[];
		};
		projectInfo: {
			title: string;
			fileVersion: number;
			stackCount: number;
		};
		rectangleSelectOverlay: any;
		isLeftComponentOpen: boolean;
		backgroundPresetColors: any[];
		fontPresetColors: any[];
		borderPresetColors: any[];
		mouseGroupEvent: any[];
		calculatingPower: string;
		svgSettings: {
			width: number;
			height: number;
			fromX: number;
			fromY: number;
			grid: {
				showGrid: boolean;
				gridSize: any;
				snapGridOffset: any;
				lineSnapGridOffset: any;
				gridColor: string;
				smallerGridColor: string;
				outerGridColor: string;
				gridOpacity: any;
				gridLineWidth: number;
				gridBackgroundColor: string;
				showBackgroundImage: boolean;
				backgroundColorOpacity: number;
			};
			generalDisplaySettings: {
				defaultPowerSourceColor: string;
				defaultConverterColor: string;
				defaultLDOColor: string;
				defaultResistorColor: string;
				defaultCapacitorColor: string;
				defaultLoadColor: string;
				defaultNetColor: string;
				defaultFontColor: string;
			};
			projectFileDisplaySettings: {
				defaultWireSize: number;
				defaultVITextSize: number;
				defaultLoadTermTextSize: number;
				defaultShowSymbol: boolean;
				defaultShowSummaryReport: boolean;
				defaultConverterEfficiency: boolean;
				defaultConverterPloss: boolean;
				defaultResistorPloss: boolean;
				defaultConverterInputVI: boolean;
				defaultConverterOutputVI: boolean;
				defaultConverterWarningOnVI: boolean;
				defaultLoadPercentage: boolean;
				defaultConverterPercentage: boolean;
				defaultSummaryReportSize: boolean;
				defaultSummaryReportHeight: boolean;
				defaultTreatNegativePower: boolean;
			};
		};
	};
	ele_selected: HTMLElement;
	ele_selected_parent: HTMLElement;
	groupNode_selected: any[];
	node_selected: HTMLElement;
	connection_ele: any;
	dragStartCoordinate: {
		x: number;
		y: number;
	};
	mouse_x: number;
	mouse_y: number;
	label_editing: HTMLElement;
	/***********************************STANDARDIZED VARIABLES***********************************/
	/********************************************************************************************/
	keyDownControl: boolean;
	keyDownShift: boolean;
	keyDownSpace: boolean;
	modeDrawBox: boolean;
	modeDrawLine: boolean;
	modeDrawPolyline: boolean;
	dragDrawBox: boolean;
	dragDrawLine: boolean;
	dragDrawPolyline: boolean;
	dragPart: boolean;
	dragWire: boolean;
	dragGroupSelect: boolean;
	dragRoutingNewWire: boolean;
	mouseDownOnCanvas: boolean;
	mouseDownOnPart: boolean;
	mouseDownOnPartResizePoint: boolean;
	mouseDownOnSymbolResizePoint: boolean;
	mouseDownOnWireSegment: boolean;
	mouseDownOnWireExtendedPoint: boolean;
	mouseDownOnTerminal: boolean;
	mouseDownPanning: boolean;
	pointPanningStart:
		| {
				x: any;
				y: any;
		  }
		| {
				x: number;
				y: number;
		  };
	pointPanningEnd: {
		x: any;
		y: any;
	};
	leftPanelResize: boolean;
	/********************************************************************************************/
	/********************************************************************************************/
	partNode: any;
	selectedPartNodes: any[];
	meta: any;
	partComponents: any[];
	wireComponents: any[];
	textComponents: any[];
	lineComponents: any[];
	line: any;
	schematicDotComponents: any[];
	schematicDotComponent: any;
	symbolComponents: any[];
	undoRedoEngine: UndoRedoEngine;
	svgSettings: React.RefObject<any>;
	extendFrom: string;
	keycodeKeystackArray: any[];
	clonedProjectInfo: {
		title: string;
		fileVersion: number;
		stackCount: number;
	};
	viewBox: any;
	svgSize: {
		w: any;
		h: any;
	};
	scale: number;
	totalZoom: number;
	sourceComponentBoundary: {
		left: number;
		right: number;
		top: number;
		bottom: number;
	};
	destinationComponentBoundary: {
		left: number;
		right: number;
		top: number;
		bottom: number;
	};
	wireShapeType: string;
	resizeDimensions: {
		width: number;
		height: number;
	};
	startPoint: {
		x: number;
		y: number;
	};
	midPoint: {
		x: number;
		y: number;
	};
	endPoint: {
		x: number;
		y: number;
	};
	sortedPoints: any[];
	outConnectionDirection: string;
	inConnectionDirection: string;
	lineOverLay: {
		parent_class: string;
		from: string;
		fromTerminalID: any;
		fromLegacyTerminalID: any;
		fromPartID: any;
		fromPartUuid: any;
		fromLegacyPartID: any;
		to: any;
		toTerminalID: any;
		toLegacyTerminalID: any;
		toPartID: any;
		toPartUuid: any;
		toLegacyPartID: any;
		id: any;
		uuid: any;
		legacyId: any;
		type: string;
		className: string;
		points: any[];
		lineShape: string;
		pointsPositionToUpdate: string;
		netID: any;
		swires: any[];
		ewires: any[];
		schematicDots: any[];
		pathType: any;
	};
	dateTime: Date;
	fullyUpdatedLines: any[];
	partialUpdateLines: any[];
	netlist: {};
	wireMode: number;
	polylinePointsNum: string;
	resizeDirection: string;
	objectWidthThreshold: number;
	objectHeightThreshold: number;
	clipboard: any[];
	componentID: number;
	totalNumberOfPaste: number;
	lineEleMouseOver: any;
	lineMouseOver: any;
	isMouseOnExistingWire: boolean;
	schematicDotEleOver: any;
	schematicDotComponentMouseOver: any;
	isMouseOnExistingSchematicDot: boolean;
	swires: any[];
	ewires: any[];
	moved_X_direction: any[];
	moved_Y_direction: any[];
	hasCheckForAdjacentWires: boolean;
	net: any[];
	fully_move_netID: any[];
	parts_need_further_process: any[];
	wires_selected: any[];
	ghostPartDragArray: any[];
	ltMaxim: any;
	callback_dictionary: {
		PART_MOUSE_CLICK_SINGLE: any;
		PART_MOUSE_CLICK_DOUBLE: any;
		PART_MOUSE_CLICK_TRIPLE: any;
		PART_MOUSE_CLICK_RIGHT: any;
		PART_DRAG_END: any;
		PARTS_ADDED: any;
		PARTS_REMOVED: any;
		PARTS_GROUP_SELECT: any;
		PART_HOVER_ENTER: any;
		PART_HOVER_EXIT: any;
		MOUSE_UP: any;
		UNDO: any;
		REDO: any;
	};
	/**
	 * Lifecyle hook
	 * Start register events for PowerPlanner component
	 */
	componentDidMount(): void;
	/**
	 * =================================================================================
	 *  This function will remove all event listener for this PowerPlanner component
	 * =================================================================================
	 */
	componentWillUnmount(): void;
	shouldComponentUpdate(nextProps: any, nextState: any): boolean;
	componentDidUpdate(): void;
	zoomFitPreload: boolean;
	openPreloadContent(preload: any): boolean;
	loadContentNoZoom(content: any): void;
	/**
	 * Event handler for window resize:
	 * 1. reset svg width and height when parent container changes
	 * 2. rerender the grid
	 */
	event_updateDimensions(): void;
	toggleDevTerminalVisibility(): void;
	toggleDevMousePosRefVisibility(): void;
	/**
	 *
	 * @param {Event} e : Event object
	 * Event handler for mouse right click on PowerPlanner
	 * 1. Right click on a wire when element selected class list contains 'segment', will display context menu for wire i.e. Delete, Undo, Redo
	 * 2. Right click on a part when element selected class list contains either 'adi_diagram_content_node' or 'adi_diagram_node', will display context menu for Part i.e Delete, Cut, Copy, Paste, Undo, Redo
	 * 3. Right click on SVG element, will display context menu i.e. Paste, Undo, Redo
	 *
	 */
	event_contextMenu(e: Event): void;
	pushUndoRedoStack(isForce?: boolean): boolean;
	/**
	 *
	 * @param {Event} e
	 * Event handler for double click.
	 * At the moment, the double click event handler is used to stop the drawing polyline process
	 */
	event_dblclick(e: Event): void;
	endDrawingPolyline(): void;
	symbol: any;
	/**
	 * @param {Event} e : Event object
	 * Event handler on mouse click or touch for svg element
	 * Scenarios:
	 *  1. click on 'adi-diagram-node': this will issue a drag for component
	 *  2. click on 'output' or 'input': this indicates that user want to draw a connection line
	 *  3. click on 'segment': this indicates that user wants to drag a connection line
	 *  4. click on the main svg + ctrl key is pressed: this indicates that user wants to pan the svg
	 *  5. click on 'extended_point': this will continue to extend the current wire
	 *  6. click on either one of the 4 corners to resize: this will trigger the resize process for a component. Polyline will not be resized
	 *
	 */
	event_click(e: Event): void;
	clickSymbol(currEle: any): void;
	getSymbolFromChildElement(childElement: any, depth: any): any;
	getUUIDArrayFromIDArray(IDArray: any): any[];
	getIDArrayFromUUIDArray(UUIDArray: any): any[];
	handleDraggingComponentOnMouseMove(e: any): void;
	handleDraggingWireOnMouseMove(e: any): void;
	handlePanningOnMouseMove(e: any, e_pos_x: any, e_pos_y: any): void;
	handleGroupSelectionOnMouseMove(e: any): void;
	handleDrawingBoxOnMouseMove(e: any): void;
	handleDrawingLineOnMouseMove(e: any): void;
	handleDrawingPolylineOnMouseMove(e: any): void;
	handleResizeObjectOnMouseMove(e: any): void;
	/**
	 * Event handler when moving an svg element around
	 * Scenarios:
	 * 1. Draw initial connection line
	 * 2. Drag a component
	 * 3. Drag a connection line
	 * 4. Panning the svg
	 * 5. Drawing a box
	 * 6. Drawing a line
	 * 7. Drawing a polyline
	 * 8. Resize object (Part, Box, Line)
	 * @param {Event} e
	 */
	event_position: (e: Event) => void;
	points: any[];
	/**
	 * Event handler when release the mouse
	 * We need to prevent default behavior to support touch screen
	 * We need to handle when flag 'this.mouseDownOnTerminal' is true which to draw a connection line between 2 components
	 *      - Once we draw the line, we need to update the connection path class using this pattern: 'node_out_<output_node_id> node_in_<input_node_id> parent_out_<parent_node_id> parent_in_<parent_node_id>
	 * We need to handle when flat 'this.panning' is true to finalizing the viewbox before we reset everything
	 * After that, reset all class variable to initial state
	 * @param {Event} e
	 */
	event_dragEnd(e: Event): void;
	ECSgrandUpdate(): void;
	DeleteWiresJumperingPins(
		inputFlatList: any,
		inputPartComponents: any
	): any;
	IsInList(location: any, pnt: any): boolean;
	getPartsByProperty(property: any, value: any): any[];
	getUUIDsFromPartArray(partArray: any): any[];
	/**
	 * Helper function to handle the mouse up for dragging a component
	 * When the mouse is up, snap the current component to grid
	 * Call to persist react part components and wire components
	 */
	handleDraggingComponentOnDragEnd(): void;
	handleDrawingWireFromExistingSchematicDot(): void;
	/**
	 * Helper function to handle the mouse up for drawing a connection between 2 parts
	 * todo: check for part id to see whether we search for partcomponents or schematic dots component
	 */
	handleDrawingWireOnDragEnd(e: any, ele_last: any): void;
	splitWire(currentLine: any): void;
	/**
	 * Helper function to handle the mouse up for extending a current wire
	 */
	handleExtendingExistingWireOnDragEnd(e: any, ele_last: any): void;
	/**
	 * Helper function to handle the mouse up for panning the svg
	 */
	handlePanningOnDragEnd(): void;
	/**
	 * Helper function to handle the mouse up for dragging a wire
	 */
	handleDragConnectionOnDragEnd(e: any): void;
	snap_wires_to_grid(): void;
	/**
	 * Helper function to handle the mouse up for group selection
	 */
	handleGroupSelectionOnDragEnd(e_pos_x: any, e_pos_y: any): void;
	/**
	 * Helper function to handle the mouse up for drawing a box
	 */
	handleDrawingBoxOnDragEnd(): void;
	/**
	 * Helper function to handle the mouse up for drawing a line
	 */
	handleDrawingLineOnDragEnd(): void;
	/**
	 * Helper function to handle the mouse up for resizing an object
	 */
	handleObjectResizeOnDragEnd(): void;
	/**
	 *
	 * @param {Event} e
	 * detect which side the destination part that the mouse is over
	 */
	event_dragWireOver(e: Event): void;
	handleMouseIsOverSchematicDot(schematicDot: any): void;
	handleMouseIsOverSegment(segment: any): void;
	clear_ghostPartDragArray(): void;
	getPartBounding(): {
		xMin: any;
		yMin: any;
		xMax: any;
		yMax: any;
	};
	getSymbolBounding(): {
		xMin: any;
		yMin: any;
		xMax: any;
		yMax: any;
	};
	getPolylineBounding(currPolyline: any): {
		xMin: any;
		yMin: any;
		xMax: any;
		yMax: any;
	};
	getTextBounding(): {
		xMin: any;
		yMin: any;
		xMax: any;
		yMax: any;
	};
	getAllBounding(): {
		xMin: any;
		yMin: any;
		xMax: any;
		yMax: any;
	};
	getBoundingBoxWithWindowRatio(): any;
	adjustViewBoxToWindowRatio(newViewBox: any): any;
	getToolMargins(): {
		toolbarPercent: number;
		toolboxPercent: number;
	};
	zoomFitManager(isInitialZoom: any, isResize: any): void;
	zoomFitToWindow(zoomFit: any): void;
	resizeFitWindow(): void;
	getCurrentTotalZoom(): number;
	zoomUpdateCenter(newZoom: any, newX: any, newY: any): void;
	/**
	 * Event handler for mouse zoom events via scroll wheel
	 *
	 * @param {Event} e
	 */
	event_wheel(e: Event): void;
	buildObjectForUndoRedo(): {
		partComponents: any[];
		wireComponents: any[];
		symbolComponents: any[];
		schematicDotComponents: any[];
		textComponents: any[];
		netlist: {};
	};
	undo(): void;
	redo(): void;
	/**
	 * Helper function to unbox objects from undo/redo engine
	 * @param {Object} object
	 */
	destructuringAppHistoryObject(object: any): void;
	getWireSelectedColor(): any;
	getWireSelectedShape(): void;
	getWireSelectedType(): void;
	/**
	 * Function to initialize width, height for the svg to fit its parent container
	 */
	initiatePlanner(): void;
	/**
	 *
	 * @param {Object} part
	 * Helper function to adjust the terminal along with its wire when an object is resized
	 */
	adjustTerminalDisplay(part: any, oldPart: any): any;
	/**
	 * Helper function to select all elements on editor
	 */
	handleSelectAll(): void;
	handleSelectPartById(id: any): void;
	/**
	 * Helper function for handling 'Tab' key pressed
	 */
	handleTabPressed(): void;
	/**
	 *
	 * @param {Event} e
	 * Helper function to add more points into polyline drawing
	 */
	handleClickToDrawPolyLine(e: Event): void;
	/**
	 *
	 * @param {Event} e
	 * Helper function to setup neccessary variables when mouse is clicked on the planner SVG
	 */
	handleClickOnPlanner(e: Event): void;
	/**
	 *
	 * @param {Event} e
	 * Helper function to setup neccessary variables when mouse is clicked on the planner SVG and Ctrl key is pressed
	 */
	handleClickOnCanvasPanning(x: any, y: any): void;
	/**
	 *
	 * @param {number} startPanningPositionX
	 * @param {number} startPanningPositionY
	 * Helper function to handle click to start the panning process.
	 * Set the flag this.mouseDownPanning to true
	 * Set start panning point
	 */
	handleClickOnCanvasPanning(
		startPanningPositionX: number,
		startPanningPositionY: number
	): void;
	/**
	 *
	 * @param {Event} e
	 * Helper function to setup neccessary variables when mouse is clicked on a wire segment
	 * TODO: implement dragging a segment
	 */
	handleClickOnSegment(e: Event): void;
	/**
	 *
	 * @param {Event} e
	 * Helper function to setup neccessary variables when mouse is clicked on an extended point on a wire
	 */
	handleClickOnExtendedPoint(e: Event): void;
	/**
	 *
	 * @param {Event} e
	 * Helper function to setup neccessary variables when mouse is clicked on a terminal of Part component
	 */
	handleClickOnTerminal(e: Event): void;
	/**
	 *
	 * @param {String} resizePointLocation
	 * @param {Element} DOM element selected
	 * Helper function to detect which resize location has been clicked
	 * If DOMElementSelected type is 'BPrt':
	 *  1) we will query React state array for the attribute 'part_id' and assign reference to this.partNode
	 *  2) Obtain initial predefined component measurement. This measure will help prevent user from resize object smaller than allowed width/height
	 *  3) Obtain top/left coordinate and assign reference to this.startPoint. This variable will be used to check whether user resizes object smaller than allowed width/height
	 * If DOMElementSelected type is Symbol:
	 *  1) we will query React state array for attribute 'symbol_id' and assign reference to this.symbol
	 */
	handleClickOnResizePoint(
		resizePointLocation: string,
		DOMElementSelected: any
	): void;
	handleRotate(degree: any): void;
	applyMovedProcess(id: any): void;
	addOffsetForPasteObjects(
		object: any,
		offsetX: any,
		offsetY: any
	): void;
	applySelectionEffectForPastedObjects(pastedObjects: any): void;
	/**
	 *
	 * @param {Event} e
	 * Helper function to setup neccessary variables when mouse is clicked on a Part component
	 * 1.
	 *  a) If ctrl key is pressed:
	 *  ## if current DOM element is not in groupNode_selected array, add the current selected DOM element into the local variable 'groupNode_selected'
	 *  ## if current DOM element is already in the groupNode_selected array, remove css effect for that DOM element and remove it from groupNode_selected array
	 *  b) If ctrl key is NOT pressed:
	 *      Pushed the single DOM element into the groupNode_selected array
	 * 2. set the 'drag' flag to true indicate a user wants to move the selected components
	 * 3) Call helper function 'applySelectionEffect' to iterate through all 'groupNode_selected' array and add class 'selected' to class list
	 * If there is, those lines will be transformed along with the drag. If not, the moving parts will update line accordingly
	 */
	handleClickOnPart(e: Event): void;
	/**
	 * Helper function to clear all selection visual indicators and variables
	 */
	clearAllSelections(): void;
	/**
	 *
	 * @param {string} type :Type of the element being right clicked
	 * @param {Object} position : svg coordinate(x,y) of the mouse position
	 */
	displayContextMenu(type: string, position: any): void;
	/**
	 *
	 * @param {Object} position : svg coordinate(x,y) of the mouse position
	 * Helper function to display context menu for the symbol
	 */
	displayContextMenuForSymbol(position: any, type: any): void;
	/**
	 *
	 * @param {Object} position : svg coordinate(x,y) of the mouse position
	 * Helper function to display context menu for the wire
	 */
	displayContextMenuForWire(position: any, type: any): void;
	/**
	 *
	 * @param {Object} position : svg coordinate(x,y) of the mouse position
	 * Helper function to display context menu for the Part
	 */
	displayContextMenuForPart(position: any, type: any): void;
	/**
	 *
	 * @param {Object} position : svg coordinate(x,y) of the mouse position
	 * Helper function to display context menu for editor
	 */
	displayContextMenuForEditor(position: any, type: any): void;
	deleteMultipleWires(wires_selected: any, deleteIds: any): void;
	deleteNetSegment(deleteIds: any): void;
	deleteNetPath(deleteIds: any): void;
	deleteMultipleComponents(
		groupNode_selected: any,
		deleteIds: any
	): void;
	/**
	 *
	 * @param {string} type
	 * @param {Object} DOMElement : DOM element
	 * Helper function to delete a component. There are 3 components that can be deleted:
	 * 1. when type is 'wire': we will grab the property 'wire_id' on the <path> DOM element because we break down Line component down to multiple segment.
	 *      So in order to delete from React state lineComponents array, we need to retrieve back to the root id.
	 * 2. when type is 'BPrt', 'BResource': we will grab the property 'id' on the <g> DOM element
	 * 3. when type is 'symbol': we will grab the property 'id' on the <g> DOM element
	 */
	checkComponentTypeForDeletion(
		type: string,
		DOMElement: any,
		deleteIds: any
	): void;
	deleteSchematicDot(key: any): void;
	/**
	 *
	 * @param {string} key
	 * Helper function to delete a part component from React state array
	 * Once we delete it, insert that deleted component into the undo stack
	 */
	deletePart(key: string): void;
	deleteLabel(key: any): void;
	/**
	 *
	 * @param {string} key
	 * Helper function to delete a symbol component from React state array
	 * Once we delete it, insert that deleted component into the undo stack
	 */
	deleteSymbol(key: string): void;
	move_selectedByGrid(x: any, y: any): void;
	move_selected(dx: any, dy: any): void;
	move_selected_highlightBox(currNode: any, dx: any, dy: any): void;
	snap_parts_to_grid(): void;
	pan_gridSize(x: any, y: any): void;
	selectMultipleParts(rect: any): void;
	/**
	 * Helper function to reset all variables
	 */
	resetVariables(): void;
	/**
	 * Helper function to merge the overlay line with the actual line when a user picks up the line to continue drawing
	 */
	mergeOverlayLine(): void;
	displaySnackbar(message: any): void;
	closeSnackbar(): void;
	/**
	 * Helper function to draw polyline on the page
	 * @param {array} pointsNum
	 * @param {number} xStart
	 * @param {number} yStart
	 * @param {number} width
	 * @param {number} height
	 */
	addPolyline(
		pointsNum: any[],
		xStart: number,
		yStart: number,
		width: number,
		height: number
	): {
		type: string;
		subType: string;
		legacyId: any;
		id: any;
		uuid: any;
		pointsNum: any;
		xStart: any;
		yStart: any;
		width: any;
		height: any;
	};
	/**
	 * Helper function to draw straight line on the page
	 * @param {number} xStart
	 * @param {number} yStart
	 * @param {number} xEnd
	 * @param {number} yEnd
	 * @param {number} width
	 * @param {number} height
	 */
	addLine(
		xStart: number,
		yStart: number,
		xEnd: number,
		yEnd: number,
		width: number,
		height: number
	): {
		type: string;
		subType: string;
		legacyId: any;
		id: any;
		uuid: any;
		pointsNum: any[];
		xStart: any;
		yStart: any;
		xEnd: any;
		yEnd: any;
		width: any;
		height: any;
	};
	/**
	 * Helper function to draw a box on the page
	 * @param {number} xStart
	 * @param {number} yStart
	 * @param {number} xEnd
	 * @param {number} yEnd
	 * @param {number} width
	 * @param {number} height
	 */
	addBox(
		xStart: number,
		yStart: number,
		xEnd: number,
		yEnd: number,
		width: number,
		height: number
	): {
		type: string;
		subType: string;
		legacyId: any;
		id: any;
		uuid: any;
		xStart: any;
		yStart: any;
		xEnd: any;
		yEnd: any;
		pointsNum: any[];
		width: any;
		height: any;
	};
	/**
	 * Function to add an element to svg base on x, y coordinate
	 * Set state for React state partComponents
	 * @param {any} data
	 * @param {number} x
	 * @param {number} y
	 */
	addNode(data: any, x: number, y: number): void;
	pushSelectedNode(node: any): void;
	makeSelectedPartNode(): boolean;
	/**
	 * Helper function to draw a connection line between 2 components
	 * @param {EventTarget} ele
	 */
	drawConnection(
		basePart: any,
		fromPort: any,
		fromLegacyPort: any,
		isOverLayed: any
	): {
		parent_class: string;
		from: string;
		fromTerminalID: any;
		fromLegacyTerminalID: any;
		fromPartID: any;
		fromPartUuid: any;
		fromLegacyPartID: any;
		to: any;
		toTerminalID: any;
		toLegacyTerminalID: any;
		toPartID: any;
		toPartUuid: any;
		toLegacyPartID: any;
		id: any;
		uuid: any;
		legacyId: any;
		type: string;
		className: string;
		points: any[];
		lineShape: string;
		pointsPositionToUpdate: string;
		netID: any;
		swires: any[];
		ewires: any[];
		schematicDots: any[];
		pathType: any;
	};
	updateZoomSnackBar(): void;
	/**
	 * Helper function to temporarily update the grid line while panning and mouse is not released!
	 * While the mouse has not been released, we don't want to update the state variable 'this.viewBox' yet since we are not finalizing the final mouse position
	 * If we are still attempting to update 'this.viewBox' while the mouse has not been release, it will cause svg to pan very fast!
	 * @param {any} movedViewBox
	 */
	updateGrid(viewBox: any): void;
	onUpdateGrid(viewBox: any, callback: any): void;
	updateCanvasConfigProperties(): void;
	onSetPresetColors(
		backgroundPresetColors: any,
		fontPresetColors: any,
		borderPresetColors: any
	): void;
	/**
	 * React render function
	 */
	render(): import('react/jsx-runtime').JSX.Element;
}
import * as React from 'react';
import UndoRedoEngine from './engines/undoRedo';
//# sourceMappingURL=ADIDrawingEngine.d.ts.map
