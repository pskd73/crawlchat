import { Section, Text, Row, Column } from "@react-email/components";
import { emailConfig } from "./config";
import { MailTemplate } from "./template";

function MetricCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <Section
      style={{
        background: "#f3f3f5",
        padding: "20px",
        borderRadius: "10px",
      }}
    >
      <Text style={{ margin: "0px", fontSize: "16px", opacity: 0.5 }}>
        {title}
      </Text>
      <Text
        style={{
          margin: "0px",
          paddingTop: "4px",
          fontSize: "42px",
          fontWeight: "bold",
        }}
      >
        {value}
      </Text>
    </Section>
  );
}

function BandColumn({
  tag,
  value,
  color,
}: {
  tag: string;
  value: string | number;
  color: string;
}) {
  return (
    <Column style={{ backgroundColor: color, padding: "20px" }} align="center">
      <Text
        style={{
          margin: 0,
          fontSize: "22px",
          fontWeight: "bold",
          opacity: 0.6,
        }}
      >
        {value}
      </Text>
      <Text style={{ opacity: 0.5, margin: 0 }}>&lt; {tag}</Text>
    </Column>
  );
}

export default function WeeklyEmail(props: {
  messages: number;
  MCPHits: number;
  performance: {
    0.2: number;
    0.4: number;
    0.6: number;
    0.8: number;
    1.0: number;
  };
}) {
  const messages = props.messages ?? "1.2k";
  const MCPHits = props.MCPHits ?? 532;
  const performance = props.performance ?? {
    0.2: 200,
    0.4: 200,
    0.6: 200,
    0.8: 200,
    1.0: 200,
  };

  return (
    <MailTemplate
      title="CrawlChat Weekly"
      preview="Your weekly update on your conversations and performance!"
      heading="Weekly"
      icon="🗓️"
      text="Thank you for being a part of our community! Here is the weekly updates with the stats for your collection. Keeping up to date with this information will let you make your documentation or content relavent to your customers or community."
      cta={{
        text: "Go to app",
        href: `${emailConfig.baseUrl}/app`,
      }}
    >
      <Row style={{ marginTop: "20px" }}>
        <Column style={{ opacity: 0.2 }}>This week</Column>
      </Row>
      <Row>
        <Column style={{ paddingRight: "10px" }}>
          <MetricCard title="Messages" value={messages} />
        </Column>
        <Column>
          <MetricCard title="MCP & Discord" value={MCPHits} />
        </Column>
      </Row>

      <Row style={{ marginTop: "20px" }}>
        <Column style={{ opacity: 0.2 }}>Poor</Column>
        <Column align="right" style={{ opacity: 0.2 }}>
          Best
        </Column>
      </Row>
      <Row>
        <BandColumn tag="0.2" value={performance[0.2]} color="#f2eaf9" />
        <BandColumn tag="0.4" value={performance[0.4]} color="#e5d5f2" />
        <BandColumn tag="0.6" value={performance[0.6]} color="#d7c0ec" />
        <BandColumn tag="0.8" value={performance[0.8]} color="#caabe5" />
        <BandColumn tag="1.0" value={performance[1.0]} color="#bd96df" />
      </Row>
      <Text
        style={{
          fontSize: "12px",
          margin: "0px",
          textAlign: "center",
          opacity: 0.2,
        }}
      >
        Responses spread across the scores. 0 is the worst, 1 is the best.
      </Text>
    </MailTemplate>
  );
}
