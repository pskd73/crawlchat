import type { Scrape, User } from "@packages/common/prisma";
import type { Plan } from "@packages/common/user-plan";
import type { FetcherWithComponents } from "react-router";
import {
  TbBook,
  TbBrandDiscord,
  TbBrandGithub,
  TbBrandSlack,
  TbChartBarOff,
  TbChartLine,
  TbChecks,
  TbChevronDown,
  TbChevronUp,
  TbCode,
  TbColorSwatch,
  TbCreditCard,
  TbKey,
  TbLogout,
  TbMessage,
  TbPencil,
  TbPlug,
  TbPointer,
  TbRobotFace,
  TbSettings,
  TbStarFilled,
  TbTicket,
  TbTools,
  TbUser,
  TbUsers,
  TbWorld,
} from "react-icons/tb";
import { Link, NavLink } from "react-router";
import { numberToKMB } from "~/components/number-util";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { Logo } from "./logo";
import { ScrapePrivacyBadge } from "~/components/scrape-type-badge";
import { PlanIconBadge } from "~/components/plan-icon-badge";
import cn from "@meltdownjs/cn";

type MenuItemType = {
  label: string;
  to: string;
  icon: React.ReactNode;
  external?: boolean;
  items?: MenuItemType[];
  forScrape?: boolean;
  isNew?: boolean;
};

function SideMenuItem({
  link,
  badge,
  onClick,
}: {
  link: MenuItemType;
  badge?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (onClick) {
      e.preventDefault();
      onClick(e);
    }
  }

  if (!link.to) return null;

  return (
    <NavLink
      to={link.to}
      target={link.external ? "_blank" : undefined}
      onClick={handleClick}
    >
      {({ isPending, isActive }) => (
        <div
          className={cn(
            "flex pl-3 pr-2 py-1 w-full justify-between rounded-box items-center",
            "hover:bg-accent/10 hover:text-accent group",
            isActive && !link.items && "bg-accent/10 text-accent",
            isActive && link.items && "bg-base-300"
          )}
        >
          <div className="flex gap-2 items-center">
            {link.icon}
            {link.label}
            {isPending && (
              <span className="loading loading-spinner loading-xs" />
            )}
          </div>

          {badge}
        </div>
      )}
    </NavLink>
  );
}

function CreditProgress({
  title,
  used,
  total,
}: {
  title: string;
  used: number;
  total: number;
}) {
  const value = Math.max(0, Math.min(used, total));
  const percentage = (value / total) * 100;
  const tip = `Used ${used} of ${total}`;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        {title}
        <div className="tooltip tooltip-left" data-tip={tip}>
          {numberToKMB(used)} / {numberToKMB(total)}
        </div>
      </div>
      <progress
        className={cn(
          "progress",
          percentage > 80
            ? "progress-error"
            : percentage > 60
              ? "progress-warning"
              : percentage > 40
                ? "progress-info"
                : "progress-success"
        )}
        value={value}
        max={total}
      />
    </div>
  );
}

