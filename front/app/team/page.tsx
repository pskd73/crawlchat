import {
  Badge,
  Dialog,
  Group,
  IconButton,
  Input,
  Portal,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import {
  TbCheck,
  TbCrown,
  TbLogout2,
  TbPlus,
  TbShield,
  TbTrash,
  TbUser,
  TbUsers,
} from "react-icons/tb";
import { Page } from "~/components/page";
import type { Route } from "./+types/page";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import { prisma, type ScrapeUser } from "libs/prisma";
import { redirect, useFetcher } from "react-router";
import { useEffect, useState } from "react";
import { toaster } from "~/components/ui/toaster";
import { Button } from "~/components/ui/button";
import { sendInvitationEmail, sendTeamJoinEmail } from "~/email";
import { getLimits } from "libs/user-plan";

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
    const uniqueMembers = new Set(
      owner!.scrapes.flatMap((scrape) =>
        scrape.scrapeUsers.map((user) => user.email)
      )
    );
    const limits = await getLimits(owner!);
    if (uniqueMembers.size >= limits.teamMembers) {
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
      <Badge variant={"subtle"} colorPalette={"brand"}>
        <TbCrown />
        OWNER
      </Badge>
    );
  }
  if (role === "admin") {
    return (
      <Badge variant={"subtle"} colorPalette={"brand"}>
        <TbShield />
        ADMIN
      </Badge>
    );
  }
  return (
    <Badge variant={"subtle"}>
      <TbUser />
      {role.toUpperCase()}
    </Badge>
  );
}

function DeleteUser({
  scrapeUser,
  disabled,
}: {
  scrapeUser: ScrapeUser;
  disabled: boolean;
}) {
  const fetcher = useFetcher();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!fetcher.data) return;

    if (fetcher.data?.error) {
      toaster.error({
        title: "Error",
        description: fetcher.data.error,
      });
    }

    if (fetcher.data.success) {
      setOpen(false);
      toaster.success({
        title: "Success",
        description: "Deleted the user",
      });
    }
  }, [fetcher.data]);

  return (
    <Dialog.Root open={open} onOpenChange={(details) => setOpen(details.open)}>
      <Dialog.Trigger asChild>
        <IconButton variant={"subtle"} size={"sm"}>
          <TbTrash />
        </IconButton>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="delete" />
              <input type="hidden" name="scrapeUserId" value={scrapeUser.id} />
              <Dialog.Header>
                <Dialog.Title>Delete team member</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap={4}>
                  <p>
                    Are you sure you want to delete{" "}
                    <Text as={"span"} fontWeight={"bold"}>
                      {scrapeUser.email}
                    </Text>
                    ?
                  </p>
                </Stack>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger
                  asChild
                  disabled={fetcher.state !== "idle"}
                >
                  <Button variant="outline">Cancel</Button>
                </Dialog.ActionTrigger>
                <Button
                  type="submit"
                  loading={fetcher.state !== "idle"}
                  colorPalette={"red"}
                >
                  Delete
                  <TbTrash />
                </Button>
              </Dialog.Footer>
            </fetcher.Form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function Invite() {
  const fetcher = useFetcher();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!fetcher.data) return;

    if (fetcher.data?.error) {
      toaster.error({
        title: "Error",
        description: fetcher.data.error,
      });
    } else {
      setOpen(false);
      toaster.success({
        title: "Success",
        description: "Invited the user",
      });
    }
  }, [fetcher.data]);

  return (
    <Dialog.Root open={open} onOpenChange={(details) => setOpen(details.open)}>
      <Dialog.Trigger asChild>
        <Button variant={"subtle"}>
          Invite
          <TbPlus />
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="invite" />
              <Dialog.Header>
                <Dialog.Title>Invite team member</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap={4}>
                  <p>
                    Give your team members email. They will be notified via
                    email if they have not signed up yet.
                  </p>
                  <Input
                    placeholder="team-member@example.com"
                    name="email"
                    required
                  />
                </Stack>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger
                  asChild
                  disabled={fetcher.state !== "idle"}
                >
                  <Button variant="outline">Cancel</Button>
                </Dialog.ActionTrigger>
                <Button type="submit" loading={fetcher.state !== "idle"}>
                  Invite
                  <TbCheck />
                </Button>
              </Dialog.Footer>
            </fetcher.Form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function Leave({ scrapeTitle }: { scrapeTitle: string }) {
  const fetcher = useFetcher();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!fetcher.data) return;

    setOpen(false);
    if (fetcher.data?.error) {
      toaster.error({
        title: "Error",
        description: fetcher.data.error,
      });
    } else {
      toaster.success({
        title: "Success",
        description: "You are removed from the team",
      });
    }
  }, [fetcher.data]);

  return (
    <Dialog.Root open={open} onOpenChange={(details) => setOpen(details.open)}>
      <Dialog.Trigger asChild>
        <Button variant={"subtle"} colorPalette={"red"}>
          Leave
          <TbLogout2 />
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="leave" />
              <Dialog.Header>
                <Dialog.Title>Leave team</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap={4}>
                  <p>
                    Are you sure you want to leave the{" "}
                    <Text as={"span"} fontWeight={"bold"}>
                      {scrapeTitle}
                    </Text>
                    ?
                  </p>
                </Stack>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger
                  asChild
                  disabled={fetcher.state !== "idle"}
                >
                  <Button variant="outline">Cancel</Button>
                </Dialog.ActionTrigger>
                <Button
                  type="submit"
                  loading={fetcher.state !== "idle"}
                  colorPalette={"red"}
                >
                  Leave
                  <TbCheck />
                </Button>
              </Dialog.Footer>
            </fetcher.Form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

export default function TeamPage({ loaderData }: Route.ComponentProps) {
  const canDeleteUser = ["owner", "admin"].includes(loaderData.scrapeUser.role);

  return (
    <Page
      title="Team"
      icon={<TbUsers />}
      right={
        <Group>
          <Invite />
          <Leave scrapeTitle={loaderData.scrape!.title ?? "Team"} />
        </Group>
      }
    >
      <Stack gap={4}>
        <Text opacity={0.5}>
          Invite your team members and manage their access.
        </Text>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Email</Table.ColumnHeader>
              <Table.ColumnHeader>Role</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">
                Date added
              </Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {loaderData.scrapeUsers.map((scrapeUser) => (
              <Table.Row key={scrapeUser.id}>
                <Table.Cell>
                  {scrapeUser.email}
                  {scrapeUser.invited && (
                    <Text opacity={0.5} as={"span"} ml={2}>
                      [Invited]
                    </Text>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <RoleBadge role={scrapeUser.role} />
                </Table.Cell>
                <Table.Cell textAlign="end">
                  {scrapeUser.createdAt.toLocaleDateString()}
                </Table.Cell>
                <Table.Cell textAlign="end">
                  {scrapeUser.role !== "owner" && (
                    <DeleteUser
                      scrapeUser={scrapeUser}
                      disabled={!canDeleteUser}
                    />
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Stack>
    </Page>
  );
}
