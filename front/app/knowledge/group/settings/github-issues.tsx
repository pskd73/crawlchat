import type { KnowledgeGroup } from "@packages/common/prisma";
import { useMemo } from "react";
import { useFetcher } from "react-router";
import type { SelectValue } from "~/components/multi-select";
import { MultiSelect } from "~/components/multi-select";
import { SettingsSection } from "~/components/settings-section";
import { useDirtyForm } from "~/components/use-dirty-form";

export function GithubIssuesSettings({ group }: { group: KnowledgeGroup }) {
  const allowedStatesFetcher = useFetcher();
  const githubIssuesTypeFetcher = useFetcher();
  const form = useDirtyForm({
    allowedGithubIssueStates:
      group.allowedGithubIssueStates?.split(",").filter(Boolean) ?? [],
    githubIssuesType: group.githubIssuesType ?? "all",
  });
  const allowedStatesString = useMemo(
    () =>
      (form.getValue("allowedGithubIssueStates") as string[])?.join(",") ?? "",
    [form.values]
  );

  const stateOptions: Array<SelectValue> = [
    { title: "Open", value: "open" },
    { title: "Closed", value: "closed" },
  ];

  return (
    <>
      <SettingsSection
        id="allowed-github-issue-states"
        fetcher={allowedStatesFetcher}
        title="Allowed issue states"
        description="Select the states of issues to fetch. You can select multiple states. Default it fetches all closed issues."
        dirty={form.isDirty("allowedGithubIssueStates")}
      >
        <input
          value={allowedStatesString}
          name="allowedGithubIssueStates"
          type="hidden"
        />
        <MultiSelect
          value={(form.getValue("allowedGithubIssueStates") as string[]) ?? []}
          onChange={(v) => form.setValue("allowedGithubIssueStates", v)}
          placeholder="Select states to fetch"
          selectValues={stateOptions}
        />
      </SettingsSection>

      <SettingsSection
        id="github-issues-type"
        fetcher={githubIssuesTypeFetcher}
        title="Issues type"
        description="Specify the type of issues to fetch. Either fetch all issues, only issues, or only pull requests."
        dirty={form.isDirty("githubIssuesType")}
      >
        <select
          name="githubIssuesType"
          className="select"
          value={(form.getValue("githubIssuesType") as string) ?? "all"}
          onChange={form.handleChange("githubIssuesType")}
        >
          <option value="all">All</option>
          <option value="only_issues">Only issues</option>
          <option value="only_prs">Only pull requests</option>
        </select>
      </SettingsSection>
    </>
  );
}
