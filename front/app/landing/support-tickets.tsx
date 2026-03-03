import {
  TbBolt,
  TbChartBar,
  TbCircleFilled,
  TbMail,
  TbShieldLock,
  TbTicket,
} from "react-icons/tb";
import { Container, Heading } from "~/landing/page";
import { makeMeta } from "~/meta";

export function meta() {
  return makeMeta({
    title: "Support tickets - CrawlChat",
    description:
      "Make AI chatbot from your documentation that handles your support queries. Embed it in your website, Discord, or Slack.",
  });
}

function Step({
  number,
  title,
  description,
  image,
}: {
  number: number;
  title: string;
  description: string;
  image: string;
}) {
  return (
    <div className="flex flex-col md:flex-row gap-16 mt-32 md:odd:flex-row-reverse">
      <div className="flex flex-col gap-4 flex-1 pt-2">
        <h3 className="text-4xl font-bold font-brand">
          <span className="text-brand">{number}.</span> {title}
        </h3>
        <p className="text-lg leading-[1.8]">{description}</p>
      </div>
      <div className="max-w-[400px]">
        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <img src={image} alt={title} />
        </div>
      </div>
    </div>
  );
}

export default function PublicBots() {
  const features = [
    { title: "Support tickets", icon: TbTicket },
    { title: "Email notifications", icon: TbMail },
    { title: "Statuses", icon: TbCircleFilled },
    { title: "AI first", icon: TbBolt },
    { title: "Secured", icon: TbShieldLock },
    { title: "Reports", icon: TbChartBar },
  ];

  return (
    <>
      <Container>
        <div className="flex flex-col md:flex-row gap-16 mt-16">
          <div className="flex-1">
            <h1 className="text-6xl font-bold font-brand leading-[1.1]">
              <span className="text-brand">Support tickets</span> right from the
              chatbot
            </h1>
            <h2 className="text-xl mt-4">
              CrawlChat now supports creating support tickets right from the
              chatbot. Your customers can get the first level of support from
              your documentation powered by AI. If the issue is not resolved,
              they can create a support ticket and you can resolve it manually.
            </h2>
          </div>
          <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <img src="/ticket-page.png" alt="Support tickets" />
          </div>
        </div>
      </Container>

      <Container>
        <div className="flex flex-col justify-center items-center mt-32 gap-8">
          <Heading>Simple yet essential support tools</Heading>
          <div className="flex gap-8 max-w-[600px] flex-wrap justify-center">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex gap-2 text-brand items-center font-medium min-w-fit"
              >
                <feature.icon size={20} />
                <span className="leading-none">{feature.title}</span>
              </div>
            ))}
          </div>
        </div>
      </Container>

      <Container>
        <Step
          number={1}
          title="Enquire if issue is resolved"
          description="Once the customer asks questions to the AI chatbot, it shows a prompt asking if the query is resolved. If the user says no, the chatbot will
          asks the customer to create a support ticket."
          image="/ticket-enquire.png"
        />
        <Step
          number={2}
          title="Customer submits ticket"
          description="If the customer is not satisfied with the answer, they will be shown a support ticket form. They can give a short description and their email address. The customer gets the ticket link on the email along with any further updates on the ticket."
          image="/ticket-form.png"
        />
        <Step
          number={3}
          title="View tickets"
          description="As the admin, you can view all the tickets in the dashboard. They are grouped by the status of the ticket so that you can quickly resolve the issue. You get notified on email whenever there is a new ticket or update on any thread from customer."
          image="/ticket-admin.png"
        />
        <Step
          number={4}
          title="Resolve ticket"
          description="Go to the ticket created by your customer and resolve it. You can provide the solution in markdown along with AI suggestions [coming]. Mark it closed once it is resolved so that the customer is satisfied."
          image="/ticket-resolve.png"
        />
      </Container>
    </>
  );
}
