import cn from "@meltdownjs/cn";
import {
  getBalance,
  getCreditTransactions,
} from "@packages/common/credit-transaction";
import {
  prisma,
  type CreditTransaction,
  type Scrape,
} from "@packages/common/prisma";
import { TbChevronLeft, TbChevronRight, TbCoins } from "react-icons/tb";
import { Link as RouterLink, useSearchParams } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser } from "~/auth/scrape-session";
import { EmptyState } from "~/components/empty-state";
import { Page } from "~/components/page";
import { Timestamp } from "~/components/timestamp";
import { makeMeta } from "~/meta";
import { getSession } from "~/session";
import type { Route } from "./+types/page";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const session = await getSession(request.headers.get("cookie"));
  const scrapeId = session.get("scrapeId");

  if (scrapeId) {
    authoriseScrapeUser(user!.scrapeUsers, scrapeId);
  }

  const scrape = await prisma.scrape.findFirstOrThrow({
    where: { id: scrapeId },
  });

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const view = url.searchParams.get("view") ?? "collection";
  const limit = 50;

  const { transactions, total } = await getCreditTransactions(
    view === "collection" ? undefined : user!.id,
    view === "collection" ? scrapeId : undefined,
    page,
    limit
  );

  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrevious = page > 1;

  const balance = await getBalance(
    view === "collection" ? scrape.userId : user!.id,
    "message"
  );

  return {
    transactions,
    total,
    page,
    totalPages,
    hasNext,
    hasPrevious,
    balance,
  };
}

export function meta() {
  return makeMeta({
    title: "Usage - CrawlChat",
  });
}

function TransactionRow({
  transaction,
}: {
  transaction: CreditTransaction & { scrape: Scrape | null };
}) {
  const isPositive = transaction.credits > 0;

  return (
    <tr className="border-b border-base-200 last:border-b-0">
      <td className="py-3">
        <span
          className={cn(
            "badge badge-soft capitalize",
            transaction.type === "usage" && "badge-primary",
            transaction.type === "topup" && "badge-success",
            transaction.type === "subscription" && "badge-success",
            transaction.type === "migration" && "badge-info",
            transaction.type === "expired" && "badge-warning"
          )}
        >
          {transaction.type}
        </span>
      </td>
      <td className="py-3">
        <span className={cn(isPositive ? "text-success" : "text-error")}>
          {transaction.credits.toFixed(2)}
        </span>
      </td>
      <td>{transaction.scrape?.title ?? "-"}</td>
      <td>{transaction.description}</td>
      <td className="text-right">
        <Timestamp date={transaction.createdAt} />
      </td>
    </tr>
  );
}

function NoTransactions() {
  return (
    <div className="flex justify-center items-center h-full">
      <EmptyState
        icon={<TbCoins />}
        title="No transactions found"
        description="Your credit transaction history will appear here."
      />
    </div>
  );
}

export default function UsagePage({ loaderData }: Route.ComponentProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  function getUrl(nextPage: number) {
    return `/usage?page=${nextPage}`;
  }

  return (
    <Page
      title="Usage"
      icon={<TbCoins />}
      right={
        <>
          <div
            className="tooltip tooltip-left h-full"
            data-tip="Available credits"
          >
            <div
              className={cn(
                "bg-accent/10 text-accent rounded-box px-4 h-full",
                "flex items-center gap-2"
              )}
            >
              <TbCoins />
              {loaderData.balance}
            </div>
          </div>
          <select
            className="select"
            value={searchParams.get("view") ?? "collection"}
            onChange={(e) => {
              setSearchParams({ view: e.target.value });
            }}
          >
            <option value="collection">Collection</option>
            <option value="mine">Mine</option>
          </select>
        </>
      }
    >
      <div className="flex flex-col gap-4 h-full">
        {loaderData.transactions.length === 0 ? (
          <NoTransactions />
        ) : (
          <>
            <div className="overflow-x-auto border border-base-300 rounded-box bg-base-100 shadow">
              <table className="table">
                <thead>
                  <tr className="border-b border-base-300">
                    <th className="text-left w-28">Type</th>
                    <th className="text-left w-28">Credits</th>
                    <th className="text-left w-54">Collection</th>
                    <th className="text-left">Note</th>
                    <th className="text-right w-48">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loaderData.transactions.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <RouterLink
                className={cn(
                  "btn btn-square",
                  loaderData.page <= 1 && "btn-disabled"
                )}
                to={getUrl(loaderData.page - 1)}
              >
                <TbChevronLeft />
              </RouterLink>

              <span>
                {loaderData.page} / {loaderData.totalPages}
              </span>

              <RouterLink
                className={cn(
                  "btn btn-square",
                  loaderData.page >= loaderData.totalPages && "btn-disabled"
                )}
                to={getUrl(loaderData.page + 1)}
              >
                <TbChevronRight />
              </RouterLink>
            </div>
          </>
        )}
      </div>
    </Page>
  );
}
