import type { KnowledgeGroup } from "@packages/common/prisma";
import { useMemo } from "react";
import { useFetcher } from "react-router";
import type { SelectValue } from "~/components/multi-select";
import { MultiSelect } from "~/components/multi-select";
import { SettingsSection } from "~/components/settings-section";
import { useDirtyForm } from "~/components/use-dirty-form";

export function SkipPagesRegex({
  group,
  pages,
  placeholder,
}: {
  group: KnowledgeGroup;
  pages?: Array<SelectValue>;
  placeholder?: string;
}) {
  const fetcher = useFetcher();
  const dirtyForm = useDirtyForm({
    skipPageRegex: group.skipPageRegex?.split(",").filter(Boolean) ?? [],
  });
  const valueString = useMemo(
    () => dirtyForm.getValue("skipPageRegex")?.join(",") ?? "",
    [dirtyForm.values]
  );

  return (
    <SettingsSection
      id="skip-pages-regex"
      fetcher={fetcher}
      title="Skip pages"
      description="Specify the regex of the URLs that you don't want it to scrape. You can give multiple regexes."
      dirty={dirtyForm.isDirty("skipPageRegex")}
    >
      <input value={valueString} name="skipPageRegex" type="hidden" />
      <MultiSelect
        value={dirtyForm.getValue("skipPageRegex") ?? []}
        onChange={(v) => dirtyForm.setValue("skipPageRegex", v)}
        placeholder={placeholder ?? "Ex: /admin, /dashboard"}
        selectValues={pages}
      />
    </SettingsSection>
  );
}
