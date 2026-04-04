import MainWrapper from "@/app/MainWrapper";
import { ProjectsDashboardSideMenu } from "@/components/workspace/projects/ProjectsDashboardSideMenu";

export default async function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ProjectsDashboardSideMenu />
      <MainWrapper>{children}</MainWrapper>
    </>
  );
}
