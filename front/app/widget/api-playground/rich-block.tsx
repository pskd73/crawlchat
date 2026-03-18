import cn from "@meltdownjs/cn";
import { Fragment, useMemo, useState } from "react";
import { TbChevronRight, TbChevronUp, TbSend, TbX } from "react-icons/tb";

function RichURL({ url }: { url: string }) {
  const parts = useMemo(() => {
    try {
      const pathname = new URL(url).pathname;
      return pathname.split("/").map((p) => decodeURIComponent(p));
    } catch {
      return [];
    }
  }, [url]);
  return (
    <div className="flex items-center">
      {parts.map((part, index) => (
        <Fragment key={index}>
          <span
            key={part}
            className={cn(part.startsWith("{") && "badge badge-accent mx-1")}
          >
            {part}
          </span>
          {index < parts.length - 1 && <span>/</span>}
        </Fragment>
      ))}
    </div>
  );
}

type Field = {
  key: string;
  type: "header" | "queryParam" | "body" | "pathParam";
  required: boolean;
  description: string;
  defaultValue?: string;
  dataType: "string" | "number" | "boolean" | "json";
};

const FIELD_TYPE_ORDER: Record<Field["type"], number> = {
  header: 0,
  pathParam: 1,
  queryParam: 2,
  body: 3,
};

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.dataType === "json") {
    return (
      <textarea
        className="textarea textarea-sm w-full"
        placeholder={"Value"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <input
      type="text"
      className="input input-sm w-full"
      placeholder={"Value"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function fieldKey(field: Field) {
  return `${field.type}-${field.key}`;
}

function Response({ text }: { text: string }) {
  const isJson = useMemo(() => {
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  }, [text]);

  if (isJson) {
    return (
      <pre className="mt-0">{JSON.stringify(JSON.parse(text), null, 2)}</pre>
    );
  }

  return <div>{text}</div>;
}

function castValue(value: string, dataType: Field["dataType"]) {
  if (dataType === "string") {
    return value;
  }
  if (dataType === "number") {
    return parseFloat(value);
  }
  if (dataType === "boolean") {
    return value === "true";
  }
  if (dataType === "json") {
    return JSON.parse(value);
  }
  return value;
}

export function RichAPIPlayground({
  url,
  method,
  fields = [],
}: {
  url?: string;
  method?: string;
  fields?: Field[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [values, setValues] = useState<Record<string, string | undefined>>(
    fields?.reduce(
      (acc, field) => {
        acc[fieldKey(field)] = field.defaultValue ?? undefined;
        return acc;
      },
      {} as Record<string, string | undefined>
    )
  );
  const [state, setState] = useState<"idle" | "loading">("idle");
  const [response, setResponse] = useState<{
    text: string;
    responseHeaders: Record<string, string>;
    status: number;
  }>();

  const canSend = useMemo(() => {
    const full = fields?.every(
      (field) => !field.required || values[fieldKey(field)] !== undefined
    );
    if (!full) return false;
    for (const field of fields) {
      if (field.dataType === "json") {
        try {
          JSON.parse(values[fieldKey(field)]!);
        } catch {
          return false;
        }
      }
      if (field.dataType === "number") {
        try {
          parseFloat(values[fieldKey(field)]!);
        } catch {
          return false;
        }
      }
      if (field.dataType === "boolean") {
        if (!["true", "false"].includes(values[fieldKey(field)]!)) {
          return false;
        }
      }
    }
    return true;
  }, [fields, values]);

  async function handleSend() {
    let filledUrl = url;
    const queryParams: Record<string, string> = {};
    const headers: Record<string, string> = {};
    const body: Record<string, string> = {};

    for (const field of fields) {
      const value = castValue(values[fieldKey(field)]!, field.dataType);
      if (field.type === "pathParam") {
        filledUrl = filledUrl?.replace(`{${field.key}}`, value);
      } else if (field.type === "queryParam") {
        queryParams[field.key] = value;
      } else if (field.type === "header") {
        headers[field.key] = value;
      } else if (field.type === "body") {
        body[field.key] = value;
      }
    }

    setState("loading");
    fetch("/api-playground", {
      method: "POST",
      body: JSON.stringify({
        base64: btoa(
          JSON.stringify({
            url: filledUrl,
            method,
            headers,
            queryParams: new URLSearchParams(queryParams).toString(),
            body,
          })
        ),
      }),
    })
      .then(async (response) => {
        const data = await response.json();
        setResponse(data);
        setState("idle");
      })
      .catch((error) => {
        setState("idle");
        console.error(error);
      });
  }

  function handleReset() {
    setResponse(undefined);
    setState("idle");
    setValues(
      fields.reduce(
        (acc, field) => {
          acc[fieldKey(field)] = field.defaultValue ?? undefined;
          return acc;
        },
        {} as Record<string, string | undefined>
      )
    );
  }

  return (
    <div className={cn("shadow-xs border border-base-300 rounded-box")}>
      <div
        className={cn(
          "flex justify-between md:items-center gap-2",
          "p-2 flex-col md:flex-row"
        )}
      >
        <div className="flex items-center gap-2">
          <div className={cn("badge badge-primary badge-soft")}>
            {method?.toUpperCase()}
          </div>
          {url && <RichURL url={url} />}
        </div>

        {!expanded && (
          <button
            className="btn btn-primary btn-sm btn-soft"
            onClick={() => setExpanded((e) => !e)}
          >
            Try it <TbChevronRight />
          </button>
        )}
        {expanded && !response && (
          <div className="flex items-center gap-2">
            <button
              className="btn btn-sm btn-square"
              onClick={() => setExpanded((e) => !e)}
            >
              <TbChevronUp />
            </button>
            <button
              className="btn btn-sm btn-primary"
              disabled={!canSend || state === "loading"}
              onClick={handleSend}
            >
              {state === "loading" && (
                <span className="loading loading-spinner loading-xs" />
              )}
              Send
              <TbSend />
            </button>
          </div>
        )}
        {expanded && response && (
          <button className="btn btn-sm" onClick={handleReset}>
            Clear
            <TbX />
          </button>
        )}
      </div>

      {expanded && !response && (
        <div className={cn("p-2 border-t border-base-300")}>
          <ul className="list-none flex flex-col gap-2 p-0">
            {[...fields]
              .sort(
                (a, b) => FIELD_TYPE_ORDER[a.type] - FIELD_TYPE_ORDER[b.type]
              )
              .map((field) => (
                <li
                  key={field.key}
                  className="flex flex-col md:flex-row gap-4 m-0! p-0!"
                >
                  <div className="max-w-[260px] w-full">
                    <div className="flex items-center gap-2">
                      <span>{field.key}</span>
                      {field.required && <span className="text-error">*</span>}
                      <span className="badge badge-xs badge-soft">
                        {field.type}/{field.dataType}
                      </span>
                    </div>
                    <div className="text-xs text-base-content/50">
                      {field.description}
                    </div>
                  </div>
                  <div className="flex-1">
                    <FieldInput
                      field={field}
                      value={values[fieldKey(field)] ?? ""}
                      onChange={(value) =>
                        setValues((prev) => ({
                          ...prev,
                          [fieldKey(field)]: value,
                        }))
                      }
                    />
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}

      {expanded && response && (
        <div className={cn("p-2 border-t border-base-300")}>
          <div className="flex items-center gap-2">
            <span className="font-medium">Status</span>
            <span className="badge badge-sm badge-soft">{response.status}</span>
          </div>

          <Response text={response.text} />
        </div>
      )}
    </div>
  );
}
