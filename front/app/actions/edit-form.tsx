import { useContext } from "react";
import { EditActionContext } from "./use-edit-action";
import { TbCircleCheck, TbCircleX, TbPlus, TbTrash } from "react-icons/tb";
import type { ApiActionDataItem, ApiActionMethod } from "libs/prisma";
import cn from "@meltdownjs/cn";
import { RadioCard } from "~/components/radio-card";

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
        "rounded-box p-4 bg-base-200/50 shadow"
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
    requireEmailVerification,
    setRequireEmailVerification,
  } = useContext(EditActionContext);

  return (
    <>
      <div className="flex flex-col bg-base-200/50 rounded-box p-4 shadow">
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

function CalForm() {
  const {
    title,
    setTitle,
    description,
    setDescription,
    calConfig,
    setCalConfig,
    calProfile,
    calEventTypes,
  } = useContext(EditActionContext);

  return (
    <>
      {calProfile && (
        <div role="alert" className="alert alert-success">
          <TbCircleCheck />
          <span>
            Valid API key found for{" "}
            <span className="font-bold">{calProfile?.username}</span>
          </span>
        </div>
      )}

      {!calProfile && (
        <div role="alert" className="alert alert-error">
          <TbCircleX />
          <span>Enter a valid API key from Cal.com</span>
        </div>
      )}

      <div className="flex flex-col bg-base-200/50 rounded-box p-4 shadow">
        <div className="flex gap-2">
          <fieldset className="fieldset flex-1">
            <legend className="fieldset-legend">Title</legend>
            <input
              className="input w-full"
              type="text"
              placeholder="Ex: Book a meeting"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </fieldset>

          <fieldset className="fieldset flex-1">
            <legend className="fieldset-legend">Description</legend>
            <input
              className="input w-full"
              placeholder="Explain when to use it"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </fieldset>
        </div>

        <div className="flex gap-2">
          <fieldset className="fieldset flex-1">
            <legend className="fieldset-legend">API Key</legend>
            <input
              className="input w-full"
              type="text"
              placeholder="Ex: sk-1234567890"
              value={calConfig.apiKey ?? ""}
              onChange={(e) =>
                setCalConfig({ ...calConfig, apiKey: e.target.value })
              }
            />
          </fieldset>
        </div>

        <div className="flex gap-2">
          <fieldset className="fieldset flex-1">
            <legend className="fieldset-legend">Event Type</legend>
            <select
              className="select w-full"
              value={calConfig.eventTypeId ?? ""}
              onChange={(e) =>
                setCalConfig({ ...calConfig, eventTypeId: e.target.value })
              }
              disabled={!calEventTypes.length}
            >
              <option value="">Select an event type</option>
              {calEventTypes.map((eventType) => (
                <option key={eventType.id} value={eventType.id}>
                  {eventType.title}
                </option>
              ))}
            </select>
          </fieldset>
        </div>
      </div>
    </>
  );
}

export function EditForm() {
  const { type, setType } = useContext(EditActionContext);

  return (
    <div className="flex flex-col gap-4">
      <div className="text-base-content/50">
        Add the external APIs to be used by the chatbot whenever it is required.
        Give URL and describe about the API below so that the AI knows about it
        and uses it appropriately.
      </div>

      <div
        className={cn("p-4 bg-base-200/50 rounded-box border border-base-300")}
      >
        <RadioCard
          name="type"
          value={type}
          onChange={setType}
          options={[
            {
              label: "Custom",
              value: "custom",
              description: "Custom API",
              icon: <TbPlus />,
            },
            {
              label: "Cal.com",
              value: "cal",
              description: "Lets the chatbot to book meetings on Cal.com",
              img: "/cal.png",
            },
          ]}
        />
      </div>

      {type === "custom" && <CustomForm />}
      {type === "cal" && <CalForm />}
    </div>
  );
}
