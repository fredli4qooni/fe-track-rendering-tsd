import React, { useMemo } from "react";

import ownshipIcon from "@assets/icons/ownship-icon.png";

import Graticule from "@common/Graticule/Graticule";
import RangeRings from "@common/RangeRings/RangeRings";
import { OwnShipConfig } from "@common/ownship/OwnShipRenderer";

import { useMapCanvas } from "./useMapCanvas";

/**
 * MapCanvas component that renders the main map container with overlay layers.
 * Includes RangeRings and Graticule grid components.
 *
 * @param root0 - props
 * @param root0.ownShipConfig - optional own ship configuration
 *
 * @returns The map canvas component with all overlay layers
 */
type MapCanvasProps = {
	ownShipConfig?: OwnShipConfig;
};

/**
 * MapCanvas component.
 *
 * @param root0 - props
 * @param root0.ownShipConfig - optional own ship configuration
 * @returns The map canvas JSX element
 */
const MapCanvas: React.FC<MapCanvasProps> = ({ ownShipConfig }) => {
	const defaultOwnShipConfig: OwnShipConfig = {
		size: 40,
		lineLength: 0.005,
		iconUrl: ownshipIcon,
		iconOpacity: 1,
		lineColor: [1, 0.5, 0, 1]
	};

	const mergedOwnShipConfig = ownShipConfig
		? { ...defaultOwnShipConfig, ...ownShipConfig }
		: defaultOwnShipConfig;

	const {
		mapContainerRef,
		mapRef,
		mapReady,
		currentResolution,
		mapPixelWidth,
		mapPixelHeight,
		currentScaleNM,
		ownShipPositionRef,
		isFollowing,
		isFreeDrag,
		showRangeRings,
		showGraticule,
		showGraticuleLabels
	} = useMapCanvas(mergedOwnShipConfig);

	const rangeRingsConfig = useMemo(
		() => ({
			currentScaleValue: currentScaleNM,
			currentResolution,
			mapPixelWidth,
			mapPixelHeight,
			visible: showRangeRings,
			ownShipPositionRef,
			mapRef,
			isFollowing,
			isFreeDrag
		}),
		[
			currentScaleNM,
			currentResolution,
			mapPixelWidth,
			mapPixelHeight,
			showRangeRings,
			mapRef,
			isFollowing,
			isFreeDrag
		]
	);

	return (
		<div className="relative w-full h-full bg-gray-900">
			<div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

			{mapReady && (
				<Graticule
					mapRef={mapRef}
					visible={showGraticule}
					showLabels={showGraticuleLabels}
				/>
			)}

			<RangeRings config={rangeRingsConfig} />
		</div>
	);
};

export default MapCanvas;
