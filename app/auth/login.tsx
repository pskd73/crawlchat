import { Center, Flex, Heading, Input, Stack, Text } from "@chakra-ui/react";
import { Link, redirect, useFetcher, useLoaderData } from "react-router";
import { Button } from "~/components/ui/button";
import type { Route } from "../+types/root";
import { authenticator } from ".";
import { commitSession, getSession } from "~/session";
import { Alert } from "~/components/ui/alert";
import { useEffect, useRef } from "react";
import { RiChatVoiceAiFill } from "react-icons/ri";
import { TbArrowRight } from "react-icons/tb";
import { getAuthUser } from "./middleware";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request, { dontRedirect: true });

  if (user) {
    return redirect("/app");
  }

  const searchParams = new URL(request.url).searchParams;

  return { mailSent: !!searchParams.has("mail-sent") };
}

export function meta() {
  return [
    {
      title: "Login - CrawlChat",
    },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const user = await authenticator.authenticate("magic-link", request);

  if (!user) {
    return { error: "Invalid credentials" };
  }

  const session = await getSession(request.headers.get("cookie"));
  session.set("userId", user.id);
  return redirect("/app", {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

export default function LoginPage() {
  const fetcher = useFetcher();
  const { mailSent } = useLoaderData();
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mailSent && emailRef.current) {
      emailRef.current.value = "";
    }
  }, [mailSent]);

  return (
    <Flex h="100dvh" w="100vw" gap={4} alignItems={"center"}>
      <Stack
        bg="brand.fg"
        h="100dvh"
        flex={1}
        display={["none", "none", "flex"]}
        justifyContent={"center"}
        alignItems={"center"}
        gap={16}
        pr={12}
      >
        <Heading
          fontSize={80}
          maxW={"90%"}
          lineHeight={1.2}
          textAlign={"center"}
          fontWeight={"bold"}
          color={"white"}
        >
          Still in doubt? Talk to me!
        </Heading>
      </Stack>
      <Stack flex={1}>
        <Center>
          <fetcher.Form method="post">
            <Stack w="240px" align="center">
              <Text color="brand.fg" fontSize={60}>
                <Link to="/">
                  <RiChatVoiceAiFill />
                </Link>
              </Text>
              <Heading>Login</Heading>
              <Input
                ref={emailRef}
                type="email"
                w="full"
                placeholder="Enter your email"
                name="email"
              />

              {mailSent && (
                <Alert title="Email sent" status={"success"}>
                  Check your email for a login link.
                </Alert>
              )}

              <Button
                type="submit"
                w="full"
                loading={fetcher.state !== "idle"}
                colorPalette={"brand"}
              >
                Login
                <TbArrowRight />
              </Button>
              {fetcher.data?.error && (
                <Alert title="Error" status={"error"}>
                  {fetcher.data.error}
                </Alert>
              )}
            </Stack>
          </fetcher.Form>
        </Center>
      </Stack>
    </Flex>
  );
}
