import type { Route } from "./+types/page";
import {
  TbCheck,
  TbCrown,
  TbLogout2,
  TbShield,
  TbTrash,
  TbUser,
  TbUserPlus,
  TbUsers,
  TbUserX,
} from "react-icons/tb";
import { Page } from "~/components/page";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import { prisma, type ScrapeUser } from "libs/prisma";
import { redirect, useFetcher } from "react-router";
import { useEffect, useState } from "react";
import { sendInvitationEmail, sendTeamJoinEmail } from "~/email";
import { getLimits } from "libs/user-plan";
import { hideModal, showModal } from "~/components/daisy-utils";
import toast from "react-hot-toast";
import cn from "@meltdownjs/cn";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  const scrapeUser = authoriseScrapeUser(user!.scrapeUsers, scrapeId);
  const scrape = await prisma.scrape.findUnique({
    where: {
      id: scrapeId,
    },
  });

  const scrapeUsers = await prisma.scrapeUser.findMany({
    where: {
      scrapeId,
    },
    include: {
      user: true,
    },
  });

  return { user, scrapeUsers, scrapeUser, scrape };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  const scrapeUser = authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "invite") {
    const scrape = await prisma.scrape.findUnique({
      where: {
        id: scrapeId,
      },
    });

    const owner = await prisma.user.findFirst({
      where: {
        id: scrape!.userId,
      },
      include: {
        scrapes: {
          include: {
            scrapeUsers: true,
          },
        },
      },
    });
    let existingMembers = 0;
    const scrapes = await prisma.scrape.findMany({
      where: {
        userId: owner!.id,
      },
    });

    for (const scrape of scrapes) {
      existingMembers += await prisma.scrapeUser.count({
        where: {
          scrapeId: scrape.id,
          role: {
            not: "owner",
          },
        },
      });
    }

    const limits = await getLimits(owner!);
    if (existingMembers >= limits.teamMembers) {
      return Response.json(
        { error: "You have reached the maximum number of team members" },
        { status: 400 }
      );
    }

    let email = formData.get("email") as string;

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    email = email.toLowerCase();

    const invitingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!invitingUser) {
      await prisma.scrapeUser.create({
        data: {
          scrapeId,
          role: "member",
          email,
          invited: true,
        },
      });

      await sendInvitationEmail(
        email,
        user!.email,
        scrape!.title ?? "CrawlChat"
      );
      return Response.json({ success: true });
    }

    await prisma.scrapeUser.create({
      data: {
        scrapeId,
        userId: invitingUser.id,
        role: "member",
        email: invitingUser.email,
      },
    });

    await sendTeamJoinEmail(
      invitingUser.email,
      user!.email,
      scrape!.title ?? "CrawlChat"
    );

    return Response.json({ success: true });
  }

  if (intent === "delete") {
    authoriseScrapeUser(user!.scrapeUsers, scrapeId, ["owner", "admin"]);

    const deletingScrapeUser = await prisma.scrapeUser.findUnique({
      where: {
        id: formData.get("scrapeUserId") as string,
      },
    });

    if (deletingScrapeUser!.role === "owner") {
      return Response.json({ error: "Cannot delete owner" }, { status: 400 });
    }

    const scrapeUserId = formData.get("scrapeUserId");
    await prisma.scrapeUser.delete({
      where: { id: scrapeUserId as string },
    });

    return Response.json({ success: true });
  }

  if (intent === "leave") {
    const members = await prisma.scrapeUser.count({
      where: {
        scrapeId,
      },
    });

    if (members === 1) {
      return Response.json({ error: "Not enough members" }, { status: 400 });
    }

    if (scrapeUser.role === "owner") {
      return Response.json(
        { error: "Owner cannot leave the team" },
        { status: 400 }
      );
    }

    await prisma.scrapeUser.delete({
      where: { id: scrapeUser.id },
    });

    throw redirect("/app");
  }
}

function RoleBadge({ role }: { role: string }) {
  if (role === "owner") {
    return (
      <span className="badge badge-primary">
        <TbCrown />
        OWNER
      </span>
    );
  }
  if (role === "admin") {
    return (
      <span className="badge badge-neutral">
        <TbShield />
        ADMIN
      </span>
    );
  }
  return (
    <span className="badge">
      <TbUser />
      {role.toUpperCase()}
    </span>
  );
}

