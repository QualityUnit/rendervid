import { redirect } from "next/navigation";

export default async function AIFactoryRootPage(
  props: PageProps<"/ai-factory">,
) {
  const searchParams = await props.searchParams;
  const ws = searchParams?.ws;
  const target = ws
    ? `/ai-factory/projects?ws=${encodeURIComponent(String(ws))}`
    : "/ai-factory/projects";
  redirect(target);
}
