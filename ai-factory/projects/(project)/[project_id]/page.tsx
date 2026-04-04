import { redirect } from "next/navigation";

export default async function ProjectRootPage(props: {
  params: Promise<{ project_id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const ws = searchParams?.ws;
  const target = ws
    ? `/ai-factory/projects/${params.project_id}/issues?ws=${encodeURIComponent(String(ws))}`
    : `/ai-factory/projects/${params.project_id}/issues`;
  redirect(target);
}
