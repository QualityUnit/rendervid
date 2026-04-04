import { workspaceIdFromParams } from "@/helpers/general";
import { prefetchAgentTeamsInfiniteQuery } from "@/queries/ssr/infinite-queries/prefetchAgentTeamsInfiniteQueries";
import {
  getPrefetchRequestData,
  prefetchAll,
} from "@/queries/ssr/prefetch-helpers";
import type { PageSearchParams } from "@/types/general";
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import type { Metadata } from "next";
import AgentTeams from "./agent-teams";

export const metadata: Metadata = {
  title: "Agent Teams",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const queryClient = new QueryClient();
  const resolvedSearchParams = await searchParams;
  const workspaceId = workspaceIdFromParams(resolvedSearchParams);
  const { requestData, pagesCount } =
    await getPrefetchRequestData(resolvedSearchParams);

  await prefetchAll(
    prefetchAgentTeamsInfiniteQuery(queryClient, {
      workspaceId,
      requestData,
      pagesCount,
    }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AgentTeams />
    </HydrationBoundary>
  );
}
