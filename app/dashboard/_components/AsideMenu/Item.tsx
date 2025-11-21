"use client";

import React, { useEffect, useState, useRef } from "react";
import { mdiMinus, mdiPlus } from "@mdi/js";
import Icon from "../../../_components/Icon";
import Link from "next/link";
import AsideMenuList from "./List";
import { MenuAsideItem } from "../../../_interfaces";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { signOut } from "firebase/auth";
import { auth } from "../../../../firebase-config";

type Props = {
  item: MenuAsideItem;
  onRouteChange?: () => void;
  isDropdownList?: boolean;
  shouldOpenDropdown?: boolean;
};

const AsideMenuItem = ({ item, isDropdownList = false, onRouteChange, shouldOpenDropdown = false }: Props) => {
  const [isLinkActive, setIsLinkActive] = useState(false);
  const [isDropdownActive, setIsDropdownActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const menuItemRef = useRef<HTMLDivElement>(null);
  const itemId = useRef(`menu-item-${Math.random().toString(36).substr(2, 9)}`).current;

  const _activeClassAddon =
    !item.color && isLinkActive ? "aside-menu-item-active font-bold" : "";

  const pathname = usePathname();
  const router = useRouter();

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

  // Auto-open dropdown when search results are found in nested menu
  useEffect(() => {
    if (shouldOpenDropdown && item.menu) {
      setIsDropdownActive(true);
    } else if (!shouldOpenDropdown && item.menu) {
      setIsDropdownActive(false);
    }
  }, [shouldOpenDropdown, item.menu]);

  // Clear navigating state when pathname changes
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

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
      return;
    }

    if (item.href) {
      const targetPath = item.href.split("?")[0];
      
      // If already on this page, don't navigate
      if (pathname === targetPath) {
        if (onRouteChange) {
          onRouteChange();
        }
        return;
      }
      
      // Set loading state immediately for visual feedback
      setIsNavigating(true);
      
      // Navigate to the href
      if (item.target === '_blank') {
        window.open(item.href, '_blank');
        setIsNavigating(false);
      } else {
        router.push(item.href);
        // Navigation state will be cleared by pathname change or timeout
        setTimeout(() => setIsNavigating(false), 3000);
      }
      
      if (onRouteChange) {
        onRouteChange();
      }
      return;
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
            size={item.iconSize || "20"}
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
            {isNavigating && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center"
              >
                <svg className="animate-spin h-4 w-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </motion.div>
            )}
            
            {!isNavigating && item.notificationCount && item.notificationCount > 0 && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-semibold text-white bg-red-500 rounded-full shadow-sm"
              >
                {item.notificationCount > 99 ? '99+' : item.notificationCount}
              </motion.span>
            )}
            
            {!isNavigating && item.menu && (
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
    isDropdownList ? "py-1 px-4 mx-2 my-0.5" : item.isLogout ? "py-1 px-3 mx-3 my-0.5" : "py-1.5 px-4 mx-3 my-0.5",
    item.color && item.isLogout
      ? "bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl border border-red-400/30 backdrop-blur-sm"
      : isLinkActive
        ? "bg-blue-50 dark:bg-blue-900/20 shadow-md border-l-4 border-blue-600"
        : isHovered
          ? "bg-gray-50 dark:bg-gray-800/50 shadow-sm transform translate-x-1"
          : "hover:bg-gray-50 dark:hover:bg-gray-800/50",
    isNavigating ? "opacity-70 pointer-events-none" : "",
    "cursor-pointer select-none"
  ]
    .join(" ")
    .trim();

  const menuItemContent = (
    <motion.div
      ref={menuItemRef}
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
        // Enter or Space: Activate the item or toggle dropdown
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleMenuClick();
          return;
        }

        // Arrow Down or Tab: Move to next item (including submenus)
        if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
          e.preventDefault();
          
          // Get all visible menu items from the entire aside menu
          const asideMenu = menuItemRef.current?.closest('aside');
          const allVisibleItems = asideMenu?.querySelectorAll('[role="button"][tabindex="0"]');
          
          if (allVisibleItems && allVisibleItems.length > 0) {
            const itemsArray = Array.from(allVisibleItems) as HTMLElement[];
            // Use document.activeElement to find current focused element more reliably
            const currentFocused = document.activeElement;
            const currentIndex = itemsArray.findIndex(item => item === currentFocused || item === menuItemRef.current);
            
            if (currentIndex !== -1) {
              // Move to next item, or wrap to first
              const nextIndex = (currentIndex + 1) % itemsArray.length;
              itemsArray[nextIndex].focus();
            } else if (itemsArray.length > 0) {
              // If current not found, focus first item
              itemsArray[0].focus();
            }
          }
          return;
        }

        // Arrow Up or Shift+Tab: Move to previous item (including submenus)
        if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
          e.preventDefault();
          
          // Get all visible menu items from the entire aside menu
          const asideMenu = menuItemRef.current?.closest('aside');
          const allVisibleItems = asideMenu?.querySelectorAll('[role="button"][tabindex="0"]');
          
          if (allVisibleItems && allVisibleItems.length > 0) {
            const itemsArray = Array.from(allVisibleItems) as HTMLElement[];
            // Use document.activeElement to find current focused element more reliably
            const currentFocused = document.activeElement;
            const currentIndex = itemsArray.findIndex(item => item === currentFocused || item === menuItemRef.current);
            
            if (currentIndex !== -1) {
              if (currentIndex === 0) {
                // If at first item, focus the search input
                const searchInput = asideMenu?.querySelector('input[type="text"]') as HTMLElement;
                if (searchInput) {
                  searchInput.focus();
                } else {
                  // Fallback: wrap to last item
                  itemsArray[itemsArray.length - 1].focus();
                }
              } else {
                // Move to previous item
                itemsArray[currentIndex - 1].focus();
              }
            } else if (itemsArray.length > 0) {
              // If current not found, focus last item
              itemsArray[itemsArray.length - 1].focus();
            }
          }
          return;
        }

        // Arrow Right: Open dropdown or navigate into submenu
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (item.menu && !isDropdownActive) {
            setIsDropdownActive(true);
            // After opening, focus first child item
            setTimeout(() => {
              const asideMenu = menuItemRef.current?.closest('aside');
              const allVisibleItems = asideMenu?.querySelectorAll('[role="button"][tabindex="0"]');
              if (allVisibleItems && allVisibleItems.length > 0) {
                const itemsArray = Array.from(allVisibleItems) as HTMLElement[];
                const currentIndex = itemsArray.findIndex(item => item === menuItemRef.current);
                // Next item after opening should be the first child
                if (itemsArray[currentIndex + 1]) {
                  itemsArray[currentIndex + 1].focus();
                }
              }
            }, 150);
          }
          return;
        }

        // Arrow Left: Close dropdown
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (item.menu && isDropdownActive) {
            setIsDropdownActive(false);
            // Refocus the parent item
            setTimeout(() => {
              menuItemRef.current?.focus();
            }, 50);
          }
          return;
        }
      }}
      title={item.label} // Tooltip for accessibility
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
    <li>
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