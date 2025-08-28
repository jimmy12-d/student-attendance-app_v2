import type { ReactNode } from "react";

type Props = {
  htmlFor?: string;
  children: ReactNode;
  className?: string;
};

const FieldLabel = ({ htmlFor, children, ...props }: Props) => {
  return (
    <label
      htmlFor={htmlFor}
      className={`block mb-2 font-semibold text-gray-900 dark:text-white ${htmlFor ? "cursor-pointer" : ""} ${props.className ?? ""}`}
    >
      <span className="line-clamp-1">{children}</span>
    </label>
  );
};

export default FieldLabel;
