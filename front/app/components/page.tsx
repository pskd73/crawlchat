import cn from "@meltdownjs/cn";
import { useContext, useEffect, useMemo, useRef } from "react";
import { TbArrowRight, TbMenu2, TbX } from "react-icons/tb";
import Markdown from "react-markdown";
import { AppContext } from "~/components/app-context";

function extractFirstParagraph(markdown: string): string {
  const lines = markdown.split("\n");
  const firstParagraph: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (firstParagraph.length > 0) {
        break;
      }
      continue;
    }
    if (trimmed.startsWith("#") || trimmed.startsWith("!")) {
      continue;
    }
    firstParagraph.push(trimmed);
  }

  return firstParagraph.join(" ");
}

export function Page({
  title,
  icon,
  children,
  right,
  noPadding,
  description,
}: {
  title: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  right?: React.ReactNode;
  noPadding?: boolean;
  description?: string;
}) {
  const {
    setContainerWidth,
    scrape,
    setClosedReleaseKey,
    closedReleaseKey,
    latestChangelog,
  } = useContext(AppContext);
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

  const release = useMemo(() => {
    if (!latestChangelog) return null;

    const firstParagraph = extractFirstParagraph(latestChangelog.markdown);

    return {
      key: latestChangelog.slug,
      title: latestChangelog.title,
      description: <Markdown>{firstParagraph}</Markdown>,
      date: latestChangelog.date.toISOString(),
      cta: {
        label: "Read more",
        href: `/changelog/${latestChangelog.slug}`,
        icon: <TbArrowRight />,
        target: "_blank",
      },
    };
  }, [latestChangelog]);

  return (
    <div className="flex flex-col flex-1">
      <div className="bg-base-100 border-b border-base-300 sticky top-0 z-10">
        <div
          className={cn(
            "flex flex-col p-4 h-[60px]",
            "justify-center",
            "max-w-[1200px] w-full mx-auto"
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
              <div>
                <div className="flex items-center gap-2 text-xl font-medium">
                  {icon && <span className="shrink-0">{icon}</span>}
                  <div className="line-clamp-1">{title}</div>
                </div>
                {description && (
                  <div className="text-xs text-base-content/50 line-clamp-1">
                    {description}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 items-center">{right}</div>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] w-full mx-auto h-full">
        <div
          className={cn("flex-1 flex flex-col h-full", !noPadding && "p-4")}
          ref={containerRef}
        >
          {release &&
            closedReleaseKey !== undefined &&
            closedReleaseKey !== release.key && (
              <div
                className={cn(
                  "bg-gradient-to-br from-primary to-primary/80 p-6 rounded-box",
                  "mb-4 text-primary-content shadow-md flex justify-between",
                  "gap-4 flex-col md:flex-row md:items-center"
                )}
              >
                <div className="flex flex-col gap-1 flex-4 pr-10">
                  <div
                    className={cn(
                      "text-2xl font-medium font-brand",
                      "flex items-center gap-2"
                    )}
                  >
                    {release.title}
                  </div>
                  <div className="text-primary-content/80">
                    {release.description}
                  </div>
                </div>
                <div className="flex gap-2">
                  {release.cta && (
                    <a
                      href={release.cta.href}
                      target={release.cta.target}
                      className="btn btn-accent"
                    >
                      {release.cta.label}
                      {release.cta.icon}
                    </a>
                  )}
                  <button
                    className="btn btn-neutral btn-square"
                    onClick={() => setClosedReleaseKey(release.key)}
                  >
                    <TbX />
                  </button>
                </div>
              </div>
            )}

          {children}
        </div>
      </div>
    </div>
  );
}