function WithSubMenuItems({
  item,
  pathname,
  isNew,
}: {
  item: MenuItemType;
  pathname: string;
  isNew?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(pathname.startsWith(item.to));

  return (
    <>
      <SideMenuItem
        link={item}
        onClick={() => setIsExpanded(!isExpanded)}
        badge={
          <div className="flex items-center gap-2">
            {isNew && (
              <span className="badge badge-success badge-soft badge-sm">
                New
                <TbStarFilled />
              </span>
            )}
            <span className="text-base-content/40">
              {isExpanded ? <TbChevronUp /> : <TbChevronDown />}
            </span>
          </div>
        }
      />

      <ul
        className={cn(
          "ml-4 hidden flex-col gap-1",
          "border-l border-base-300",
          isExpanded && "flex"
        )}
      >
        {item.items?.map((item, index) => (
          <SideMenuItem key={index} link={item} />
        ))}
      </ul>
    </>
  );
}

function MenuItemsScrollable({ children }: PropsWithChildren) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const topLayerRef = useRef<HTMLDivElement>(null);
  const bottomLayerRef = useRef<HTMLDivElement>(null);
  const LAYER_HEIGHT = 40;

  useEffect(() => {
    function handleScroll() {
      updateLayerHeights();
    }

    if (scrollRef.current) {
      scrollRef.current.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (scrollRef.current) {
        scrollRef.current.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  function updateLayerHeights() {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight } = scrollRef.current;
    const rect = scrollRef.current.getBoundingClientRect();
    const height = rect.height;

    const hiddenTop = scrollTop;
    const hiddenBottom = scrollHeight - (scrollTop + height);

    const topHeight = Math.min(LAYER_HEIGHT, hiddenTop);
    const bottomHeight = Math.min(LAYER_HEIGHT, hiddenBottom);

    if (topLayerRef.current) {
      topLayerRef.current.style.height = `${topHeight}px`;
    }
    if (bottomLayerRef.current) {
      bottomLayerRef.current.style.height = `${bottomHeight}px`;
    }
  }

  return (
    <div
      className={cn("flex flex-col gap-1 px-3 w-full flex-1 relative min-h-0")}
    >
      <div
        ref={topLayerRef}
        className={cn(
          "bg-gradient-to-b from-base-100 to-base-100/0",
          "absolute top-0 left-0 w-full"
        )}
        style={{ height: 0 }}
      />
      <div
        ref={scrollRef}
        className={cn(
          "overflow-y-auto min-h-0 flex-1 no-scrollbar",
          "flex flex-col gap-1"
        )}
      >
        {children}
      </div>
      <div
        ref={bottomLayerRef}
        className={cn(
          "bg-gradient-to-t from-base-100 to-base-100/0",
          "absolute bottom-0 left-0 w-full"
        )}
        style={{ height: 0 }}
      />
    </div>
  );
}

export function SideMenu({
  scrapeOwner,
  loggedInUser,
  plan,
  scrapes,
  scrapeId,
  scrapeIdFetcher,
  toBeFixedMessages,
  openTickets,
  scrape,
  dataGapMessages,
  usedPages,
  pathname,
}: {
  scrapeOwner?: User;
  loggedInUser: User;
  contentRef?: React.RefObject<HTMLDivElement | null>;
  plan: Plan;
  scrapes: Scrape[];
  scrapeId?: string;
  scrapeIdFetcher: FetcherWithComponents<any>;
  toBeFixedMessages: number;
  openTickets: number;
  scrape?: Scrape;
  dataGapMessages: number;
  usedPages: number;
  pathname: string;
}) {
  const links: MenuItemType[] = useMemo(() => {
    const links = [
      {
        label: "Summary",
        to: "/app",
        icon: <TbChartLine />,
      },
      {
        label: "Knowledge",
        to: "/knowledge",
        icon: <TbBook />,
        forScrape: true,
      },
      {
        label: "Integrate",
        to: "/integrate",
        icon: <TbPlug />,
        forScrape: true,
        items: [
          {
            label: "Customise",
            to: "/integrate/customise",
            icon: <TbColorSwatch />,
            forScrape: true,
          },
          {
            label: "Web embed",
            to: "/integrate/web-embed",
            icon: <TbWorld />,
            forScrape: true,
          },
          {
            label: "Discord bot",
            to: "/integrate/discord-bot",
            icon: <TbBrandDiscord />,
            forScrape: true,
          },
          {
            label: "Slack app",
            to: "/integrate/slack-app",
            icon: <TbBrandSlack />,
            forScrape: true,
          },
          {
            label: "GitHub bot",
            to: "/integrate/github-bot",
            icon: <TbBrandGithub />,
            forScrape: true,
          },
          {
            label: "MCP",
            to: "/integrate/mcp",
            icon: <TbRobotFace />,
            forScrape: true,
          },
          {
            label: "API",
            to: "/integrate/api",
            icon: <TbCode />,
            forScrape: true,
          },
        ],
      },
      {
        label: "Questions",
        to: "/questions",
        icon: <TbMessage />,
        forScrape: true,
      },
      {
        label: "Data gaps",
        to: "/data-gaps",
        icon: <TbChartBarOff />,
        forScrape: true,
      },
      {
        label: "Tickets",
        to: "/tickets",
        icon: <TbTicket />,
        forScrape: true,
        ticketingEnabled: true,
      },
      {
        label: "Actions",
        to: "/actions",
        icon: <TbPointer />,
        forScrape: true,
      },
      {
        label: "Settings",
        to: "/settings",
        icon: <TbSettings />,
        forScrape: true,
      },
      {
        label: "Team",
        to: "/team",
        icon: <TbUsers />,
        forScrape: true,
      },
      {
        label: "Tools",
        icon: <TbTools />,
        forScrape: true,
        to: "/tool",
        items: [
          {
            label: "Compose",
            to: "/tool/compose",
            icon: <TbPencil />,
            forScrape: true,
          },
          {
            label: "Skill maker",
            to: "/tool/skill-maker",
            icon: <TbCode />,
            forScrape: true,
          },
          {
            label: "Fact check",
            to: "/tool/fact-check",
            icon: <TbChecks />,
            forScrape: true,
          },
        ],
      },
      {
        label: "API Keys",
        to: "/api-key",
        icon: <TbKey />,
        forScrape: true,
      },
      {
        label: "Profile",
        to: "/profile",
        icon: <TbUser />,
      },
    ];

    return links
      .filter((link) => !link.forScrape || scrapeId)
      .filter((link) => !link.ticketingEnabled || scrape?.ticketingEnabled);
  }, []);

  const totalMessages = plan.credits.messages;
  const totalScrapes = scrapeOwner?.plan?.limits?.pages ?? plan.limits.pages;

  const availableMessages =
    scrapeOwner?.plan?.credits?.messages ?? plan.credits.messages;
  const usedMessages = totalMessages - availableMessages;

  const availableScrapes = totalScrapes - usedPages;
  const usedScrapes = totalScrapes - availableScrapes;

  function getMenuBadge(label: string) {
    if (label === "Tickets" && openTickets > 0) {
      return (
        <span className="badge badge-primary px-2 badge-soft">
          {openTickets}
        </span>
      );
    }
    if (label === "Questions" && toBeFixedMessages > 0) {
      return (
        <span className="badge badge-error px-2 badge-soft">
          {toBeFixedMessages}
        </span>
      );
    }
    if (label === "Data gaps" && dataGapMessages > 0) {
      return (
        <span className="badge badge-error px-2 badge-soft">
          {dataGapMessages}
        </span>
      );
    }
  }

  function handleChangeScrape(scrapeId: string) {
    scrapeIdFetcher.submit(
      { intent: "set-scrape-id", scrapeId },
      {
        method: "post",
        action: "/app",
      }
    );
    (document.activeElement as HTMLElement)?.blur();
  }

  const visibleName = loggedInUser.name || loggedInUser.email;

  return (
    <div className={cn("flex flex-col h-full", "gap-0 justify-between w-full")}>
      <div className="flex flex-col py-4 gap-2">
        <div className="flex flex-col px-4 mb-4">
          <div className="flex justify-between">
            <Logo />
            <div className="flex gap-1">
              {scrape && (
                <ScrapePrivacyBadge private={scrape.private ?? false} />
              )}
              <PlanIconBadge
                userPlan={scrapeOwner?.plan ?? loggedInUser.plan}
              />
            </div>
          </div>
        </div>

        {scrape && (
          <div className="px-3 w-full">
            <div className="dropdown w-full">
              <button tabIndex={0} className="btn w-full flex justify-between">
                {scrapeId ? scrape?.title : "Select collection"}
                <TbChevronDown />
              </button>
              <ul
                tabIndex={0}
                className="menu dropdown-content bg-base-200 rounded-box z-1 w-full shadow mt-1"
              >
                {scrapes.map((scrape) => (
                  <li key={scrape.id}>
                    <a onClick={() => handleChangeScrape(scrape.id)}>
                      {scrape.title ?? "Untitled"}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <MenuItemsScrollable>
        {links.map((link, index) =>
          !link.items ? (
            <SideMenuItem
              key={index}
              link={link}
              badge={getMenuBadge(link.label)}
            />
          ) : (
            <WithSubMenuItems
              key={index}
              item={link}
              pathname={pathname}
              isNew={link.isNew}
            />
          )
        )}
      </MenuItemsScrollable>

      <div className="p-4 flex flex-col gap-2">
        <div
          className={cn(
            "flex flex-col gap-2 bg-base-200 rounded-box",
            "p-3 border border-base-300"
          )}
        >
          <CreditProgress
            title="Message credits"
            used={usedMessages}
            total={totalMessages}
          />
          <CreditProgress
            title="Pages"
            used={usedScrapes}
            total={totalScrapes}
          />
        </div>
        <div className="flex justify-between gap-2">
          <div className="flex gap-2 items-center">
            {loggedInUser.photo ? (
              <div className="avatar">
                <div className="w-8 rounded-full">
                  <img src={loggedInUser.photo} />
                </div>
              </div>
            ) : (
              <div className="avatar avatar-placeholder">
                <div
                  className={cn(
                    "bg-neutral text-neutral-content w-8 rounded-full",
                    "flex items-center justify-center"
                  )}
                >
                  <span className="text-lg">
                    {visibleName[0].toUpperCase()}
                  </span>
                </div>
              </div>
            )}

            <div className="truncate w-30">{visibleName}</div>
          </div>

          <div className="dropdown dropdown-top dropdown-end">
            <button tabIndex={0} className="btn btn-sm mt-1 btn-square">
              <TbChevronUp />
            </button>
            <ul
              tabIndex={0}
              className="menu dropdown-content bg-base-200 rounded-box z-1 p-2 shadow-sm"
            >
              <li>
                <Link
                  to="/profile"
                  onClick={() => (document.activeElement as any).blur()}
                >
                  <TbUser />
                  Profile
                </Link>
              </li>
              <li>
                <Link
                  to="/profile#billing"
                  onClick={() => (document.activeElement as any).blur()}
                >
                  <TbCreditCard />
                  Billing
                </Link>
              </li>
              <li>
                <a href="/logout">
                  <TbLogout />
                  Logout
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
