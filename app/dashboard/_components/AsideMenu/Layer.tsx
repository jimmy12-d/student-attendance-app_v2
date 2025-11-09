import React, { useState, useMemo } from "react";
import { mdiLogout, mdiClose, mdiMagnify, mdiCloseCircle } from "@mdi/js";
import Icon from "../../../_components/Icon";
import AsideMenuItem from "./Item";
import AsideMenuList from "./List";
import { MenuAsideItem } from "../../../_interfaces";
import { useAppSelector } from "../../../_stores/hooks";
import RodwellLogo from "../../../_components/JustboilLogo";
import { mdiBellOutline } from "@mdi/js";
import { mdiChartLine } from "@mdi/js";
import { mdiFormSelect } from "@mdi/js";

type Props = {
  menu: MenuAsideItem[];
  className?: string;
  onAsideLgCloseClick: () => void;
  onRouteChange: () => void;
};

export default function AsideMenuLayer({
  menu,
  className = "",
  ...props
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const _darkMode = useAppSelector((state) => state.darkMode.isEnabled);

  const logoutItem: MenuAsideItem = {
    label: "Logout",
    icon: mdiLogout,
    isLogout: true,
    color: "danger"
  };

  const notificationItem: MenuAsideItem = {
    label: "Notification",
    icon: mdiBellOutline,
    href: "/dashboard/notification",
  };

  const paymentSummaryItem: MenuAsideItem = {
    label: "Payment Summary",
    icon: mdiChartLine,
    href: "/dashboard/payment-summary",
  };

  const formItem: MenuAsideItem = {
    label: "Forms",
    icon: mdiFormSelect,
    href: "/dashboard/forms",
  };

  // Filter menu items based on search term
  const filteredMenu = useMemo(() => {
    if (!searchTerm.trim()) return menu;

    const filterItems = (items: MenuAsideItem[]): MenuAsideItem[] => {
      return items
        .map(item => {
          // Check if the item itself matches
          const itemMatches = item.label.toLowerCase().includes(searchTerm.toLowerCase());

          // If item has submenu, filter submenu
          if (item.menu) {
            const filteredSubMenu = filterItems(item.menu);
            if (filteredSubMenu.length > 0 || itemMatches) {
              return { ...item, menu: filteredSubMenu };
            }
          }

          // Return item if it matches
          if (itemMatches) {
            return item;
          }

          return null;
        })
        .filter(Boolean) as MenuAsideItem[];
    };

    return filterItems(menu);
  }, [menu, searchTerm]);

  const handleAsideLgCloseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    props.onAsideLgCloseClick();
  };

  return (
    <aside
      className={`${className} lg:py-2 lg:pl-2 w-full sm:w-60 fixed flex z-110 top-0 h-screen transition-all duration-300 ease-in-out overflow-hidden`}
    >
      <div className="aside lg:rounded-2xl flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900 shadow-2xl border-r border-gray-200 dark:border-gray-700">
        {/* Enhanced Header with gradient and glow effects */}
        <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 dark:from-purple-800 dark:via-purple-900 dark:to-indigo-950 shadow-lg">
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"></div>
          
          {/* Enhanced pattern overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zM30 10c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          ></div>

          {/* Glow effect at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-300/50 to-transparent"></div>

          {/* Enhanced layout with better spacing */}
          <div className="relative px-4 py-2 min-h-[88px]">
            {/* Close button positioned absolutely for better space utilization */}
            <button
              className="hidden lg:inline-flex xl:hidden absolute top-3 right-3 p-2 rounded-lg bg-white/10 hover:bg-white/20 hover:scale-105 transition-all duration-200 text-white border border-white/20 backdrop-blur-sm group z-10"
              onClick={handleAsideLgCloseClick}
            >
              <Icon path={mdiClose} size={16} className="group-hover:rotate-90 transition-transform duration-200" />
            </button>

            {/* Main content with improved layout */}
            <div className="flex items-start space-x-3">
              {/* Logo container with enhanced styling */}
              <div className="flex-shrink-0 p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20 shadow-lg mt-1 cursor-pointer" onClick={() => window.location.reload()}>
                <RodwellLogo />
              </div>
              
              {/* Text content with spacious layout */}
              <div className="flex-1 min-w-0 pt-1">
                <h1 className="text-white font-bold text-base leading-snug tracking-wide drop-shadow-sm">
                  Rodwell Learning Center
                </h1>

              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {/* Search Input */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon path={mdiMagnify} size="16" className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search navigation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <Icon path={mdiCloseCircle} size="16" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                </button>
              )}
            </div>
          </div>
          
          <nav>
            {filteredMenu.length > 0 ? (
              <AsideMenuList menu={filteredMenu} onRouteChange={props.onRouteChange} />
            ) : searchTerm.trim() ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                <Icon path={mdiMagnify} size="48" className="mx-auto mb-4 opacity-50" />
                <p className="text-sm">No navigation items found for "{searchTerm}"</p>
                <button
                  onClick={() => setSearchTerm("")}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <AsideMenuList menu={menu} onRouteChange={props.onRouteChange} />
            )}
          </nav>
        </div>

        {/* Enhanced Footer with Modern Logout Design */}
        <div className="relative border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="p-2">
            <ul className="flex flex-col space-y-0.5 list-none">
              <AsideMenuItem item={paymentSummaryItem} onRouteChange={props.onRouteChange} />
              <AsideMenuItem item={notificationItem} onRouteChange={props.onRouteChange} />
              <AsideMenuItem item={logoutItem} onRouteChange={props.onRouteChange} />
            </ul>
          </div>
        </div>
      </div>
    </aside>
  );
}