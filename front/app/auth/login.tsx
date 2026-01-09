import type { Route } from "./+types/login";
import { redirect, useFetcher, useLoaderData } from "react-router";
import { authenticator } from ".";
import { commitSession, getSession } from "~/session";
import { useEffect, useMemo, useRef, useState } from "react";
import { TbArrowRight, TbCircleCheck, TbCircleX } from "react-icons/tb";
import { getAuthUser } from "./middleware";
import { Logo } from "~/components/logo";
import { makeMeta } from "~/meta";
import {
  AntonTestimonial,
  EgelhausTestimonial,
  JonnyTestimonial,
  MauritsTestimonial,
} from "~/landing/page";
import cn from "@meltdownjs/cn";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request, { dontRedirect: true });

  if (user) {
    return redirect("/app");
  }

  const session = await getSession(request.headers.get("cookie"));
  const searchParams = new URL(request.url).searchParams;

  return {
    mailSent: !!searchParams.has("mail-sent"),
    error: session.get("error"),
  };
}

export function meta() {
  return makeMeta({
    title: "Login - CrawlChat",
  });
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
  const { mailSent, error } = useLoaderData();
  const emailRef = useRef<HTMLInputElement>(null);
  const testiIndex = useMemo(() => Math.floor(Math.random() * 4), []);

  useEffect(() => {
    if (mailSent && emailRef.current) {
      emailRef.current.value = "";
    }
  }, [mailSent]);

  return (
    <div
      data-theme="brand"
      className="flex h-screen w-screen gap-2 items-stretch"
    >
      <div
        className={cn(
          "flex-col items-center justify-center bg-base-200 flex-1",
          "hidden md:flex px-4 gap-0 relative",
          "border-r border-base-300"
        )}
      >
        <div className="text-2xl font-bold text-center py-4">
          People love <span className="font-radio-grotesk">CrawlChat</span> ❤️
        </div>
        <div className="max-w-500px overflow-y-auto no-scrollbar pb-4 max-w-96">
          {testiIndex === 0 && <JonnyTestimonial />}
          {testiIndex === 1 && <AntonTestimonial />}
          {testiIndex === 2 && <MauritsTestimonial />}
          {testiIndex === 3 && <EgelhausTestimonial />}
        </div>
      </div>
      <div className="flex flex-col flex-1 gap-2 h-full justify-center items-center">
        <fetcher.Form method="post">
          <div
            className={cn(
              "flex flex-col w-82 gap-4 items-center border",
              "border-base-300 rounded-box p-6 bg-base-200 shadow"
            )}
          >
            <Logo />

            <div className="flex flex-col gap-4 w-full">
              <div className="text-center text-base-content/50 text-sm">
                Enter your email to get the login link
              </div>

              <input
                className="input w-full"
                ref={emailRef}
                type="email"
                placeholder="myemail@example.com"
                name="email"
                required
                pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
              />

              {mailSent && (
                <div role="alert" className="alert alert-success">
                  <TbCircleCheck />
                  <span>Check your email for a login link.</span>
                </div>
              )}

              {(error || fetcher.data?.error) && (
                <div role="alert" className="alert alert-error">
                  <TbCircleX />
                  <span>{error || fetcher.data?.error}</span>
                </div>
              )}

              <button
                className="btn btn-primary w-full"
                type="submit"
                disabled={fetcher.state !== "idle"}
              >
                {fetcher.state !== "idle" && (
                  <span className="loading loading-spinner loading-xs" />
                )}
                Login
                <TbArrowRight />
              </button>
            </div>

            <div className="divider m-0">OR</div>

            <a
              href="/auth/google"
              className="btn bg-white text-black border-[#e5e5e5] w-full"
            >
              <svg
                aria-label="Google logo"
                width="16"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
              >
                <g>
                  <path d="m0 0H512V512H0" fill="#fff"></path>
                  <path
                    fill="#34a853"
                    d="M153 292c30 82 118 95 171 60h62v48A192 192 0 0190 341"
                  ></path>
                  <path
                    fill="#4285f4"
                    d="m386 400a140 175 0 0053-179H260v74h102q-7 37-38 57"
                  ></path>
                  <path
                    fill="#fbbc02"
                    d="m90 341a208 200 0 010-171l63 49q-12 37 0 73"
                  ></path>
                  <path
                    fill="#ea4335"
                    d="m153 219c22-69 116-109 179-50l55-54c-78-75-230-72-297 55"
                  ></path>
                </g>
              </svg>
              Login with Google
            </a>

            <p className="text-center text-base-content/50 text-xs">
              You will be asked to start the free trial once logged in if you
              haven't already.
            </p>
          </div>
        </fetcher.Form>
      </div>
    </div>
  );
}
