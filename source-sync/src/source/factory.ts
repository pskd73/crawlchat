import { KnowledgeGroupType } from "@packages/common/prisma";
import { ConfluenceSource } from "./confluence";
import { GithubDiscussionsSource } from "./source-github-discussions";
import { GithubIssuesSource } from "./source-github-issues";
import { LinearIssuesSource } from "./source-linear";
import { LinearProjectsSource } from "./source-linear-projects";
import { NotionSource } from "./source-notion";
import { TextSource } from "./source-text";
import { WebSource } from "./source-web";
import { YoutubeChannelSource } from "./source-youtube-channel";
import { YoutubeVideosSource } from "./source-youtube-videos";

export function makeSource(type: KnowledgeGroupType) {
  switch (type) {
    case "scrape_web":
      return new WebSource();
    case "notion":
      return new NotionSource();
    case "github_issues":
      return new GithubIssuesSource();
    case "github_discussions":
      return new GithubDiscussionsSource();
    case "upload":
    case "learn_discord":
    case "learn_slack":
    case "answer_corrections":
    case "custom":
      return new TextSource();
    case "confluence":
      return new ConfluenceSource();
    case "linear":
      return new LinearIssuesSource();
    case "linear_projects":
      return new LinearProjectsSource();
    case "youtube_channel":
      return new YoutubeChannelSource();
    case "youtube":
      return new YoutubeVideosSource();
    default:
      throw new Error(`Unknown source type: ${type}`);
  }
}
