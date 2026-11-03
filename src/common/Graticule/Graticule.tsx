/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import { useEffect, useRef } from "react";

import { GraticuleLayerManager } from "./Helper/GraticuleLayerManager";
import type { GraticuleProps } from "./Helper/graticule.types";

/**
 * Graticule grid component for displaying coordinate grid lines and labels.
 * Fully encapsulated - receives map instance via props, no direct store access.
 *
 * Features:
 * - Maritime navigation intervals following IHO S-52/S-101 standards
 * - Optimized rendering: only recomputes on zoom level change
 * - Uses maptalks VectorLayers that move WITH the map
 * - DMS coordinate labels at viewport edges
 *
 * @param props - Component props including map reference and style overrides
 * @returns null - This component renders via maptalks layers
 */
function Graticule(props: GraticuleProps): null {
	const {
		mapRef,
		visible = true,
		showLabels = true,
		lineStyle,
		labelStyle,
		forceRenderOnMoving = false
	} = props;

	const managerRef = useRef<GraticuleLayerManager | null>(null);
	const prevVisibleRef = useRef<boolean>(visible);
	const prevShowLabelsRef = useRef<boolean>(showLabels);
	const prevForceRenderRef = useRef<boolean>(forceRenderOnMoving);

	useEffect(() => {
		const map = mapRef.current;
		if (!map) return;

		managerRef.current = new GraticuleLayerManager(map, {
			lineStyle,
			labelStyle,
			showLabels,
			forceRenderOnMoving
		});

		if (!visible) {
			managerRef.current.hide();
		}

		return (): void => {
			if (managerRef.current) {
				managerRef.current.destroy();
				managerRef.current = null;
			}
		};
	}, [mapRef]);

	useEffect(() => {
		if (!managerRef.current || prevVisibleRef.current === visible) return;

		prevVisibleRef.current = visible;
		if (visible) {
			managerRef.current.show();
		} else {
			managerRef.current.hide();
		}
	}, [visible]);

	useEffect(() => {
		if (!managerRef.current || prevShowLabelsRef.current === showLabels) return;

		prevShowLabelsRef.current = showLabels;
		managerRef.current.setShowLabels(showLabels);
	}, [showLabels]);

	useEffect(() => {
		if (!managerRef.current || !lineStyle) return;

		managerRef.current.setLineStyle(lineStyle);
	}, [lineStyle]);

	useEffect(() => {
		if (!managerRef.current || !labelStyle) return;

		managerRef.current.setLabelStyle(labelStyle);
	}, [labelStyle]);

	useEffect(() => {
		if (
			!managerRef.current ||
			prevForceRenderRef.current === forceRenderOnMoving
		)
			return;

		prevForceRenderRef.current = forceRenderOnMoving;
		managerRef.current.setForceRenderOnMoving(forceRenderOnMoving);
	}, [forceRenderOnMoving]);

	return null;
}

export default Graticule;
