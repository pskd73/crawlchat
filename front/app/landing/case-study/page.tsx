import cn from "@meltdownjs/cn";
import { useMemo, type PropsWithChildren } from "react";
import {
  TbArrowRight,
  TbCalendar,
  TbCheck,
  TbCircleFilled,
  TbX,
} from "react-icons/tb";
import { Link, redirect, useLoaderData } from "react-router";
import { makeMeta } from "~/meta";
import { ChannelCard, Container, SourceCard } from "../page";
import type { Route } from "./+types/page";
import { companies } from "./companies";

export function loader({ params: { slug } }: Route.LoaderArgs) {
  const company = companies[slug as keyof typeof companies];

  if (!company) {
    throw redirect(`/`);
  }

  return { slug, title: company.title, description: company.description };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return makeMeta({
    title: `${loaderData.title} - Case Study - CrawlChat`,
    description: loaderData.description,
  });
}

function Heading({ children }: PropsWithChildren) {
  return (
    <h3
      className={cn(
        "text-xl font-medium text-base-content/50",
        "mb-2 font-brand"
      )}
    >
      {children}
    </h3>
  );
}

export default function CaseStudyLayout() {
  const { slug } = useLoaderData<typeof loader>();
  const company = useMemo(
    () => companies[slug as keyof typeof companies],
    [slug]
  );

  return (
    <Container>
      <div className="flex flex-col md:flex-row gap-20 py-12">
        <div className="w-full md:w-[240px] shrink-0">
          <div className="sticky top-24">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-center md:justify-start">
                <div className="badge badge-secondary badge-soft">
                  <TbCircleFilled size={12} />
                  Case Study
                </div>
              </div>

              <div
                className={cn(
                  "w-full h-auto my-4",
                  "flex justify-center items-center gap-2",
                  company.darkLogo && "bg-black p-4 rounded-box"
                )}
              >
                <img
                  src={company.logo}
                  alt={company.title}
                  className="max-h-[50px]"
                />
                {company.logoLabel && (
                  <p className="text-4xl font-medium">{company.logoLabel}</p>
                )}
              </div>

              <div className="bg-base-200 border border-base-300 rounded-box">
                {company.testimonial}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <Heading>Overview</Heading>
          <div className="mb-6">{company.overview}</div>

          <Heading>Challenges</Heading>
          <p className="mb-2">{company.challengesSummary}</p>
          <p className="mb-4">
            Key challenges faced by {company.title} about making their
            documentation more accessible:
          </p>

          <ul className="pl-4 my-4 flex flex-col gap-2">
            {company.challenges.map((challenge, i) => (
              <li key={i} className="flex items-start gap-2">
                <TbX size={24} className="text-red-500 shrink-0" />
                {challenge}
              </li>
            ))}
          </ul>

          <Heading>Sources</Heading>
          <p className="mb-2">
            {company.title} uses the following sources to build their knowledge
            base:
          </p>
          <div className="flex gap-4 mb-4 flex-wrap">
            {company.sources.map((source, i) => (
              <SourceCard
                key={i}
                icon={source.icon}
                title={source.title}
                tooltip={source.tooltip}
              />
            ))}
          </div>

          <Heading>Channels</Heading>
          <p className="mb-2">
            {company.title} integrates the CrawlChat chatbot into the following
            channels:
          </p>
          <div className="flex gap-4 mb-4 flex-wrap">
            {company.channels.map((channel, i) => (
              <ChannelCard
                key={i}
                icon={channel.icon}
                title={channel.title}
                tooltip={channel.tooltip}
              />
            ))}
          </div>

          <Heading>Results</Heading>
          <p className="mb-2">{company.resultsSummary}</p>
          <ul className="pl-4 my-4 flex flex-col gap-2 mb-12">
            {company.results.map((result, i) => (
              <li key={i} className="flex items-start gap-2">
                <TbCheck size={24} className="text-green-500 shrink-0" />
                {result}
              </li>
            ))}
          </ul>

          <div
            className={cn(
              "open-source-bg border border-primary/20 shadow",
              "p-4 rounded-box flex flex-col gap-2"
            )}
          >
            <h3 className={cn("text-2xl font-medium font-brand text-primary")}>
              Apply the same approach to your company!
            </h3>
            <p>
              CrawlChat is a powerful tool that can help you improve the
              accessibility of your documentation and your community.
            </p>
            <p className="flex flex-col md:flex-row gap-4">
              <Link to="/pricing" className="btn btn-primary btn-lg">
                Start free trial
                <TbArrowRight />
              </Link>
              <a
                href="https://cal.com/crawlchat/demo"
                target="_blank"
                className="btn btn-primary btn-outline btn-lg"
              >
                Book a demo
                <TbCalendar />
              </a>
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
}
