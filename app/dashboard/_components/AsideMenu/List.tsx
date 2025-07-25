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
    <ul className={`${className} ${isDropdownList ? 'space-y-1' : 'space-y-2'}`}>
      {menu.map((item, index) => (
        <AsideMenuItem
          key={index}
          item={item}
          isDropdownList={isDropdownList}
          onRouteChange={props.onRouteChange}
        />
      ))}
    </ul>
  );
}
