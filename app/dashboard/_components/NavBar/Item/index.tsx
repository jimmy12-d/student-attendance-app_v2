"use client";

import React from "react";
import Link from "next/link";
import { useState } from "react";
import Divider from "../../../../_components/Divider";
import Icon from "../../../../_components/Icon";
import { useAppDispatch, useAppSelector } from "../../../../_stores/hooks";
import { MenuNavBarItem } from "../../../../_interfaces";
import { setDarkMode } from "../../../../_stores/darkModeSlice";

type Props = {
  item: MenuNavBarItem;
  onRouteChange: () => void;
};

export default function NavBarItem({ item, ...props }: Props) {
  const dispatch = useAppDispatch();

  const userName = useAppSelector((state) => state.main.userName);

  const [isDropdownActive, setIsDropdownActive] = useState(false);

  const componentClass = [
    "block lg:flex items-center relative cursor-pointer transition-all duration-200",
    isDropdownActive
      ? `navbar-item-label-active dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg`
      : `navbar-item-label dark:text-white dark:hover:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg`,
    item.menu ? "lg:py-2 lg:px-3" : "py-3 px-4",
    item.isDesktopNoLabel ? "lg:w-16 lg:justify-center" : "",
  ].join(" ");

  const itemLabel = item.isCurrentUser ? userName : item.label;

  const handleMenuClick = () => {
    if (item.menu) {
      setIsDropdownActive(!isDropdownActive);
    }

    if (item.isToggleLightDark) {
      dispatch(setDarkMode(null));
    }
  };

  const NavBarItemComponentContents = (
    <>
      <div
        className={`flex items-center rounded-lg transition-all duration-200 ${
          item.menu
            ? "bg-gray-50 dark:bg-slate-700 lg:bg-transparent lg:dark:bg-transparent p-3 lg:p-0 hover:bg-gray-100 dark:hover:bg-slate-600"
            : "hover:bg-gray-100 dark:hover:bg-slate-700"
        }`}
        onClick={handleMenuClick}
      >
        {item.icon && (
          <Icon
            path={item.icon}
            className="transition-all duration-200 hover:scale-110"
            size="20"
          />
        )}
        <span
          className={`px-2 transition-all duration-200 font-medium ${
            item.isDesktopNoLabel && item.icon ? "lg:hidden" : ""
          }`}
        >
          {itemLabel}
        </span>
      </div>
    </>
  );

  if (item.isDivider) {
    return <Divider navBar />;
  }

  if (item.href) {
    return (
      <Link
        href={item.href}
        target={item.target}
        className={componentClass}
        onClick={props.onRouteChange}
      >
        {NavBarItemComponentContents}
      </Link>
    );
  }

  return <div className={componentClass}>{NavBarItemComponentContents}</div>;
}
