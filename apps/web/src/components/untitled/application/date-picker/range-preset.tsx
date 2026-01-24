"use client";

import { type HTMLAttributes } from "react";
import { type DateValue, RangeCalendarContext, useSlottedContext } from "react-aria-components";
import { cx } from "@/lib/utils/cx";

interface RangePresetButtonProps extends HTMLAttributes<HTMLButtonElement> {
    value: { start: DateValue; end: DateValue };
}

export const RangePresetButton = ({ value, className, children, ...props }: RangePresetButtonProps) => {
    const context = useSlottedContext(RangeCalendarContext);

    const isSelected = context?.value?.start?.compare(value.start) === 0 && context?.value?.end?.compare(value.end) === 0;

    return (
        <button
            {...props}
            className={cx(
                "cursor-pointer rounded-md px-3 py-2 text-left text-sm font-medium outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2",
                isSelected ? "bg-gray-100 text-gray-900 hover:bg-gray-200" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                className,
            )}
        >
            {children}
        </button>
    );
};
