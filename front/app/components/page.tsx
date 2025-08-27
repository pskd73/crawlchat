import cn from "@meltdownjs/cn";
import { useContext, useEffect, useRef } from "react";
import { TbMenu2 } from "react-icons/tb";
import { AppContext } from "~/dashboard/context";

export function Page({
  title,
  icon,
  children,
  right,
  noPadding,
}: {
  title: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  right?: React.ReactNode;
  noPadding?: boolean;
}) {
  const { setContainerWidth } = useContext(AppContext);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex flex-col flex-1 max-w-[1200px] w-full mx-auto">
      <div
        className={cn(
          "flex flex-col p-4 h-[60px] bg-base-100",
          "justify-center sticky top-0 z-10"
        )}
      >
        <div className="flex justify-between gap-2">
          <div className="flex gap-2 items-center">
            <label
              htmlFor="side-menu-drawer"
              className="btn btn-square md:hidden"
            >
              <TbMenu2 />
            </label>
            <div className="flex items-center gap-2 text-xl font-medium">
              {icon}
              <div className="line-clamp-1">{title}</div>
            </div>
          </div>
          <div className="flex gap-2 items-center">{right}</div>
        </div>
      </div>
      <div
        className={cn("flex-1 flex flex-col", !noPadding && "p-4")}
        ref={containerRef}
      >
        {children}
      </div>
    </div>
  );
}
