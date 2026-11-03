/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

import { cn } from "@utils/cn";

export interface DropdownOption {
	value: string | number;
	label: string;
	disabled?: boolean;
}

export interface DropdownProps {
	value: DropdownOption["value"] | null;
	options: DropdownOption[];
	onChange?: (value: DropdownOption["value"] | null) => void;
	onSelectionChange?: (option: DropdownOption | null) => void;
	helperText?: string;
	errorText?: string;
	disabled?: boolean;
	readOnly?: boolean;
	placeholder?: string;
	className?: string;
	inputWidth?: string;
	inputHeight?: string;
	fontSize?: string;
	showSearch?: boolean;
	showError?: boolean;
	showArrow?: boolean;
	icon?: React.ReactNode;
	iconPosition?: "left" | "right";
	menuPlacement?: "top" | "bottom";
	messagePlacement?: "top" | "bottom";
	valueAlign?: "left" | "center" | "right";
	activeClassName?: string;
}

/**
 * Filters dropdown options based on search term
 * @param options - Array of dropdown options to filter
 * @param searchTerm - Search term to filter by
 * @returns Filtered array of dropdown options
 */
const filterOptions = (
	options: DropdownOption[],
	searchTerm: string
): DropdownOption[] => {
	if (!searchTerm) return options;

	return options.filter(
		(option) =>
			option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
			String(option.value).toLowerCase().includes(searchTerm.toLowerCase())
	);
};

export { filterOptions };

/**
 * Hook to handle clicks outside of a given ref. Keeps the main component simpler.
 * @param ref - The ref to watch for outside clicks
 * @param onOutside - Callback to run when an outside click occurs
 */
