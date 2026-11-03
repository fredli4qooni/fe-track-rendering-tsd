/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import React, { memo } from "react";

import DotLoading from "@common/dotloading/DotLoading";

import { cn } from "@utils/cn";

/**
 * Button variant type defining the visual style.
 */
type ButtonVariant = "solid" | "outline" | "ghost";

/**
 * Button color type defining the color theme.
 */
type ButtonColor = "primary" | "error" | "success" | "warning" | "gray";

/**
 * Props for Button component.
 */
type ButtonProps = {
	/** Button content */
	children: React.ReactNode;
	/** Visual variant of the button */
	variant?: ButtonVariant;
	/** Color theme of the button */
	color?: ButtonColor;
	/** Size of the button */
	size?: "xs" | "sm" | "md" | "lg" | "big";
	/** Whether the button is in loading state */
	loading?: boolean;
	/** Additional CSS classes */
	className?: string;
	/** Whether the button should take full width */
	fullWidth?: boolean;
	/** Test ID for testing purposes */
	dataTestId?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Base styles configuration for different button variants and colors.
 */
const buttonBaseStyles: Record<ButtonVariant, Record<ButtonColor, string>> = {
	solid: {
		primary: "bg-primary-20 text-white",
		error: "bg-btn-error text-white",
		success: "bg-btn-success text-white",
		warning: "bg-yellow-500 text-white",
		gray: "bg-gray-600 text-white"
	},
	outline: {
		primary: "border border-primary-20 text-primary-20",
		error: "border border-btn-error text-btn-error",
		success: "border border-btn-success text-btn-success",
		warning: "border border-yellow text-yellow",
		gray: "border border-neutral-2 text-neutral-2"
	},
	ghost: {
		primary: "bg-transparent text-primary-20",
		error: "bg-transparent text-btn-error",
		success: "bg-transparent text-btn-success",
		warning: "bg-transparent text-yellow-500",
		gray: "bg-transparent text-gray-600"
	}
};

/**
 * Hover styles configuration for different button variants and colors.
 */
const buttonHoverStyles: Record<ButtonVariant, Record<ButtonColor, string>> = {
	solid: {
		primary: "hover:bg-primary-50",
		error: "hover:bg-btn-error-hover",
		success: "hover:bg-btn-success-hover",
		warning: "hover:bg-yellow-600",
		gray: "hover:bg-gray-700"
	},
	outline: {
		primary: "hover:bg-primary-20 hover:text-white",
		error: "hover:border-btn-error-hover hover:text-btn-error-hover",
		success: "hover:border-btn-success-hover hover:text-btn-success-hover",
		warning: "hover:bg-yellow-200 hover:text-black",
		gray: "hover:bg-neutral-1 hover:text-black"
	},
	ghost: {
		primary: "hover:bg-primary-50",
		error: "hover:bg-btn-error/10",
		success: "hover:bg-btn-success/10",
		warning: "hover:bg-yellow-50",
		gray: "hover:bg-gray-50"
	}
};

/**
 * Loading styles configuration for different button variants and colors (using predefined darker colors).
 */
const buttonLoadingStyles: Record<
	ButtonVariant,
	Record<ButtonColor, string>
> = {
	solid: {
		primary: "bg-primary-green-1 text-white",
		error: "bg-error-4 text-white",
		success: "bg-success-1 text-white",
		warning: "bg-accent-4 text-white",
		gray: "bg-neutral-5 text-white"
	},
	outline: {
		primary: "border border-primary-green-1 text-primary-green-1",
		error: "border border-error-4 text-error-4",
		success: "border border-success-1 text-success-1",
		warning: "border border-accent-4 text-accent-4",
		gray: "border border-neutral-5 text-neutral-5"
	},
	ghost: {
		primary: "bg-transparent text-primary-green-1",
		error: "bg-transparent text-error-4",
		success: "bg-transparent text-success-1",
		warning: "bg-transparent text-accent-4",
		gray: "bg-transparent text-neutral-5"
	}
};

/**
 * Size styles configuration for different button sizes.
 */
const sizeStyles = {
	xs: "h-6 px-3 text-xs",
	sm: "h-8 px-3 text-sm",
	md: "h-12 px-[18px] text-base font-semibold",
	lg: "h-14 px-12 text-lg",
	big: "h-[48px] w-[170px] px-6 py-2 text-base font-semibold"
};

/**
 * A customizable button component that supports variants, colors, sizes,
 * loading state, spinner, full-width layout, and native button attributes.
 *
 * @param {Object} props - All props passed to the Button component.
 * @param {React.ReactNode} props.children - The button's content (text, icon, etc.).
 * @param {string} [props.className] - Additional Tailwind or custom class names.
 * @param {"solid" | "outline" | "ghost"} [props.variant="solid"] - Visual style variant of the button.
 * @param {"primary" | "secondary" | "danger" | string} [props.color="primary"] - Color scheme.
 * @param {"sm" | "md" | "lg"} [props.size="md"] - Button size.
 * @param {boolean} [props.loading] - Shows dot loading animation instead of content when true.
 * @param {boolean} [props.fullWidth=false] - Makes the button take full container width.
 * @param {string} [props.dataTestId] - Value for the `data-testid` attribute (for testing).
 * @param {boolean} [props.disabled] - Whether the button is disabled.
 * @param {() => void} [props.onClick] - Click event handler.
 *
 * @returns {JSX.Element} The rendered button element.
 */
export const Button = memo(
	({
		children,
		className,
		variant = "solid",
		color = "primary",
		size = "md",
		loading,
		fullWidth = false,
		dataTestId,
		...rest
	}: ButtonProps) => {
		const isDisabled = rest.disabled;

		return (
			<button
				data-testid={dataTestId}
				className={cn(
					"group inline-flex items-center justify-center rounded-lg font-medium transition-all",
					sizeStyles[size],
					loading
						? buttonLoadingStyles[variant][color]
						: buttonBaseStyles[variant][color],
					!isDisabled && !loading && buttonHoverStyles[variant][color],
					!isDisabled && !loading && "active:scale-[0.96] active:shadow-inner",
					isDisabled && "opacity-60 cursor-not-allowed",
					loading && "cursor-wait",
					fullWidth && "w-full",
					className
				)}
				{...rest}
			>
				{loading ? <DotLoading /> : children}
			</button>
		);
	}
);
