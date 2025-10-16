import cn from "@meltdownjs/cn";
import type { LlmModel } from "libs/prisma";
import { useContext, useEffect, useRef } from "react";
import { TbAlertTriangle, TbMenu2 } from "react-icons/tb";
import { Link } from "react-router";
import { AppContext } from "~/dashboard/context";

const LlmNameMap: Record<LlmModel, string> = {
  gpt_4o_mini: "OpenAI 4o-mini",
  gpt_5_nano: "OpenAI GPT 5-nano",
  gpt_5: "OpenAI GPT 5",
  gpt_5_mini: "OpenAI GPT 5-mini",
  sonnet_4_5: "Claude Sonnet 4.5",
  o3_mini: "OpenAI o3-mini",
  sonnet_3_7: "Claude Sonnet 3.7",
  sonnet_3_5: "Claude Sonnet 3.5",
  gemini_2_5_flash: "Gemini 2.5 Flash",
  gemini_2_5_flash_lite: "Gemini 2.5 Flash Lite",
  o4_mini: "OpenAI o4-mini",
  haiku_4_5: "Claude Haiku 4.5",
};

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
  const { setContainerWidth, scrape } = useContext(AppContext);
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

  const productionLlmModels: LlmModel[] = [
    "sonnet_4_5",
    "gpt_5",
    "haiku_4_5",
  ];
  const currentLlmModel = scrape?.llmModel ?? "gpt_4o_mini";

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
        {scrape?.llmModel && !productionLlmModels.includes(scrape.llmModel) && (
          <div role="alert" className="alert alert-warning alert-dash mb-4">
            <TbAlertTriangle size={20} />
            <span>
              You are using{" "}
              <span className="font-medium">
                {LlmNameMap[currentLlmModel] ?? currentLlmModel}
              </span>{" "}
              model. This is not fit for public usage. Use one of{" "}
              {productionLlmModels
                .map((model) => LlmNameMap[model] ?? model)
                .join(", ")}{" "}
              for better results from{" "}
              <Link to="/settings#ai-model" className="link">
                here
              </Link>
            </span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
