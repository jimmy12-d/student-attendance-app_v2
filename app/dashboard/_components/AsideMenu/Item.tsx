"use client";

import React, { useEffect, useState } from "react";
import { mdiMinus, mdiPlus } from "@mdi/js";
import Icon from "../../../_components/Icon";
import Link from "next/link";
import AsideMenuList from "./List";
import { MenuAsideItem } from "../../../_interfaces";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { signOut } from "firebase/auth";
import { auth } from "../../../../firebase-config";

type Props = {
  item: MenuAsideItem;
  onRouteChange?: () => void;
  isDropdownList?: boolean;
};

const AsideMenuItem = ({ item, isDropdownList = false, onRouteChange }: Props) => {
  const [isLinkActive, setIsLinkActive] = useState(false);
  const [isDropdownActive, setIsDropdownActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const _activeClassAddon =
    !item.color && isLinkActive ? "aside-menu-item-active font-bold" : "";

  const pathname = usePathname();

  useEffect(() => {
    if (item.href) {
      const linkPathname = item.href.split("?")[0];
      if (linkPathname === "/dashboard") {
        setIsLinkActive(pathname === linkPathname);
      } else {
        setIsLinkActive(pathname.startsWith(linkPathname) && linkPathname !== "/");
      }
    } else {
      setIsLinkActive(false);
    }
  }, [item.href, pathname]);

  const handleFirebaseLogout = async () => {
    console.log("AsideMenuItem: Logout action triggered.");
    try {
      await signOut(auth);
      console.log("User signed out successfully from Firebase.");
      if (onRouteChange) {
        onRouteChange();
      }
    } catch (error) {
      console.error("Firebase Logout Error:", error);
    }
  };

  const handleMenuClick = () => {
    if (item.isLogout) {
      handleFirebaseLogout();
      return;
    }

    if (item.menu) {
      setIsDropdownActive(!isDropdownActive);
    }

    if (item.href && onRouteChange) {
      onRouteChange();
    }

    if (item.onClick) {
      item.onClick(item);
    }
  };

  const asideMenuItemInnerContents = (
    <>
      {item.icon && (
        <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-300 ${
          item.isLogout
            ? 'text-white'
            : isLinkActive 
              ? 'bg-blue-600 text-white shadow-lg' 
              : isHovered 
                ? 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400'
        }`}>
          <Icon
            path={item.icon}
            className="transition-transform duration-300"
            size="20"
          />
        </div>
      )}
      
      <div className="flex-1 min-w-0 ml-3">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium truncate transition-colors duration-300 ${
            item.isLogout
              ? 'text-white font-semibold'
              : isLinkActive 
                ? 'text-blue-600 dark:text-blue-400' 
                : isHovered 
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-700 dark:text-gray-300'
          }`}>
            {item.label}
          </span>
          
          <div className="flex items-center space-x-2">
            {item.notificationCount && item.notificationCount > 0 && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-semibold text-white bg-red-500 rounded-full shadow-sm"
              >
                {item.notificationCount > 99 ? '99+' : item.notificationCount}
              </motion.span>
            )}
            
            {item.menu && (
              <motion.div
                animate={{ rotate: isDropdownActive ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className={`flex items-center justify-center w-6 h-6 rounded transition-colors duration-300 ${
                  isHovered ? 'bg-gray-200 dark:bg-gray-600' : ''
                }`}
              >
                <Icon
                  path={isDropdownActive ? mdiMinus : mdiPlus}
                  className="text-gray-500 dark:text-gray-400"
                  size="16"
                />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  const componentClass = [
    "group relative flex items-center w-full rounded-xl transition-all duration-300 ease-in-out",
    isDropdownList ? "py-2 px-4 mx-2 my-1" : item.isLogout ? "py-1.5 px-3 mx-3 my-1" : "py-3 px-4 mx-3 my-1",
    item.color && item.isLogout
      ? "bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl border border-red-400/30 backdrop-blur-sm"
      : isLinkActive
        ? "bg-blue-50 dark:bg-blue-900/20 shadow-md border-l-4 border-blue-600"
        : isHovered
          ? "bg-gray-50 dark:bg-gray-800/50 shadow-sm transform translate-x-1"
          : "hover:bg-gray-50 dark:hover:bg-gray-800/50",
    "cursor-pointer select-none"
  ]
    .join(" ")
    .trim();

  const menuItemContent = (
    <motion.div
      className={componentClass}
      onClick={handleMenuClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ 
        scale: item.isLogout ? 1.03 : 1.02,
        boxShadow: item.isLogout ? "0 10px 25px -5px rgba(239, 68, 68, 0.3)" : undefined
      }}
      whileTap={{ scale: 0.97 }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleMenuClick();
        }
      }}
    >
      {asideMenuItemInnerContents}
      
      {/* Subtle glow effect for active items */}
      {isLinkActive && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600/5 to-purple-600/5 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      )}
    </motion.div>
  );

  return (
    <li className="relative">
      {/* Render as Link if href is present AND it's NOT a logout item AND not a dropdown parent */}
      {item.href && !item.menu && !item.isLogout ? (
        <Link href={item.href} target={item.target} className="block">
          {menuItemContent}
        </Link>
      ) : (
        menuItemContent
      )}

      {/* Dropdown menu list with smooth animation */}
      <AnimatePresence>
        {item.menu && isDropdownActive && (
          <motion.div
            initial={{ 
              height: 0, 
              opacity: 0,
              y: -10
            }}
            animate={{ 
              height: 'auto', 
              opacity: 1,
              y: 0
            }}
            exit={{ 
              height: 0, 
              opacity: 0,
              y: -10
            }}
            transition={{ 
              duration: 0.4, 
              ease: "easeInOut",
              opacity: { duration: 0.25 }
            }}
            className="overflow-hidden"
          >
            <div className="pl-4 pr-2 py-2 bg-gray-50/50 dark:bg-gray-800/30 mx-3 rounded-lg mt-1 border-l-2 border-gray-200 dark:border-gray-700">
              <AsideMenuList
                menu={item.menu}
                className=""
                onRouteChange={onRouteChange ?? (() => {})}
                isDropdownList
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
};

export default AsideMenuItem;