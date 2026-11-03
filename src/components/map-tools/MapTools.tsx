/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import React, { memo } from "react";
import { AiOutlineMinusCircle, AiOutlinePlusCircle } from "react-icons/ai";
import { AiOutlineSync } from "react-icons/ai";
import { CiRuler } from "react-icons/ci";
import { MdOutlinePanTool } from "react-icons/md";
import { RiShip2Line } from "react-icons/ri";
import { TbRulerMeasure } from "react-icons/tb";

import useMapStore from "@store/useMapStore";
import useOwnShipStore from "@store/useOwnShipStore";
import useUIStore from "@store/useUIStore";

import { Button } from "@common/button/Button";
import Dropdown from "@common/dropdown/Dropdown";

import { AVAILABLE_SCALE_NM } from "@constants/mapZoom.constant";

import { cn } from "@utils/cn";

const EmptySlot = <div />;
const PanIcon = <MdOutlinePanTool />;
const PlusIcon = <AiOutlinePlusCircle />;
const MinusIcon = <AiOutlineMinusCircle />;

type BtnProps = Omit<React.ComponentProps<typeof Button>, "children"> & {
	children?: React.ReactNode;
};

const StaticButton = memo(({ children, ...rest }: BtnProps) => {
	return <Button {...rest}>{children}</Button>;
});

const ZoomOutButton = memo(({ className }: { className?: string }) => {
	const zoomOut = useMapStore((s) => s.zoomOut);
	const canZoomOut = useMapStore((s) => s.canZoomOut());

	return (
		<Button
			className={className}
			type="button"
			onClick={zoomOut}
			disabled={!canZoomOut}
			title="Zoom Out"
		>
			{MinusIcon}
		</Button>
	);
});

const ZoomInButton = memo(({ className }: { className?: string }) => {
	const zoomIn = useMapStore((s) => s.zoomIn);
	const canZoomIn = useMapStore((s) => s.canZoomIn());

	return (
		<Button
			className={className}
			type="button"
			onClick={zoomIn}
			disabled={!canZoomIn}
			title="Zoom In"
		>
			{PlusIcon}
		</Button>
	);
});

const MeasureButton = memo(({ className }: { className?: string }) => {
	const isMeasuring = useUIStore((state) => state.isMeasuring);
	const setIsMeasuring = useUIStore((state) => state.setIsMeasuring);

	/**
	 * Toggle distance measurement mode.
	 * @returns void
	 */
	const handleToggle = () => setIsMeasuring(!isMeasuring);

	return (
		<Button
			className={cn(
				className,
				"transition-colors",
				isMeasuring
					? "bg-primary-20 text-white border border-primary-20"
					: "bg-neutral-5"
			)}
			type="button"
			title="Measure Tool"
			onClick={handleToggle}
			aria-pressed={isMeasuring}
		>
			<TbRulerMeasure />
		</Button>
	);
});

const scaleOptions = AVAILABLE_SCALE_NM.map((scale) => ({
	value: scale,
	label: `${scale} NM`
}));

const MotionButton = memo(({ className }: { className?: string }) => {
	const isFollowing = useOwnShipStore((s) => s.isFollowing);
	const setIsFollowing = useOwnShipStore((s) => s.setIsFollowing);
	const setIsFreeDrag = useOwnShipStore((s) => s.setIsFreeDrag);

	/**
	 * Toggle own ship follow/free-drag mode.
	 */
	const handleToggle = () => {
		if (!isFollowing) {
			setIsFollowing(true);
			setIsFreeDrag(true);
			return;
		}
		setIsFollowing(false);
		setIsFreeDrag(true);
	};

	return (
		<Button
			className={cn(
				className,
				"relative w-8 h-8 p-0",
				isFollowing
					? "bg-primary-20 text-white border border-primary-20"
					: "bg-neutral-5"
			)}
			type="button"
			onClick={handleToggle}
			aria-pressed={isFollowing}
			title="Toggle Own Ship Follow/Free-Drag"
		>
			<AiOutlineSync
				size={20}
				style={{
					position: "absolute",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					zIndex: 0
				}}
				aria-hidden
			/>
			<RiShip2Line
				size={8}
				style={{
					position: "absolute",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					zIndex: 10,
					pointerEvents: "none"
				}}
				aria-hidden
			/>
		</Button>
	);
});

/**
 * MapTools provides on-map controls (zoom, pan, measurement, scale selector).
 * @returns {JSX.Element} The rendered map tools container.
 */
const MapTools = () => {
	return (
		<>
			<div className="absolute z-10 flex flex-col gap-1 transform -translate-y-1/2 top-1/2 right-4">
				<StaticButton className="w-8 h-8 p-0 bg-neutral-5">
					{EmptySlot}
				</StaticButton>
				<StaticButton className="w-8 h-8 p-0 bg-neutral-5">
					{EmptySlot}
				</StaticButton>
				<StaticButton className="w-8 h-8 p-0 bg-neutral-5">
					{PanIcon}
				</StaticButton>
				<div className="flex flex-col">
					<ZoomInButton className="w-8 h-8 p-0 rounded-b-none bg-neutral-5" />
					<ZoomOutButton className="w-8 h-8 p-0 rounded-t-none bg-neutral-5" />
				</div>
				<StaticButton className="w-8 h-8 p-0 bg-neutral-5">
					{EmptySlot}
				</StaticButton>
				<MeasureButton className="w-8 h-8 p-0 bg-neutral-5" />
				<MotionButton className="w-8 h-8 p-0 bg-neutral-5" />
			</div>
			<div className="absolute z-10 flex flex-col gap-1 bottom-4 right-4">
				<Dropdown
					value={useMapStore((s) => s.getCurrentScaleNM())}
					options={scaleOptions}
					className="h-[32px] w-[98px]"
					activeClassName="h-[32px] w-[98px] bg-white text-black border-white"
					fontSize="text-[14px]"
					showArrow={false}
					onChange={(val) => {
						const parsed = Number(val);
						if (!Number.isNaN(parsed)) {
							useMapStore.getState().setZoomForScaleNM(parsed);
						}
					}}
					menuPlacement="top"
					icon={<CiRuler size={21} style={{ transform: "scaleX(-1)" }} />}
					valueAlign="right"
				/>
			</div>
		</>
	);
};

export default MapTools;
