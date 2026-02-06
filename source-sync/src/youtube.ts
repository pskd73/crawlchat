type ChannelInfo = {
  id: string;
  url: string;
  handle: string;
  title: string;
};

type ChannelVideoItem = {
  id: string;
  thumbnail: string;
  type: string;
  title: string;
  description: string;
  commentCountText: string;
  commentCountInt: number;
  likeCountText: string;
  likeCountInt: number;
  viewCountText: string;
  viewCountInt: number;
  publishDateText: string;
  publishDate: string;
  channel: ChannelInfo;
  durationMs: number;
  durationFormatted: string;
  keywords?: string[];
  url: string;
};

type ChannelVideosResponse = {
  videos: ChannelVideoItem[];
  nextPageToken?: string;
};

function extractChannelIdOrHandle(channelUrl: string): {
  channelId?: string;
  handle?: string;
} {
  try {
    const url = new URL(channelUrl);
    const pathname = url.pathname;

    // Handle different YouTube URL formats:
    // https://www.youtube.com/channel/UC-9-kyTW8ZkZNDHQJ6FgpwQ
    // https://www.youtube.com/@handle
    // https://www.youtube.com/c/channelname
    // https://youtube.com/user/username

    if (pathname.startsWith("/channel/")) {
      const channelId = pathname.split("/channel/")[1]?.split("/")[0];
      if (channelId) {
        return { channelId };
      }
    } else if (pathname.startsWith("/@")) {
      const handle = pathname.split("/@")[1]?.split("/")[0];
      if (handle) {
        return { handle };
      }
    } else if (pathname.startsWith("/c/")) {
      const handle = pathname.split("/c/")[1]?.split("/")[0];
      if (handle) {
        return { handle };
      }
    } else if (pathname.startsWith("/user/")) {
      const handle = pathname.split("/user/")[1]?.split("/")[0];
      if (handle) {
        return { handle };
      }
    }

    // If it's already a channel ID (starts with UC-)
    if (
      channelUrl.startsWith("UC-") ||
      channelUrl.match(/^UC[a-zA-Z0-9_-]{22}$/)
    ) {
      return { channelId: channelUrl };
    }

    // If it's a handle (starts with @)
    if (channelUrl.startsWith("@")) {
      return { handle: channelUrl.substring(1) };
    }

    return { handle: channelUrl };
  } catch {
    // If URL parsing fails, assume it's a channel ID or handle
    if (
      channelUrl.startsWith("UC-") ||
      channelUrl.match(/^UC[a-zA-Z0-9_-]{22}$/)
    ) {
      return { channelId: channelUrl };
    }
    if (channelUrl.startsWith("@")) {
      return { handle: channelUrl.substring(1) };
    }
    return { handle: channelUrl };
  }
}

