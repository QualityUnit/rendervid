import MainWrapper from "@/app/MainWrapper";
import { ProjectProvider } from "@/components/workspace/projects/ProjectContext";
import { ProjectSideMenu } from "@/components/workspace/projects/ProjectSideMenu";
import { ProjectTabBar } from "@/components/workspace/projects/ProjectTabBar";

export default async function ProjectDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProjectProvider>
      <ProjectSideMenu />
      <MainWrapper noPadding>
        <ProjectTabBar />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </MainWrapper>
    </ProjectProvider>
  );
}
