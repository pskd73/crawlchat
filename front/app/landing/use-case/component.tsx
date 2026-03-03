import cn from "@meltdownjs/cn";
import type { ReactNode } from "react";
import {
  Badge,
  ChannelCard,
  Heading,
  HeadingDescription,
  SourceCard,
} from "../page";

export function UseCaseHero({
  title,
  description,
}: {
  title: string | ReactNode;
  description: string | ReactNode;
}) {
  return (
    <div className="mt-16">
      <Badge>Use case</Badge>

      <h1
        className={cn(
          "font-brand text-[42px] md:text-[64px] leading-[1.1]",
          "text-center max-w-[800px] mx-auto"
        )}
      >
        {title}
      </h1>

      <p
        className={cn(
          "text-xl mt-6",
          "text-center max-w-[600px] mx-auto text-base-content/50"
        )}
      >
        {description}
      </p>
    </div>
  );
}

export type UseCaseIssueItem = {
  question: string;
  shortAnswer: string;
  answer: string;
  image: string;
  features: {
    icon: ReactNode;
    text: string;
  }[];
};

export function UseCaseIssues({ issues }: { issues: UseCaseIssueItem[] }) {
  return (
    <div className="mt-32 flex flex-col gap-32">
      {issues.map((issue) => (
        <div
          key={issue.question}
          className={cn(
            "flex flex-col md:flex-row gap-16 md:even:flex-row-reverse max-w-[1000px] mx-auto"
          )}
        >
          <div className="flex-4 flex flex-col gap-4">
            <div className="text-base-content/50">{issue.question}</div>
            <h3 className="text-3xl font-medium font-brand">
              {issue.shortAnswer}
            </h3>
            <p>{issue.answer}</p>
            <ul className="flex flex-col gap-4 md:flex-row md:gap-4 flex-wrap">
              {issue.features.map((feature) => (
                <li
                  key={feature.text}
                  className="flex items-center gap-2 text-primary"
                >
                  <div>{feature.icon}</div>
                  {feature.text}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-3">
            <img
              src={issue.image}
              alt={issue.question}
              className="rounded-box"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export type ConnectorChannelItem = {
  icon: ReactNode;
  title: string;
  tooltip: string;
};

export function Connectors({
  connectors,
  title,
  description,
}: {
  connectors: ConnectorChannelItem[];
  title: string | ReactNode;
  description: string | ReactNode;
}) {
  return (
    <div className="mt-32">
      <Heading>{title}</Heading>

      <HeadingDescription>{description}</HeadingDescription>

      <div className="flex gap-4 justify-center flex-wrap">
        {connectors.map((connector) => (
          <SourceCard
            key={connector.title}
            icon={connector.icon}
            title={connector.title}
            tooltip={connector.tooltip}
          />
        ))}
      </div>
    </div>
  );
}

export function Channels({
  channels,
  title,
  description,
}: {
  channels: ConnectorChannelItem[];
  title: string | ReactNode;
  description: string | ReactNode;
}) {
  return (
    <div className="mt-32">
      <Heading>{title}</Heading>

      <HeadingDescription>{description}</HeadingDescription>

      <div className="flex gap-4 justify-center flex-wrap">
        {channels.map((channel) => (
          <ChannelCard
            key={channel.title}
            icon={channel.icon}
            title={channel.title}
            tooltip={channel.tooltip}
          />
        ))}
      </div>
    </div>
  );
}
