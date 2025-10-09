import type { Route } from "./+types/page";
import {
  TbKey,
  TbPlus,
  TbCopy,
  TbTrash,
  TbEye,
  TbEyeOff,
} from "react-icons/tb";
import { Page } from "~/components/page";
import { EmptyState } from "~/components/empty-state";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import { prisma } from "libs/prisma";
import { useFetcher } from "react-router";
import { useEffect, useState } from "react";
import { hideModal, showModal } from "~/components/daisy-utils";
import toast from "react-hot-toast";
import cn from "@meltdownjs/cn";
import moment from "moment";
import { makeMeta } from "~/meta";

function maskApiKey(apiKey: string) {
  if (apiKey.length <= 4) {
    return apiKey;
  }
  return apiKey.substring(0, 4) + "•".repeat(apiKey.length - 4);
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const apiKeys = await prisma.apiKey.findMany({
    where: {
      scrapeId,
    },
  });

  return { user, apiKeys };
}

export function meta() {
  return makeMeta({
    title: "API Keys",
    description:
      "Manage your API keys to access your collection programmatically.",
  });
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    // Check current API key count
    const currentCount = await prisma.apiKey.count({
      where: { scrapeId },
    });

    if (currentCount >= 10) {
      return Response.json(
        {
          error: "Maximum of 10 API keys allowed per scrape",
        },
        { status: 400 }
      );
    }

    const title = formData.get("title") as string;
    const key = crypto.randomUUID();
    await prisma.apiKey.create({
      data: {
        scrapeId,
        userId: user!.id,
        key,
        title,
      },
    });
    return Response.json({
      success: true,
      message: "API key created successfully",
    });
  }

  if (intent === "delete") {
    const id = formData.get("id");
    await prisma.apiKey.delete({
      where: { id: id as string },
    });
    return Response.json({
      success: true,
      message: "API key deleted successfully",
    });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}

function CreateApiKeyModal() {
  const fetcher = useFetcher();
  const [name, setName] = useState("");

  useEffect(() => {
    if (!fetcher.data) return;

    hideModal("create-api-key-modal");
    if (fetcher.data?.error) {
      toast.error(fetcher.data.error);
    } else {
      toast.success(fetcher.data.message);
      setName("");
    }
  }, [fetcher.data]);

  return (
    <dialog id="create-api-key-modal" className="modal">
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="create" />
        <div className="modal-box">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <TbKey />
            Create API Key
          </h3>
          <div className="py-4 flex flex-col gap-2">
            <p>
              Create a new API key to access your collection programmatically.
            </p>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Key name</legend>
              <input
                className="input w-full"
                placeholder="Ex: My App Integration"
                name="title"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </fieldset>
          </div>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={fetcher.state !== "idle"}
            >
              {fetcher.state !== "idle" && (
                <span className="loading loading-spinner" />
              )}
              Create
              <TbPlus />
            </button>
          </div>
        </div>
      </fetcher.Form>
    </dialog>
  );
}

function DeleteApiKey({
  apiKey,
  onClose,
}: {
  apiKey?: any;
  onClose: () => void;
}) {
  const fetcher = useFetcher();

  useEffect(() => {
    if (!fetcher.data) return;

    onClose();
    if (fetcher.data?.error) {
      toast.error(fetcher.data.error);
    }

    if (fetcher.data.success) {
      toast.success("API key deleted successfully");
    }
  }, [fetcher.data]);

  return (
    <dialog id="delete-api-key-modal" className="modal">
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="delete" />
        <input type="hidden" name="id" value={apiKey?.id} />
        <div className="modal-box">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <TbTrash />
            Confirm
          </h3>
          <p className="py-4">
            Are you sure you want to delete the API key{" "}
            <span className="font-bold">{apiKey?.title || "Untitled"}</span>?
            This action cannot be undone.
          </p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
            <button
              className="btn btn-error"
              type="submit"
              disabled={fetcher.state !== "idle"}
            >
              {fetcher.state !== "idle" && (
                <span className="loading loading-spinner" />
              )}
              Delete
              <TbTrash />
            </button>
          </div>
        </div>
      </fetcher.Form>
    </dialog>
  );
}

function ApiKeyRow({
  apiKey,
  onDelete,
}: {
  apiKey: any;
  onDelete: (apiKey: any) => void;
}) {
  const [showKey, setShowKey] = useState(false);

  const handleCopy = () => {
    if (apiKey.key) {
      navigator.clipboard.writeText(apiKey.key);
      toast.success("API key copied to clipboard");
    }
  };

  const handleDelete = () => {
    onDelete(apiKey);
  };

  return (
    <tr>
      <td>
        <div className="flex items-center gap-2">
          <TbKey className="text-base-content/50" />
          <span className="font-medium">{apiKey.title || "Untitled"}</span>
        </div>
      </td>
      <td>
        <div className="flex items-center gap-2">
          {showKey ? (
            <code className="bg-base-200 px-2 py-1 rounded text-sm">
              {apiKey.key || "sk-..."}
            </code>
          ) : (
            <code className="bg-base-200 px-2 py-1 rounded text-sm">
              {maskApiKey(apiKey.key)}
            </code>
          )}
          <button
            className="btn btn-sm btn-square"
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? <TbEyeOff /> : <TbEye />}
          </button>
          <button className="btn btn-sm btn-square" onClick={handleCopy}>
            <TbCopy />
          </button>
        </div>
      </td>
      <td>
        <span className="badge badge-soft badge-primary">Active</span>
      </td>
      <td className="text-right">{moment(apiKey.createdAt).fromNow()}</td>
      <td className="text-right">
        <button
          className="btn btn-square btn-error btn-sm btn-soft"
          onClick={handleDelete}
        >
          <TbTrash />
        </button>
      </td>
    </tr>
  );
}

export default function ApiKeyPage({ loaderData }: Route.ComponentProps) {
  const [deleteApiKey, setDeleteApiKey] = useState<any>();

  useEffect(() => {
    if (deleteApiKey) {
      showModal("delete-api-key-modal");
    } else {
      hideModal("delete-api-key-modal");
    }
  }, [deleteApiKey]);

  return (
    <Page
      title="API Keys"
      icon={<TbKey />}
      right={
        <button
          className="btn btn-primary btn-soft"
          onClick={() => showModal("create-api-key-modal")}
        >
          <TbPlus />
          Create Key
        </button>
      }
    >
      {loaderData.apiKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1">
          <EmptyState
            title="No API keys"
            description="Create your first API key to access your collection programmatically."
            icon={<TbKey />}
          >
            <button
              className="btn btn-primary"
              onClick={() => showModal("create-api-key-modal")}
            >
              <TbPlus />
              Create API Key
            </button>
          </EmptyState>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-base-content/50">
            Manage your API keys to access your collection programmatically.
            Read more about the API{" "}
            <a
              href="https://docs.crawlchat.app/api"
              target="_blank"
              rel="noopener noreferrer"
            >
              here
            </a>
            .
          </p>
          <div
            className={cn(
              "overflow-x-auto border border-base-300",
              "rounded-box bg-base-200/50 shadow"
            )}
          >
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Key</th>
                  <th>Status</th>
                  <th className="text-right">Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loaderData.apiKeys.map((apiKey) => (
                  <ApiKeyRow
                    key={apiKey.id}
                    apiKey={apiKey}
                    onDelete={setDeleteApiKey}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateApiKeyModal />
      <DeleteApiKey
        apiKey={deleteApiKey}
        onClose={() => setDeleteApiKey(undefined)}
      />
    </Page>
  );
}
