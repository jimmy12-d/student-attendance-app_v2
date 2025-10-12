import React from "react";
import { MenuAsideItem } from "../../../_interfaces";
import AsideMenuItem from "./Item";

type Props = {
  menu: MenuAsideItem[];
  isDropdownList?: boolean;
  className?: string;
  onRouteChange: () => void;
};

export default function AsideMenuList({
  menu,
  isDropdownList = false,
  className = "",
  ...props
}: Props) {
  return (
    <ul className={`${className} ${isDropdownList ? 'space-y-1' : 'space-y-1'} list-none`}>
      {menu.map((item, index) => (
        item.isDivider ? (
          <div key={index} className="my-3 border-t border-gray-200 dark:border-gray-700 mx-4"></div>
        ) : (
          <AsideMenuItem
            key={index}
            item={item}
            isDropdownList={isDropdownList}
            onRouteChange={props.onRouteChange}
          />
        )
      ))}
    </ul>
  );
}
