import React from "react";
import { mdiLogout, mdiClose } from "@mdi/js";
import Icon from "../../../_components/Icon";
import AsideMenuItem from "./Item";
import AsideMenuList from "./List";
import { MenuAsideItem } from "../../../_interfaces";
import { useAppSelector } from "../../../_stores/hooks";
import RodwellLogo from "../../../_components/JustboilLogo";

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
  const darkMode = useAppSelector((state) => state.darkMode.isEnabled);

  const logoutItem: MenuAsideItem = {
    label: "Logout",
    icon: mdiLogout,
    isLogout: true,
    color: "danger"
  };

  const handleAsideLgCloseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    props.onAsideLgCloseClick();
  };

  return (
    <aside
      className={`${className} lg:py-2 lg:pl-2 w-60 fixed flex z-110 top-0 h-screen transition-all duration-300 ease-in-out overflow-hidden`}
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
              <div className="flex-shrink-0 p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20 shadow-lg mt-1">
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
          <nav>
            <AsideMenuList menu={menu} onRouteChange={props.onRouteChange} />
          </nav>
        </div>

        {/* Enhanced Footer with Modern Logout Design */}
        <div className="relative border-t border-gray-200/20 dark:border-gray-700/30 bg-gradient-to-r from-gray-50/80 via-gray-100/60 to-gray-50/80 dark:from-gray-800/80 dark:via-gray-700/60 dark:to-gray-800/80 backdrop-blur-sm">
          {/* Subtle glow effect at top */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-gray-300/20"></div>
          
          <div className="p-2 flex items-center justify-between">
            <AsideMenuItem item={logoutItem} onRouteChange={props.onRouteChange} />
          </div>
        </div>
      </div>
    </aside>
  );
}