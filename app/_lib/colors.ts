import type { ColorButtonKey } from "../_interfaces";

export const gradientBgBase = "bg-linear-to-tr";
export const gradientBgPurplePink = `${gradientBgBase} from-purple-400 via-pink-500 to-red-500`;
export const gradientBgDark = `${gradientBgBase} from-slate-700 via-slate-900 to-slate-800`;
export const gradientBgPinkRed = `${gradientBgBase} from-pink-400 via-red-500 to-yellow-500`;
export const gradientBgWhite = "bg-white";

export const colorsBgLight = {
  white: "bg-white text-black",
  light: "bg-white text-black dark:bg-slate-900/70 dark:text-white",
  contrast: "bg-gray-800 text-white dark:bg-white dark:text-black",
  success: "bg-emerald-500 border-emerald-500 text-white",
  danger: "bg-red-500 border-red-500 text-white",
  warning: "bg-yellow-500 border-yellow-500 text-white",
  info: "bg-blue-500 border-blue-500 text-white",
  'company-purple': 'bg-company-purple border-company-purple text-white',
};

export const colorsText = {
  white: "text-black dark:text-slate-100",
  light: "text-gray-700 dark:text-slate-400",
  contrast: "dark:text-white",
  success: "text-emerald-500",
  danger: "text-red-500",
  warning: "text-yellow-500",
  info: "text-blue-500",
  'company-purple': "text-company-purple dark:text-company-purple",
  facebook: "text-blue-800 dark:text-blue-700",
};

export const colorsOutline = {
  white: [colorsText.white, "border-gray-100"].join(" "),
  light: [colorsText.light, "border-gray-100"].join(" "),
  contrast: [colorsText.contrast, "border-gray-900 dark:border-slate-100"].join(
    " "
  ),
  success: [colorsText.success, "border-emerald-500"].join(" "),
  danger: [colorsText.danger, "border-red-500"].join(" "),
  warning: [colorsText.warning, "border-yellow-500"].join(" "),
  info: [colorsText.info, "border-blue-500"].join(" "),
  'company-purple': [colorsText["company-purple"], "border-company-purple"].join(" "),
  facebook: [colorsText.facebook, "border-blue-800"].join(" "),
};

