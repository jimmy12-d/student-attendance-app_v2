import React, { ReactNode } from "react";

type Props = {
  display?: string;
  useMargin?: boolean;
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
};

export default function NavBarItemPlain({
  display = "flex",
  useMargin = false,
  onClick,
  children,
}: Props) {
  const classBase =
    "items-center cursor-pointer dark:text-white dark:hover:text-slate-400 transition-all duration-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700";
  const classAddon = `${display} navbar-item-label ${useMargin ? "my-2 mx-3" : "py-2 px-3"}`;

  return (
    <div className={`${classBase} ${classAddon}`} onClick={onClick}>
      {children}
    </div>
  );
}