function DeleteUser({
  scrapeUser,
  onClose,
}: {
  scrapeUser?: ScrapeUser;
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
      toast.success("Deleted the user");
    }
  }, [fetcher.data]);

  return (
    <dialog id="delete-modal" className="modal">
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="delete" />
        <input type="hidden" name="scrapeUserId" value={scrapeUser?.id} />
        <div className="modal-box">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <TbUserX />
            Confirm
          </h3>
          <p className="py-4">
            Are you sure you want to delete{" "}
            <span className="font-bold">{scrapeUser?.email}</span>?
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

function Invite() {
  const fetcher = useFetcher();

  useEffect(() => {
    if (!fetcher.data) return;

    hideModal("invite-modal");
    if (fetcher.data?.error) {
      toast.error(fetcher.data.error);
    } else {
      toast.success("Invited the user");
    }
  }, [fetcher.data]);

  return (
    <dialog id="invite-modal" className="modal">
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="invite" />
        <div className="modal-box">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <TbUserPlus />
            Invite team member
          </h3>
          <div className="py-4 flex flex-col gap-2">
            <p>
              Give your team members email. They will be notified via email if
              they have not signed up yet.
            </p>
            <input
              className="input w-full"
              placeholder="Ex: team-member@example.com"
              name="email"
              required
            />
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
              Invite
              <TbCheck />
            </button>
          </div>
        </div>
      </fetcher.Form>
    </dialog>
  );
}

function Leave({ scrapeTitle }: { scrapeTitle: string }) {
  const fetcher = useFetcher();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!fetcher.data) return;

    setOpen(false);
    if (fetcher.data?.error) {
      toast.error(fetcher.data.error);
    } else {
      toast.success("You are removed from the team");
    }
  }, [fetcher.data]);

  return (
    <dialog id="leave-modal" className="modal">
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="leave" />
        <div className="modal-box">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <TbLogout2 />
            Leave team
          </h3>
          <p className="py-4">
            Are you sure you want to leave the{" "}
            <span className="font-bold">{scrapeTitle}</span>?
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
              Leave
            </button>
          </div>
        </div>
      </fetcher.Form>
    </dialog>
  );
}

export default function TeamPage({ loaderData }: Route.ComponentProps) {
  const [deleteScrapeUser, setDeleteScrapeUser] = useState<ScrapeUser>();
  const canRemove = ["owner", "admin"].includes(loaderData.scrapeUser.role);
  const canLeave = loaderData.scrapeUser.role !== "owner";

  useEffect(() => {
    if (deleteScrapeUser) {
      showModal("delete-modal");
    } else {
      hideModal("delete-modal");
    }
  }, [deleteScrapeUser]);

  return (
    <Page
      title="Team"
      icon={<TbUsers />}
      right={
        <>
          <button
            className="btn btn-primary btn-soft"
            onClick={() => {
              showModal("invite-modal");
            }}
          >
            <TbUserPlus />
            Invite
          </button>
          {canLeave && (
            <button
              className="btn btn-error btn-soft"
              onClick={() => {
                showModal("leave-modal");
              }}
            >
              <TbLogout2 />
              Leave
            </button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-base-content/50">
          Invite your team members and manage their access.
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
                <th>Email</th>
                <th>Role</th>
                <th className="text-right">Added date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loaderData.scrapeUsers.map((scrapeUser) => (
                <tr key={scrapeUser.id}>
                  <td>
                    {scrapeUser.email}
                    {scrapeUser.invited && (
                      <span className="ml-2 text-base-content/50">
                        [Invited]
                      </span>
                    )}
                  </td>
                  <td>
                    <RoleBadge role={scrapeUser.role} />
                  </td>
                  <td className="text-right">
                    {scrapeUser.createdAt.toLocaleDateString()}
                  </td>
                  <td className="text-right">
                    <button
                      className="btn btn-square btn-error btn-sm"
                      disabled={scrapeUser.role === "owner" || !canRemove}
                      onClick={() => {
                        setDeleteScrapeUser(scrapeUser);
                      }}
                    >
                      <TbTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Invite />
      <DeleteUser
        scrapeUser={deleteScrapeUser}
        onClose={() => setDeleteScrapeUser(undefined)}
      />
      <Leave scrapeTitle={loaderData.scrape!.title ?? "Team"} />
    </Page>
  );
}
