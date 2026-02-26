import cn from "@meltdownjs/cn";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { TbCheck } from "react-icons/tb";
import { Link, useLocation, type FetcherWithComponents } from "react-router";
import { useFetcherToast } from "./use-fetcher-toast";

export function SettingsSection({
  id,
  children,
  fetcher,
  title,
  description,
  actionRight,
  plainTitle,
  danger,
  formRef,
  saveLabel = "Save",
  savePrimary = false,
  saveIcon,
  multipart = false,
  dirty = false,
  toastOptions,
}: {
  id?: string;
  children?: React.ReactNode;
  fetcher?: FetcherWithComponents<unknown>;
  title?: React.ReactNode;
  description?: string;
  actionRight?: React.ReactNode;
  plainTitle?: string;
  danger?: boolean;
  formRef?: React.RefObject<HTMLFormElement | null>;
  saveLabel?: string;
  savePrimary?: boolean;
  saveIcon?: React.ReactNode;
  multipart?: boolean;
  dirty?: boolean;
  toastOptions?: {
    title?: string;
    description?: string;
  };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [targeted, setTargeted] = useState(false);
  const { addSection } = useContext(SettingsSectionContext);
  const location = useLocation();

  useEffect(() => {
    if (id) {
      let _title = plainTitle ?? id;
      if (typeof title === "string") {
        _title = title;
      }
      addSection(id, _title);
    }
  }, [id, title, plainTitle]);

  useEffect(() => {
    const hash = location.hash;
    if (id && hash === `#${id}` && ref.current) {
      const elementPosition = ref.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - 70;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      setTargeted(true);
    } else {
      setTargeted(false);
    }
  }, [id, location.hash]);

  useFetcherToast(fetcher, toastOptions ?? { title: "Saved" });

  function render() {
    return (
      <div
        className={cn(
          "border border-base-300 rounded-box flex flex-col",
          "outline-primary outline-offset-3 bg-base-100 shadow-sm",
          danger && "border-red-200 bg-red-50 text-error",
          targeted && "outline-2"
        )}
        ref={ref}
      >
        <div className={cn("flex flex-col gap-4 p-4")}>
          {(title || description) && (
            <div className="flex flex-col gap-2">
              {title && <div className="text-md font-medium">{title}</div>}
              {description && (
                <div
                  className={cn(
                    "text-sm text-base-content/50",
                    danger && "text-error/50"
                  )}
                >
                  {description}
                </div>
              )}
            </div>
          )}
          {children}
        </div>
        {(actionRight || fetcher) && (
          <div
            className={cn(
              "flex justify-between p-4 py-3 border-t border-base-300",
              "bg-base-200/50 w-full rounded-b-box",
              danger && "bg-red-100 border-red-200"
            )}
          >
            <div className="flex gap-2 justify-end w-full">
              {actionRight}
              {fetcher && (
                <button
                  type="submit"
                  className={cn(
                    "btn",
                    danger && "btn-error",
                    savePrimary && "btn-primary",
                    dirty && "btn-primary"
                  )}
                  disabled={fetcher.state !== "idle"}
                >
                  {fetcher.state !== "idle" && (
                    <span className="loading loading-spinner" />
                  )}
                  {saveLabel}
                  {saveIcon ?? <TbCheck />}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!fetcher) {
    return render();
  }

  return (
    <fetcher.Form
      ref={formRef}
      method="post"
      encType={
        multipart ? "multipart/form-data" : "application/x-www-form-urlencoded"
      }
    >
      {render()}
    </fetcher.Form>
  );
}

export function SettingsContainer({ children }: { children: React.ReactNode }) {
  const { sections } = useContext(SettingsSectionContext);
  const [activeId, setActiveId] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash;
    if (hash) {
      setActiveId(hash.slice(1));
    }
  }, [location.hash]);

  return (
    <div className="flex gap-8 items-start w-full">
      <div className="flex flex-col gap-4 flex-1">{children}</div>
      <div className="w-[200px] sticky top-[80px] hidden md:flex flex-col gap-2">
        <div className="text-sm font-medium">On this page</div>
        <div className="flex flex-col gap-2">
          {sections.map((section) => (
            <Link
              key={section.id}
              className={cn(
                "text-sm opacity-50 hover:opacity-100",
                activeId === section.id &&
                  "font-medium text-primary opacity-100"
              )}
              to={`#${section.id}`}
              preventScrollReset
            >
              {section.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function useSettingsSections() {
  const [sections, setSections] = useState<{ id: string; title: string }[]>([]);

  function addSection(id: string, title: string) {
    setSections((prev) => {
      if (prev.find((s) => s.id === id)) {
        return prev;
      }
      return [...prev, { id, title }];
    });
  }

  return { sections, addSection };
}

type SettingsSectionState = ReturnType<typeof useSettingsSections>;

export const SettingsSectionContext = createContext<SettingsSectionState>({
  sections: [],
  addSection: () => {},
});

export function SettingsSectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useSettingsSections();

  return (
    <SettingsSectionContext.Provider value={value}>
      {children}
    </SettingsSectionContext.Provider>
  );
}
