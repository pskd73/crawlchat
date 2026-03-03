import { fetchChannelVideos, fetchYouTubeVideoData } from "../youtube";
import { GroupForSource, Source, UpdateItemResponse } from "./interface";
import { GroupData, ItemData } from "./queue";
import { scheduleUrls } from "./schedule";

export class YoutubeChannelSource implements Source {
  async updateGroup(jobData: GroupData, group: GroupForSource): Promise<void> {
    if (!group.url) {
      throw new Error("Group url is required");
    }

    const { videos, nextPageToken } = await fetchChannelVideos(
      group.url,
      jobData.cursor
    );

    const skipRegexes = (group.skipPageRegex?.split(",") ?? []).filter(Boolean);

    const filteredVideos = videos.filter((video) => {
      if (skipRegexes.length === 0) {
        return true;
      }
      return !skipRegexes.some((regex) => {
        const r = new RegExp(regex.trim());
        return r.test(video.url) || r.test(video.id) || r.test(video.title);
      });
    });

    await scheduleUrls(
      group,
      jobData.processId,
      filteredVideos.map(({ url }) => ({
        url,
        sourcePageId: url,
      })),
      nextPageToken
    );
  }

  async updateItem(
    jobData: ItemData,
    group: GroupForSource
  ): Promise<UpdateItemResponse> {
    const { transcript, title } = await fetchYouTubeVideoData(jobData.url);

    if (!transcript || transcript.trim().length === 0) {
      throw new Error("No transcript available for this video");
    }

    return {
      page: {
        text: transcript,
        title: title,
      },
    };
  }
}
