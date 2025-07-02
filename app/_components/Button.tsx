import React from "react";
import Link from "next/link";
import { getButtonColor } from "../_lib/colors";
import Icon from "./Icon";
import type { ColorButtonKey } from "../_interfaces";

type Props = {
  label?: string | null;
  icon?: string;
  iconSize?: string | number;
  href?: string;
  target?: string;
  type?: string;
  color?: ColorButtonKey;
  className?: string;
  asAnchor?: boolean;
  small?: boolean;
  outline?: boolean;
  active?: boolean;
  disabled?: boolean;
  roundedFull?: boolean;
  isGrouped?: boolean;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
};

export default function Button({
  label,
  icon,
  iconSize,
  href,
  target,
  type,
  color = "white",
  className = "",
  asAnchor = false,
  small = false,
  outline = false,
  active = false,
  disabled = false,
  roundedFull = false,
  children,
  onClick,
  ...props
}: Props) {

  if (color === 'company-purple') {
    const buttonClasses = `
      inline-flex justify-center items-center whitespace-nowrap
      focus:outline-hidden transition-colors focus:ring-3 duration-150
      border cursor-pointer rounded-sm
      bg-company-purple text-white border-company-purple
      hover:bg-company-purple-dark hover:border-company-purple-dark
      dark:bg-company-purple dark:border-company-purple
      dark:hover:bg-company-purple-dark dark:hover:border-company-purple-dark
      ${small ? 'text-sm px-3 py-1' : 'py-2 px-3'}
      ${disabled ? 'cursor-not-allowed opacity-70' : ''}
      ${className}
    `;

    return (
      <button className={buttonClasses} onClick={onClick} disabled={disabled}>
        {icon && <Icon path={icon} size={iconSize} />}
        {label && <span className={icon ? "ml-2" : ""}>{label}</span>}
      </button>
    );
  }

  if (color === 'glowing-purple') {
    const outerClasses = "relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 shadow-lg shadow-purple-500/50 dark:shadow-lg dark:shadow-purple-800/80";
    const innerClasses = `relative inline-flex items-center bg-white dark:bg-slate-900 rounded-md ${small ? 'px-3 py-1 text-sm' : 'px-5 py-2.5'}`;

    return (
      <button className={outerClasses} onClick={onClick} disabled={disabled}>
        <span className={innerClasses}>
          {icon && <Icon path={icon} size={iconSize} />}
          {label && <span className={icon ? "ml-2" : ""}>{label}</span>}
        </span>
      </button>
    );
  }

  if (color === 'glowing-red') {
    const outerClasses = "relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-red-500 to-orange-500 dark:text-white focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 shadow-lg shadow-red-500/50 dark:shadow-lg dark:shadow-red-800/80";
    const innerClasses = `relative inline-flex items-center bg-white dark:bg-slate-900 rounded-md ${small ? 'px-3 py-1 text-sm' : 'px-5 py-2.5'}`;

    return (
      <button className={outerClasses} onClick={onClick} disabled={disabled}>
        <span className={innerClasses}>
          {icon && <Icon path={icon} size={iconSize} />}
          {label && <span className={icon ? "ml-2" : ""}>{label}</span>}
        </span>
      </button>
    );
  }

  const componentClass = [
    "inline-flex",
    "justify-center",
    "items-center",
    "whitespace-nowrap",
    "focus:outline-hidden",
    "transition-colors",
    "focus:ring-3",
    "duration-150",
    "border",
    disabled ? "cursor-not-allowed" : "cursor-pointer",
    roundedFull ? "rounded-full" : "rounded-sm",
    getButtonColor(color, outline, !disabled, active),
    className,
  ];

  if (props.isGrouped) {
    componentClass.push("mr-3 last:mr-0 mb-3");
  }

  if (!label && icon) {
    componentClass.push("p-1");
  } else if (small) {
    componentClass.push("text-sm", roundedFull ? "px-3 py-1" : "p-1");
  } else {
    componentClass.push("py-2", roundedFull ? "px-6" : "px-3");
  }

  if (disabled) {
    componentClass.push(outline ? "opacity-50" : "opacity-70");
  }

  const componentClassString = componentClass.join(" ");

  const componentChildren = (
    <>
      {children || (
        <>
          {icon && <Icon path={icon} size={iconSize} />}
          {label && (
            <span className={small && icon ? "px-1" : "px-2"}>{label}</span>
          )}
        </>
      )}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} target={target} className={componentClassString}>
        {componentChildren}
      </Link>
    );
  }

  return React.createElement(
    asAnchor ? "a" : "button",
    {
      className: componentClassString,
      type: type ?? "button",
      target,
      disabled,
      onClick,
    },
    componentChildren,
  );
}
