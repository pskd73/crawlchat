import { useEffect } from "react";
import { TbArrowRight, TbSearch, TbWorld } from "react-icons/tb";
import { Link, Outlet } from "react-router";
import { makeMeta } from "~/meta";

export function meta() {
  return makeMeta({
    title: "CrawlChat Embed Demo",
  });
}

export default function EmbedDemo() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey && event.key === "k") {
        (window as any).crawlchatEmbed.show();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSearch() {
    (window as any).crawlchatEmbed.show();
  }

  return (
    <div className="flex flex-col gap-2 p-6 min-h-screen items-center">
      <div className="flex flex-col gap-6 max-w-[1000px] w-full">
        <div className="flex justify-between gap-2">
          <div className="flex gap-2 items-center">
            <TbWorld size={26} />
            <div className="text-2xl font-bold hidden md:block">
              Demo
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <a href="/embed-demo/pricing" className="link link-primary">Pricing</a>
            <Link to="/embed-demo/docs" className="link link-primary">Docs</Link>
            <label className="input">
              <TbSearch />
              <input
                type="search"
                className="grow"
                placeholder="Search contacts"
                onClick={handleSearch}
              />
              <kbd className="kbd kbd-sm">⌘K</kbd>
            </label>
            <div className="btn btn-primary hidden md:flex">
              Login
              <TbArrowRight />
            </div>
          </div>
        </div>

        <Outlet />

        <div className="w-full h-[100px] bg-base-200 rounded-box" />
        <div className="w-full h-[240px] bg-base-200 rounded-box" />
        <div className="w-full h-[60px] bg-base-200 rounded-box" />
        <div className="w-full h-[60px] bg-base-200 rounded-box" />
        <div className="w-full h-[100px] bg-base-200 rounded-box" />
        <div className="w-full h-[240px] bg-base-200 rounded-box" />
        <div className="w-full h-[60px] bg-base-200 rounded-box" />
        <div className="w-full h-[60px] bg-base-200 rounded-box" />
        <div className="w-full h-[60px] bg-base-200 rounded-box" />
        <div className="w-full h-[60px] bg-base-200 rounded-box" />
      </div>
    </div>
  );
}