export async function fetchChannelVideos(channelUrl: string, cursor?: string) {
  const apiKey = process.env.SCRAPECREATORS_API_KEY;

  if (!apiKey) {
    throw new Error("SCRAPECREATORS_API_KEY environment variable is not set.");
  }

  const { channelId, handle } = extractChannelIdOrHandle(channelUrl);

  const apiUrl = new URL(
    "https://api.scrapecreators.com/v1/youtube/channel-videos"
  );

  if (channelId) {
    apiUrl.searchParams.append("channelId", channelId);
  } else if (handle) {
    apiUrl.searchParams.append("handle", handle);
  } else {
    throw new Error(
      "Invalid channel URL. Must be a channel ID, handle, or YouTube channel URL."
    );
  }

  if (cursor) {
    apiUrl.searchParams.set("continuationToken", cursor);
  }

  const response = await fetch(apiUrl.toString(), {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to fetch channel videos: ${response.status} ${response.statusText}`;

    const errorData = JSON.parse(errorText);
    errorMessage = errorData.message || errorData.error || errorMessage;

    throw new Error(errorMessage);
  }

  return (await response.json()) as ChannelVideosResponse;
}

type TranscriptItem = {
  text: string;
  startMs: string;
  endMs: string;
  startTimeText: string;
};

type TranscriptApiResponse = {
  videoId: string;
  type: string;
  url: string;
  transcript: TranscriptItem[] | null;
  transcript_only_text: string | null;
  language: string | null;
};

type ScrapeCreatorsVideoResponse = {
  id: string;
  thumbnail: string;
  type: string;
  title: string;
  description: string;
  commentCountText: string;
  commentCountInt: number;
  likeCountText: string;
  likeCountInt: number;
  viewCountText: string;
  viewCountInt: number;
  publishDateText: string;
  publishDate: string;
  channel: ChannelInfo;
  durationMs: number;
  durationFormatted: string;
  keywords?: string[];
  transcript?: TranscriptItem[];
  transcript_only_text?: string;
};

type YouTubeVideoData = {
  transcript: string;
  title: string;
};

async function fetchTranscriptFromApi(
  videoUrl: string,
  apiKey: string,
  language?: string
): Promise<string | null> {
  const apiUrl = new URL(
    "https://api.scrapecreators.com/v1/youtube/video/transcript"
  );
  apiUrl.searchParams.append("url", videoUrl);
  if (language) {
    apiUrl.searchParams.append("language", language);
  }

  const response = await fetch(apiUrl.toString(), {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status >= 500) {
      const errorText = await response.text();
      let errorMessage = `Transcript fetch failed: ${response.status} ${response.statusText}`;
      const errorData = JSON.parse(errorText);
      if (errorData?.message || errorData?.error) {
        errorMessage = errorData.message || errorData.error;
      }
      throw new Error(errorMessage);
    }
    return null;
  }

  const data: TranscriptApiResponse = await response.json();
  if (data.transcript_only_text?.trim()) {
    return data.transcript_only_text.trim();
  }
  if (
    data.transcript &&
    Array.isArray(data.transcript) &&
    data.transcript.length > 0
  ) {
    return data.transcript
      .map((item) => item.text)
      .filter((text) => text?.trim().length > 0)
      .join(" ")
      .trim();
  }
  return null;
}

function transcriptFromVideoResponse(
  data: ScrapeCreatorsVideoResponse
): string {
  if (data.transcript_only_text?.trim()) {
    return data.transcript_only_text.trim();
  }
  if (
    data.transcript &&
    Array.isArray(data.transcript) &&
    data.transcript.length > 0
  ) {
    return data.transcript
      .map((item) => item.text)
      .filter((text) => text?.trim().length > 0)
      .join(" ")
      .trim();
  }
  return "";
}

export async function fetchYouTubeVideoData(
  videoUrl: string,
  options?: { language?: string }
): Promise<YouTubeVideoData> {
  const apiKey = process.env.SCRAPECREATORS_API_KEY;

  if (!apiKey) {
    throw new Error("SCRAPECREATORS_API_KEY environment variable is not set.");
  }

  const videoApiUrl = new URL(
    "https://api.scrapecreators.com/v1/youtube/video"
  );
  videoApiUrl.searchParams.append("url", videoUrl);

  const videoResponse = await fetch(videoApiUrl.toString(), {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!videoResponse.ok) {
    const errorText = await videoResponse.text();
    let errorMessage = `Failed to fetch video data: ${videoResponse.status} ${videoResponse.statusText}`;
    const errorData = JSON.parse(errorText);
    if (errorData?.message || errorData?.error) {
      errorMessage = errorData.message || errorData.error;
    }
    throw new Error(errorMessage);
  }

  const data: ScrapeCreatorsVideoResponse = await videoResponse.json();

  if (!data) {
    throw new Error("APP: No video data found");
  }

  const title = data.title?.trim() || "YouTube Video";

  let transcript =
    transcriptFromVideoResponse(data) ??
    (await fetchTranscriptFromApi(videoUrl, apiKey, options?.language));

  if (!transcript || transcript.length === 0) {
    throw new Error(
      "APP: No transcript found. The video may not have captions enabled."
    );
  }

  return {
    transcript,
    title,
  };
}
