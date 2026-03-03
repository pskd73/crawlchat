import type { KnowledgeGroup } from "@packages/common/prisma";
import { useMemo } from "react";
import { useFetcher } from "react-router";
import type { SelectValue } from "~/components/multi-select";
import { MultiSelect } from "~/components/multi-select";
import { SettingsSection } from "~/components/settings-section";
import { useDirtyForm } from "~/components/use-dirty-form";

export function LinearSettings({
  group,
  linearIssueStatuses,
  linearProjectStatuses,
}: {
  group: KnowledgeGroup;
  linearIssueStatuses: Array<SelectValue>;
  linearProjectStatuses: Array<SelectValue>;
}) {
  const skipIssueStatusesFetcher = useFetcher();
  const skipProjectStatusesFetcher = useFetcher();
  const dirtyForm = useDirtyForm({
    linearSkipIssueStatuses:
      group.linearSkipIssueStatuses?.split(",").filter(Boolean) ?? [],
    linearSkipProjectStatuses:
      group.linearSkipProjectStatuses?.split(",").filter(Boolean) ?? [],
  });
  const skipIssueStatusesString = useMemo(
    () => dirtyForm.getValue("linearSkipIssueStatuses")?.join(",") ?? "",
    [dirtyForm.values]
  );
  const skipProjectStatusesString = useMemo(
    () => dirtyForm.getValue("linearSkipProjectStatuses")?.join(",") ?? "",
    [dirtyForm.values]
  );

  return (
    <>
      {group.type === "linear" && (
        <SettingsSection
          id="linear-skip-issue-statuses"
          fetcher={skipIssueStatusesFetcher}
          title="Skip issue statuses"
          description="Specify the statuses of the issues that you don't want it to scrape. You can give multiple statuses."
          dirty={dirtyForm.isDirty("linearSkipIssueStatuses")}
        >
          <input
            value={skipIssueStatusesString}
            name="linearSkipIssueStatuses"
            type="hidden"
          />
          <MultiSelect
            value={dirtyForm.getValue("linearSkipIssueStatuses") ?? []}
            onChange={(v) => dirtyForm.setValue("linearSkipIssueStatuses", v)}
            placeholder="Select statuses to skip"
            selectValues={linearIssueStatuses}
          />
        </SettingsSection>
      )}

      {group.type === "linear_projects" && (
        <SettingsSection
          id="linear-skip-project-statuses"
          fetcher={skipProjectStatusesFetcher}
          title="Skip project statuses"
          description="Specify the statuses of the projects that you don't want it to scrape. You can give multiple statuses."
          dirty={dirtyForm.isDirty("linearSkipProjectStatuses")}
        >
          <input
            value={skipProjectStatusesString}
            name="linearSkipProjectStatuses"
            type="hidden"
          />
          <MultiSelect
            value={dirtyForm.getValue("linearSkipProjectStatuses") ?? []}
            onChange={(v) => dirtyForm.setValue("linearSkipProjectStatuses", v)}
            placeholder="Select statuses to skip"
            selectValues={linearProjectStatuses}
          />
        </SettingsSection>
      )}
    </>
  );
}
