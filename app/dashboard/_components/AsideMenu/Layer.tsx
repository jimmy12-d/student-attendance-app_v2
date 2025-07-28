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
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 dark:from-purple-800 dark:via-purple-900 dark:to-indigo-900">
          {/* Subtle pattern overlay */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          ></div>

          <div className="relative flex items-center justify-between h-16">
            <div className="flex items-center space-x-3 flex-1">
              <div className="flex-shrink-0">
                <RodwellLogo />
              </div>
              <div>
                {/* Added 'leading-tight' here */}
                <h1 className="text-white font-bold text-lg leading-tight">
                  Rodwell Learning Center
                </h1>
                <p className="text-purple-200 text-xs font-medium">
                  Admin Dashboard
                </p>
              </div>
            </div>

            <button
              className="hidden lg:inline-flex xl:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200 text-white"
              onClick={handleAsideLgCloseClick}
            >
              <Icon path={mdiClose} size={18} />
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