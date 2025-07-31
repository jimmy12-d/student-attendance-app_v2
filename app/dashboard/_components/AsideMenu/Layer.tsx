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
      className={`${className} lg:py-2 lg:pl-2 w-60 fixed flex z-40 top-0 h-screen transition-all duration-300 ease-in-out overflow-hidden`}
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

          <div className="relative flex items-center justify-between px-4 py-4 h-20">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              {/* Logo container with enhanced styling */}
              <div className="flex-shrink-0 p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20 shadow-lg">
                <RodwellLogo />
              </div>
              
              {/* Text content with better typography */}
              <div className="flex-1 min-w-0">
                <h1 className="text-white font-bold text-lg leading-tight tracking-wide drop-shadow-sm truncate">
                  Rodwell Learning Center
                </h1>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                  <p className="text-purple-100 text-xs font-medium tracking-wide">
                    Admin Dashboard
                  </p>
                </div>
              </div>
            </div>

            {/* Enhanced close button */}
            <button
              className="hidden lg:inline-flex xl:hidden p-2.5 rounded-xl bg-white/10 hover:bg-white/20 hover:scale-105 transition-all duration-200 text-white border border-white/20 backdrop-blur-sm group"
              onClick={handleAsideLgCloseClick}
            >
              <Icon path={mdiClose} size={18} className="group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <nav>
            <AsideMenuList menu={menu} onRouteChange={props.onRouteChange} />
          </nav>
        </div>

        {/* Footer with Logout */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50/50 dark:bg-gray-800/50">
          <AsideMenuItem item={logoutItem} onRouteChange={props.onRouteChange} />
        </div>
      </div>
    </aside>
  );
}