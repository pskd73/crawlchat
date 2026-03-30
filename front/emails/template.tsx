import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { Fragment, type PropsWithChildren } from "react";
import { emailConfig } from "./config";

export function MailTemplate({
  children,
  title,
  preview,
  heading,
  text,
  cta,
  icon,
  brand = "CrawlChat",
  noEmailPreferences = false,
  footerLinks = [],
}: PropsWithChildren<{
  title: string;
  preview: string;
  heading: string;
  text?: string;
  cta?: {
    text: string;
    href: string;
  };
  icon?: string;
  brand?: string;
  noEmailPreferences?: boolean;
  footerLinks?: { label: string; href: string }[];
}>) {
  if (!noEmailPreferences) {
    footerLinks.push({
      label: "Email preference",
      href: `${emailConfig.baseUrl}/profile`,
    });
  }

  return (
    <Html lang="en">
      <Head>
        <title>{title}</title>
        <Preview>{preview}</Preview>
      </Head>
      <Body
        style={{
          margin: "0",
          padding: "30px 10px",
          fontFamily: "Arial, sans-serif",
          backgroundColor: "#f3f3f5",
        }}
      >
        <Container
          style={{
            width: "100%",
            maxWidth: "600px",
            margin: "0 auto",
            marginBottom: 10,
          }}
        >
          <Img width={60} src={`${emailConfig.baseUrl}/logo.png`} />
        </Container>

        <Container
          style={{
            width: "100%",
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <Section
            style={{ background: emailConfig.colors.primary, padding: "20px" }}
          >
            <Row>
              <Column>
                <Text
                  style={{
                    color: "#ffffff",
                    margin: "0px",
                    fontSize: "20px",
                    fontWeight: "medium",
                  }}
                >
                  <span>{brand}</span>{" "}
                  <span style={{ opacity: 0.5, marginLeft: 2 }}>{heading}</span>
                </Text>
              </Column>
              <Column align="right">
                <Text
                  style={{
                    color: "#ffffff",
                    margin: "0px",
                    fontSize: "20px",
                    fontWeight: "medium",
                  }}
                >
                  {icon}
                </Text>
              </Column>
            </Row>
          </Section>

          <Section style={{ padding: "0px 20px", lineHeight: 1.4 }}>
            {text && <Text style={{ fontSize: "16px" }}>{text}</Text>}

            {children}
          </Section>

          {cta && (
            <Section style={{ padding: "0px 20px", paddingBottom: "20px" }}>
              <Row>
                <Column>
                  <Button
                    style={{
                      padding: "10px 20px",
                      borderColor: emailConfig.colors.primary,
                      color: emailConfig.colors.primary,
                      borderWidth: 2,
                      borderRadius: "6px",
                      borderStyle: "solid",
                      fontSize: "16px",
                      fontWeight: "bold",
                    }}
                    href={cta.href}
                  >
                    {cta.text}
                  </Button>
                </Column>
              </Row>
            </Section>
          )}
        </Container>

        {footerLinks.length > 0 && (
          <Container
            style={{
              width: "100%",
              maxWidth: "600px",
              margin: "0 auto",
              padding: "20px 20px",
            }}
          >
            <Row>
              <Column align="center">
                {footerLinks.map((link, i) => (
                  <Fragment key={i}>
                    {i > 0 && (
                      <span
                        style={{
                          opacity: 0.4,
                          color: "#000000",
                        }}
                      >
                        &nbsp;&nbsp;|&nbsp;&nbsp;
                      </span>
                    )}
                    <Link
                      href={link.href}
                      style={{
                        opacity: 0.4,
                        color: "#000000",
                      }}
                    >
                      {link.label}
                    </Link>
                  </Fragment>
                ))}
              </Column>
            </Row>
          </Container>
        )}
      </Body>
    </Html>
  );
}
