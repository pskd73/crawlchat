import { ApiActionCall } from "@prisma/client";

export type DataGap = {
  title: string;
  description: string;
};

export type CustomMessage = {
  result?: {
    id: string;
    content: string;
    url?: string;
    score?: number;
    scrapeItemId?: string;
    fetchUniqueId?: string;
    query?: string;
    searchType?: string;
  }[];
  actionCall?: ApiActionCall;
  dataGap?: DataGap;
};
