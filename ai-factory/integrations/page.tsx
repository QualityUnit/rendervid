import PermissionsBoundary from "@/components/PermissionsBoundary";
import { workspaceIdFromParams } from "@/helpers/general";
import { INTEGRATIONS_PERMISSIONS } from "@/lib/urlslab/permissions/user-permissions";
import { prefetchAll } from "@/queries/ssr/prefetch-helpers";
import { prefetchAllIntegrationsQuery } from "@/queries/ssr/prefetchIntegrationsQueries";
import type { PageSearchParams } from "@/types/general";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import type { Metadata } from "next";
import Integrations from "../../aistudio/(flow)/(padding)/integrations/integrations";

export const metadata: Metadata = {
  title: "Integrations",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const queryClient = new QueryClient();
  const resolvedSearchParams = await searchParams;
  const workspaceId = workspaceIdFromParams(resolvedSearchParams);

  await prefetchAll(
    prefetchAllIntegrationsQuery(queryClient, workspaceId, {
      sortByIntegrationCount: true,
    }),
  );

  return (
    <PermissionsBoundary permissions={INTEGRATIONS_PERMISSIONS}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Integrations />
      </HydrationBoundary>
    </PermissionsBoundary>
  );
}
