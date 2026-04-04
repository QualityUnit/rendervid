import CustomModalRoot from "@/components/modals/CustomModalRoot";
import WorkspaceCheck from "@/components/WorkspaceCheck";
import { LAST_ACTIVE_WORKSPACE_COOKIE } from "@/lib/urlslab/constants";
import { prefetchMainGlobalQueries } from "@/queries/ssr/prefetchMainGlobalQueries";
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { cookies } from "next/headers";
import Header from "../aistudio/(header)/header";

export default async function AIFactoryLayout(
  props: LayoutProps<"/ai-factory">,
) {
  const queryClient = new QueryClient();

  const cookieStore = await cookies();
  const workspaceId = cookieStore.get(LAST_ACTIVE_WORKSPACE_COOKIE)?.value;

  await prefetchMainGlobalQueries(queryClient, workspaceId);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex h-screen w-full flex-col overflow-hidden">
        <Header />
        <main className="relative flex w-full grow overflow-y-hidden">
          {props.children}
        </main>
        <CustomModalRoot />
        <WorkspaceCheck />
      </div>
    </HydrationBoundary>
  );
}
