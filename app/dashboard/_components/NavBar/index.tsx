"use client";

import React, { ReactNode, useState } from "react";
import { mdiClose, mdiDotsVertical } from "@mdi/js";
import { containerMaxW } from "../../../_lib/config";
import Icon from "../../../_components/Icon";
import NavBarItemPlain from "./Item/Plain";
import NavBarMenuList from "./MenuList";
import UserDisplay from "./UserDisplay";
import { MenuNavBarItem } from "../../../_interfaces";

type Props = {
  menu: MenuNavBarItem[];
  className: string;
  children: ReactNode;
};

export default function NavBar({ menu, className = "", children }: Props) {
  const [isMenuNavBarActive, setIsMenuNavBarActive] = useState(false);

  const handleMenuNavBarToggleClick = () => {
    setIsMenuNavBarActive(!isMenuNavBarActive);
  };

  const handleRouteChange = () => {
    setIsMenuNavBarActive(false)
  }

  return (
    <nav
      className={`${className} top-0 inset-x-0 fixed bg-white/80 dark:bg-slate-800/80 h-16 z-100 transition-all duration-300 w-screen lg:w-auto backdrop-blur-sm`}
    >
      <div className={`flex items-center lg:items-stretch px-4 lg:px-6 ${containerMaxW} h-16`}>
        {/* Left Section - Children (hamburger menu, etc.) */}
        <div className="flex flex-1 items-center h-16">
          {children}
        </div>

        {/* Center Section - Could be used for breadcrumbs or title */}
        <div className="hidden lg:flex flex-1 items-center justify-center h-16">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {/* Future: Add breadcrumb or page title here */}
          </div>
        </div>

        {/* Right Section - User Display and Menu */}
        <div className="flex items-center h-16 space-x-2">
          {/* Desktop User Display with enhanced styling */}
          <div className="hidden lg:block">
            <UserDisplay />
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex lg:hidden items-center">
            <NavBarItemPlain onClick={handleMenuNavBarToggleClick}>
              <div className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200">
                <Icon
                  path={isMenuNavBarActive ? mdiClose : mdiDotsVertical}
                  size="24"
                  className="text-gray-600 dark:text-gray-300"
                />
              </div>
            </NavBarItemPlain>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <div
          className={`${
            isMenuNavBarActive ? "block" : "hidden"
          } max-h-screen-menu overflow-y-auto lg:overflow-visible absolute w-screen top-16 left-0 shadow-xl lg:w-auto lg:flex lg:static lg:shadow-none bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700`}
        >
          {/* Mobile User Display */}
          <div className="lg:hidden">
            <UserDisplay isMobile={true} />
          </div>

          {/* Navigation Menu */}
          <NavBarMenuList menu={menu} onRouteChange={handleRouteChange} />
        </div>
      </div>
    </nav>
  );
}
