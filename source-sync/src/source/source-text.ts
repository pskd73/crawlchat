import { Source, UpdateItemResponse } from "./interface";
import { ItemData } from "./queue";

export class TextSource implements Source {
  async updateGroup(): Promise<void> {
    throw new Error("Not implemented");
  }

  async updateItem(jobData: ItemData): Promise<UpdateItemResponse> {
    return {
      page: jobData.textPage,
    };
  }
}
