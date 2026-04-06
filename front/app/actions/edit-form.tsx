import cn from "@meltdownjs/cn";
import type {
  ApiActionDataItem,
  ApiActionMethod,
} from "@packages/common/prisma";
import { useContext } from "react";
import { TbPlus, TbTrash } from "react-icons/tb";
import { EditActionContext } from "./use-edit-action";

function DataItemForm({
  item,
  index,
  updateDataItem,
  removeDataItem,
}: {
  item: ApiActionDataItem;
  index: number;
  updateDataItem: (
    index: number,
    key: keyof ApiActionDataItem,
    value: string
  ) => void;
  removeDataItem: (index: number) => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col border border-base-300",
        "rounded-box p-4 bg-base-100 shadow"
      )}
    >
      <div className="flex gap-2">
        <fieldset className="fieldset flex-1">
          <legend className="fieldset-legend">Type</legend>
          <select
            className="select select-bordered w-full"
            defaultValue={item.type}
            onChange={(e) => updateDataItem(index, "type", e.target.value)}
          >
            <option value="dynamic">Dynamic</option>
            <option value="value">Value</option>
          </select>
        </fieldset>

        <fieldset className="fieldset flex-1">
          <legend className="fieldset-legend">Data Type</legend>
          <select
            className="select select-bordered w-full"
            defaultValue={item.type}
            onChange={(e) => updateDataItem(index, "dataType", e.target.value)}
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
          </select>
        </fieldset>
      </div>

      <div className="flex gap-2">
        <fieldset className="fieldset flex-1">
          <legend className="fieldset-legend">Key</legend>
          <input
            className="input w-full"
            placeholder="Enter your key"
            value={item.key}
            onChange={(e) => updateDataItem(index, "key", e.target.value)}
          />
        </fieldset>

        {item.type === "dynamic" && (
          <fieldset className="fieldset flex-1">
            <legend className="fieldset-legend">Description</legend>
            <input
              className="input w-full"
              placeholder="Enter your description"
              value={item.description}
              onChange={(e) =>
                updateDataItem(index, "description", e.target.value)
              }
            />
          </fieldset>
        )}
        {item.type === "value" && (
          <fieldset className="fieldset flex-1">
            <legend className="fieldset-legend">Value</legend>
            <input
              className="input w-full"
              placeholder="Enter the value"
              value={item.value ?? ""}
              onChange={(e) => updateDataItem(index, "value", e.target.value)}
            />
          </fieldset>
        )}
      </div>
      <div className="flex gap-2 justify-end mt-2">
        <button
          className="btn btn-soft btn-error"
          onClick={() => removeDataItem(index)}
        >
          Remove <TbTrash />
        </button>
      </div>
    </div>
  );
}

function EmailVerificationField() {
  const { requireEmailVerification, setRequireEmailVerification } =
    useContext(EditActionContext);

  return (
    <fieldset className="fieldset">
      <legend className="fieldset-legend">Email verification</legend>
      <label className="label">
        <input
          type="checkbox"
          className="toggle"
          defaultChecked={requireEmailVerification}
          name="requireEmailVerification"
          onChange={(e) => setRequireEmailVerification(e.target.checked)}
        />
        Require email verification
      </label>
    </fieldset>
  );
}

function CustomForm() {
  const {
    data,
    addDataItem,
    title,
    setTitle,
    url,
    setUrl,
    method,
    setMethod,
    updateDataItem,
    removeDataItem,
    headers,
    addHeaderItem,
    updateHeaderItem,
    removeHeaderItem,
    description,
    setDescription,
  } = useContext(EditActionContext);

  return (
    <>
      <div
        className={cn(
          "flex flex-col bg-base-100 rounded-box p-4 shadow",
          "border border-base-300"
        )}
      >
        <div className="flex gap-2">
          <fieldset className="fieldset flex-1">
            <legend className="fieldset-legend">Title</legend>
            <input
              className="input w-full"
              type="text"
              placeholder="Ex: Find customer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </fieldset>

          <fieldset className="fieldset flex-1">
            <legend className="fieldset-legend">Description</legend>
            <input
              className="input w-full"
              placeholder="Ex: Find a customer by email when required."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </fieldset>
        </div>

        <div className="flex gap-2">
          <fieldset className="fieldset flex-1">
            <legend className="fieldset-legend">URL</legend>
            <input
              className="input w-full"
              placeholder="Enter the URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </fieldset>

          <fieldset className="fieldset flex-1">
            <legend className="fieldset-legend">Method</legend>
            <select
              className="select select-bordered w-full"
              value={method}
              onChange={(e) => setMethod(e.target.value as ApiActionMethod)}
            >
              <option value="get">GET</option>
              <option value="post">POST</option>
              <option value="put">PUT</option>
              <option value="delete">DELETE</option>
            </select>
          </fieldset>
        </div>

        <EmailVerificationField />
      </div>

      <div className="flex flex-col gap-2 mt-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium">Data</h2>
          <button
            className="btn btn-sm btn-soft btn-square"
            onClick={() =>
              addDataItem({
                key: "",
                dataType: "string",
                description: "",
                type: "dynamic",
                value: null,
              })
            }
          >
            <TbPlus />
          </button>
        </div>

        <div className="text-base-content/50">
          Data to be passed to the API. It will be passed as JSON for POST and
          as query parameters for GET requests. Select Value if you want to pass
          the value as constant.
        </div>

        {data.items.map((item, index) => (
          <DataItemForm
            key={index}
            item={item}
            index={index}
            updateDataItem={updateDataItem}
            removeDataItem={removeDataItem}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2 mt-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium">Headers</h2>
          <button
            className="btn btn-sm btn-soft btn-square"
            onClick={() =>
              addHeaderItem({
                key: "",
                dataType: "string",
                description: "",
                type: "dynamic",
                value: null,
              })
            }
          >
            <TbPlus />
          </button>
        </div>

        <div className="text-base-content/50">
          Headers to be passed to the API. Use Value type if it is constant or
          an API key.
        </div>

        {headers.items.map((item, index) => (
          <DataItemForm
            key={index}
            item={item}
            index={index}
            updateDataItem={updateHeaderItem}
            removeDataItem={removeHeaderItem}
          />
        ))}
      </div>
    </>
  );
}

export function EditForm() {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-base-content/50">
        Add the external APIs to be used by the chatbot whenever it is required.
        Give URL and describe about the API below so that the AI knows about it
        and uses it appropriately.
      </div>

      <CustomForm />
    </div>
  );
}