export const getButtonColor = (
  color: ColorButtonKey,
  isOutlined: boolean,
  hasHover: boolean,
  isActive = false
) => {
  if (color === "void") {
    return "";
  }

  const colors = {
    ring: {
      white: "ring-gray-200 dark:ring-gray-500",
      whiteDark: "ring-gray-200 dark:ring-gray-500",
      lightDark: "ring-gray-200 dark:ring-gray-500",
      contrast: "ring-gray-300 dark:ring-gray-400",
      success: "ring-emerald-300 dark:ring-emerald-700",
      danger: "ring-red-300 dark:ring-red-700",
      warning: "ring-yellow-300 dark:ring-yellow-700",
      info: "ring-blue-300 dark:ring-blue-700",
      'company-purple': "ring-purple-300 dark:ring-purple-700",
      facebook: "ring-blue-300 dark:ring-blue-700",
    },
    active: {
      white: "bg-gray-100",
      whiteDark: "bg-gray-100 dark:bg-slate-800",
      lightDark: "bg-gray-200 dark:bg-slate-700",
      contrast: "bg-gray-700 dark:bg-slate-100",
      success: "bg-emerald-700 dark:bg-emerald-600",
      danger: "bg-red-700 dark:bg-red-600",
      warning: "bg-yellow-700 dark:bg-yellow-600",
      info: "bg-blue-700 dark:bg-blue-600",
      'company-purple': "bg-company-purple-dark dark:bg-company-purple-dark",
      facebook: "bg-blue-900 dark:bg-blue-800",
    },
    bg: {
      white: "bg-white text-black",
      whiteDark: "bg-white text-black dark:bg-slate-900 dark:text-white",
      lightDark: "bg-gray-100 text-black dark:bg-slate-800 dark:text-white",
      contrast: "bg-gray-800 text-white dark:bg-white dark:text-black",
      success: "bg-emerald-600 dark:bg-emerald-500 text-white",
      danger: "bg-red-600 dark:bg-red-500 text-white",
      warning: "bg-yellow-600 dark:bg-yellow-500 text-white",
      info: "bg-blue-600 dark:bg-blue-500 text-white",
      'company-purple': "bg-company-purple dark:bg-company-purple text-white",
      facebook: "bg-blue-800 dark:bg-blue-700 text-white",
    },
    bgHover: {
      white: "hover:bg-gray-300",
      whiteDark: "hover:bg-gray-200 dark:hover:bg-slate-800",
      lightDark: "hover:bg-gray-200 dark:hover:bg-slate-700",
      contrast: "hover:bg-gray-700 dark:hover:bg-slate-100",
      success:
        "hover:bg-emerald-700 hover:border-emerald-700 dark:hover:bg-emerald-600 dark:hover:border-emerald-600",
      danger:
        "hover:bg-red-700 hover:border-red-700 dark:hover:bg-red-600 dark:hover:border-red-600",
      warning:
        "hover:bg-yellow-700 hover:border-yellow-700 dark:hover:bg-yellow-600 dark:hover:border-yellow-600",
      info: "hover:bg-blue-700 hover:border-blue-700 dark:hover:bg-blue-600 dark:hover:border-blue-600",
      'company-purple': "hover:bg-company-purple-dark hover:border-company-purple-dark dark:hover:bg-company-purple-dark dark:hover:border-company-purple-dark",
      facebook: "hover:bg-blue-900 hover:border-blue-900 dark:hover:bg-blue-800 dark:hover:border-blue-800",
    },
    borders: {
      white: "border-white",
      whiteDark: "border-white dark:border-slate-900",
      lightDark: "border-gray-100 dark:border-slate-800",
      contrast: "border-gray-800 dark:border-white",
      success: "border-emerald-600 dark:border-emerald-500",
      danger: "border-red-600 dark:border-red-500",
      warning: "border-yellow-600 dark:border-yellow-500",
      info: "border-blue-600 dark:border-blue-500",
      'company-purple': "border-company-purple dark:border-company-purple",
      facebook: "border-blue-800 dark:border-blue-700",
    },
    text: {
      contrast: "dark:text-slate-100",
      success: "text-emerald-600 dark:text-emerald-500",
      danger: "text-red-600 dark:text-red-500",
      warning: "text-yellow-600 dark:text-yellow-500",
      info: "text-blue-600 dark:text-blue-500",
      'company-purple': "text-company-purple dark:text-company-purple",
      facebook: "text-blue-800 dark:text-blue-700",
    },
    outlineHover: {
      contrast:
        "hover:bg-gray-800 hover:text-gray-100 dark:hover:bg-slate-100 dark:hover:text-black",
      success:
        "hover:bg-emerald-600 hover:text-white hover:text-white dark:hover:text-white dark:hover:border-emerald-600",
      danger:
        "hover:bg-red-600 hover:text-white hover:text-white dark:hover:text-white dark:hover:border-red-600",
      warning:
        "hover:bg-yellow-600 hover:text-white hover:text-white dark:hover:text-white dark:hover:border-yellow-600",
      info: "hover:bg-blue-600 hover:text-white dark:hover:text-white dark:hover:border-blue-600",
      'company-purple': "hover:bg-company-purple hover:text-white dark:hover:text-white dark:hover:border-company-purple",
      facebook: "hover:bg-blue-800 hover:text-white dark:hover:text-white dark:hover:border-blue-800",
    },
  };

  const isOutlinedProcessed =
    isOutlined && ["white", "whiteDark", "lightDark"].indexOf(color) < 0;

  const base = [colors.borders[color], colors.ring[color]];

  if (isActive) {
    base.push(colors.active[color]);
  } else {
    base.push(isOutlinedProcessed ? colors.text[color] : colors.bg[color]);
  }

  if (hasHover) {
    base.push(
      isOutlinedProcessed ? colors.outlineHover[color] : colors.bgHover[color],
    );
  }

  return base.join(" ");
};
