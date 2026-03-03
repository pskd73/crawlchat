import { GroupForSource, Source, UpdateItemResponse } from "./interface";
import { GroupData, ItemData } from "./queue";

export class EmptySource implements Source {
  async updateGroup(jobData: GroupData, group: GroupForSource): Promise<void> {
    throw new Error("Not implemented");
  }

  async updateItem(
    jobData: ItemData,
    group: GroupForSource
  ): Promise<UpdateItemResponse> {
    throw new Error("Not implemented");
  }
}