function useOutsideClick(
	ref: React.RefObject<HTMLElement>,
	onOutside: () => void
) {
	useEffect(() => {
		/**
		 * Handle clicks outside the provided ref and call onOutside
		 * @param event - Mouse event
		 */
		const handleClickOutside = (event: MouseEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				onOutside();
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [ref, onOutside]);
}

/**
 * Utility to determine the border class based on validation & focus state.
 * @param showErrorMessage - whether to show error styling
 * @param focused - whether the control is focused
 * @param isOpen - whether the dropdown menu is open
 * @returns border CSS class string
 */
function getBorderClass(
	showErrorMessage: boolean,
	focused: boolean,
	isOpen: boolean
) {
	if (showErrorMessage) return "border border-red-500";
	if (focused || isOpen) return "border border-blue-500";
	return "border border-transparent";
}

/**
 * Return menu placement class for top/bottom menu positioning
 * @param placement - 'top' | 'bottom'
 * @returns Tailwind placement classes
 */
function getMenuPlacementClass(placement: "top" | "bottom") {
	if (placement === "top")
		return "bottom-full mb-1 rounded-t-lg overflow-hidden";
	return "top-full mt-1 rounded-b-lg overflow-hidden";
}

/**
 * Return message placement class for top/bottom message positioning
 * @param placement - 'top' | 'bottom'
 * @returns Tailwind placement classes
 */
function getMessagePlacementClass(placement: "top" | "bottom") {
	return placement === "top" ? "absolute bottom-full mb-1" : "absolute mt-1";
}

/**
 * Map alignment keywords to tailwind text alignment classes
 * @param align - 'left' | 'center' | 'right'
 * @returns Tailwind class for text alignment
 */
function getTextAlignClass(align: "left" | "center" | "right") {
	if (align === "center") return "text-center";
	if (align === "right") return "text-right";
	return "text-left";
}

// Main Dropdown Component
/**
 *
 * @param root0 - The props object containing all dropdown configuration options
 * @param root0.value - The currently selected value (or null if none)
 * @param root0.options - Array of dropdown options to display
 * @param root0.onChange - Callback function when the selected value changes
 * @param root0.onSelectionChange - Callback function when the selected option changes
 * @param root0.helperText - Helper text to display below the dropdown
 * @param root0.errorText - Error message text to display
 * @param root0.disabled - Whether the dropdown is disabled
 * @param root0.readOnly - Whether the dropdown is read-only
 * @param root0.placeholder - Placeholder text when no option is selected
 * @param root0.className - Additional CSS classes for the dropdown container
 * @param root0.inputWidth - The width CSS class for the input container
 * @param root0.inputHeight - The height CSS class for the input container
 * @param root0.fontSize - The font size CSS class for the input text
 * @param root0.showSearch - Whether to show a search input for filtering options
 * @param root0.showError - Whether to show error styling
 * @param root0.showArrow - Whether to show the chevron arrow on the right side (default: true)
 * @param root0.icon - Optional React node to show as an icon inside the input
 * @param root0.iconPosition - Position of the icon, either 'left' or 'right' (default: 'left')
 * @param root0.menuPlacement - Where the dropdown menu should appear relative to the input ('top' | 'bottom')
 * @param root0.messagePlacement - Where helper/error message should appear ('top' | 'bottom')
 * @param root0.valueAlign - Alignment of the value inside the dropdown, can be 'left', 'center' | 'right' (also affects options)
 * @param root0.activeClassName - Classes to apply when the control is active (focused or open).
 * @returns The rendered Dropdown component
 */
const Dropdown: React.FC<DropdownProps> = ({
	value,
	options,
	onChange,
	onSelectionChange,
	helperText,
	errorText,
	disabled = false,
	readOnly = false,
	placeholder = "Select an option...",
	className,
	inputWidth = "w-full",
	inputHeight = "h-[52px]",
	fontSize = "text-lg",
	showSearch = false,
	showError = false,
	showArrow = true,
	icon,
	iconPosition = "left",
	menuPlacement = "bottom",
	messagePlacement = "bottom",
	valueAlign = "left",
	activeClassName = ""
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [focused, setFocused] = useState(false);
	const [hasBlurred, setHasBlurred] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useOutsideClick(dropdownRef, () => {
		setIsOpen(false);
		setSearchTerm("");
		setFocused(false);
		setHasBlurred(true);
	});

	const filteredOptions = useMemo(
		() => (showSearch ? filterOptions(options, searchTerm) : options),
		[options, searchTerm, showSearch]
	);
	const selectedOption = useMemo(
		() => options.find((opt) => opt.value === value),
		[options, value]
	);
	const selectedOptionRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (isOpen && selectedOptionRef.current) {
			selectedOptionRef.current.scrollIntoView({ block: "nearest" });
		}
	}, [isOpen]);

	/**
	 * Handles selection of a dropdown option
	 * @param option - The selected dropdown option or null for deselection
	 */
	const handleSelect = (option: DropdownOption | null) => {
		const newValue = option ? option.value : null;
		onChange?.(newValue);
		onSelectionChange?.(option);
		setIsOpen(false);
		setSearchTerm("");
		setFocused(false);
		setHasBlurred(true);
	};

	/**
	 * Toggles the dropdown open/closed state
	 */
	const handleToggle = () => {
		if (disabled || readOnly) return;
		setIsOpen((prev) => !prev);
		setFocused((prev) => !prev);
		if (!isOpen) {
			setHasBlurred(false);
		}
	};

	const backgroundClass = disabled
		? "bg-background-100-2/50 text-white/50"
		: "bg-background-100-2 text-white";

	const readOnlyClass = readOnly ? "pointer-events-none opacity-50" : "";

	const showErrorMessage = hasBlurred && showError && !value;
	const showHelper = focused && !showErrorMessage && !!helperText;

	const borderClass = getBorderClass(showErrorMessage, focused, isOpen);

	const isActive = focused || isOpen;
	const activeClass =
		!showErrorMessage && isActive && activeClassName ? activeClassName : "";

	const dropdownClasses = cn(
		"flex relative items-center px-2 font-medium",
		inputWidth,
		inputHeight,
		fontSize,
		"rounded-md transition-colors duration-200",
		backgroundClass,
		readOnlyClass,
		borderClass,
		className,
		activeClass,
		"justify-between",
		disabled || readOnly ? "cursor-not-allowed" : "cursor-pointer"
	);

	/**
	 * Determines the message to display below the dropdown (error or helper text)
	 * @returns The message string to display
	 */
	const getMessage = () => {
		if (showErrorMessage) return errorText ?? "Please select an option";
		if (showHelper) return helperText;
		return "";
	};

	const message = getMessage();

	const arrowIcon = useMemo(
		() => (isOpen ? <FiChevronUp size={22} /> : <FiChevronDown size={22} />),
		[isOpen]
	);

	const leftIconElement =
		icon && iconPosition === "left" ? (
			<span className="flex items-center flex-shrink-0">{icon}</span>
		) : null;

	const rightIconElement =
		icon && iconPosition === "right" ? (
			<span className="flex items-center flex-shrink-0">{icon}</span>
		) : null;

	/**
	 * Render a single dropdown option
	 * @param option - Option to render
	 * @returns JSX.Element
	 */
	const renderOption = (option: DropdownOption) => {
		const isSelected = value === option.value && !option.disabled;
		const optionAlignClass = getTextAlignClass(valueAlign);
		return (
			<button
				type="button"
				key={option.value}
				ref={isSelected ? selectedOptionRef : undefined}
				className={cn(
					"w-full m-0 px-3 py-2 cursor-pointer transition-colors",
					fontSize,
					optionAlignClass,
					option.disabled
						? "text-white/30 cursor-not-allowed"
						: "hover:bg-accent-3",
					isSelected ? "bg-primary-green-3 font-bold" : ""
				)}
				onClick={() => !option.disabled && handleSelect(option)}
			>
				{option.label}
			</button>
		);
	};

	const shouldRenderRight = showArrow || Boolean(rightIconElement);

	const menuPlacementClass = getMenuPlacementClass(menuPlacement);
	const messagePlacementClass = getMessagePlacementClass(messagePlacement);

	const valueAlignClass = getTextAlignClass(valueAlign);

	/**
	 * Render the right-side area of the input (optional right icon and chevron arrow)
	 * @returns JSX.Element
	 */
	const renderRightArea = () => (
		<div
			className={cn(
				"absolute right-0 top-0 h-full flex items-center justify-end gap-2 pr-2 text-white",
				disabled
					? "cursor-not-allowed opacity-50"
					: "cursor-pointer hover:text-primary-green-3",
				"transition-colors duration-200"
			)}
		>
			{rightIconElement}
			{showArrow && arrowIcon}
		</div>
	);

	/**
	 * Render the Dropdown menu (list of options)
	 * @returns JSX.Element | null
	 */
	const renderMenu = () => {
		if (!isOpen) return null;
		return (
			<div
				className={cn(
					"absolute z-50 w-full shadow-lg",
					backgroundClass,
					menuPlacementClass
				)}
			>
				{/* Options List */}
				<div
					className={cn(
						filteredOptions.length > 5
							? "max-h-48 overflow-y-auto scrollbar"
							: "overflow-hidden"
					)}
				>
					{/* Regular Options */}
					{filteredOptions.map(renderOption)}

					{/* No Options Found */}
					{filteredOptions.length === 0 && (
						<div
							className={cn(
								fontSize,
								getTextAlignClass(valueAlign),
								"px-3 py-2 text-white/50"
							)}
						>
							No options found
						</div>
					)}
				</div>
			</div>
		);
	};

	/**
	 * Render helper or error message and place it according to "messagePlacement"
	 * @returns JSX.Element | null
	 */
	const renderMessage = () => {
		if (!message) return null;
		return (
			<div
				className={cn(messagePlacementClass, "text-[16px] whitespace-nowrap")}
			>
				<span
					data-testid="feedback-message"
					className={cn(showErrorMessage ? "text-red-500" : "text-gray-400")}
				>
					{message}
				</span>
			</div>
		);
	};

	return (
		<div className="relative w-full" ref={dropdownRef}>
			{/* Dropdown Input */}
			<button type="button" className={dropdownClasses} onClick={handleToggle}>
				<div className="flex items-center w-full min-w-0 gap-2">
					{leftIconElement}

					<span
						className={cn(
							"flex-1 truncate",
							valueAlignClass,
							!selectedOption && "text-white/50",
							disabled && "text-white/50"
						)}
					>
						{selectedOption ? selectedOption.label : placeholder}
					</span>
				</div>

				{/* Conditionally render right area (icon/arrow) only if not readOnly */}
				{shouldRenderRight && renderRightArea()}
			</button>

			{renderMenu()}

			{renderMessage()}

			<style>{`\n		.scrollbar::-webkit-scrollbar {\n		  width: 6px;\n		}\n		.scrollbar {\n		  scrollbar-width: thin;\n		scrollbar-color: rgba(217, 217, 217, 1) transparent;\n		}\n      `}</style>
		</div>
	);
};

/**
 * Custom comparator for React.memo to avoid unnecessary re-renders.
 * Compares selected primitive props and shallowly compares the options array reference.
 *
 * @param prev - Previous props
 * @param next - Next props
 * @returns boolean indicating whether props are equal
 */
const areEqual = (prev: DropdownProps, next: DropdownProps) => {
	return (
		prev.value === next.value &&
		prev.disabled === next.disabled &&
		prev.readOnly === next.readOnly &&
		prev.placeholder === next.placeholder &&
		prev.className === next.className &&
		prev.inputWidth === next.inputWidth &&
		prev.inputHeight === next.inputHeight &&
		prev.fontSize === next.fontSize &&
		prev.showSearch === next.showSearch &&
		prev.showError === next.showError &&
		prev.options === next.options &&
		prev.showArrow === next.showArrow &&
		prev.icon === next.icon &&
		prev.iconPosition === next.iconPosition &&
		prev.menuPlacement === next.menuPlacement &&
		prev.messagePlacement === next.messagePlacement &&
		prev.valueAlign === next.valueAlign &&
		prev.activeClassName === next.activeClassName
	);
};

export default React.memo(Dropdown, areEqual);
