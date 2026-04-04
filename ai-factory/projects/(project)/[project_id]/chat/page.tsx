"use client";

import { AgentTeamHome } from "@/components/workspace/agent-teams/home/AgentTeamHome";
import { useProjectContext } from "@/components/workspace/projects/ProjectContext";

export default function ProjectChatPage() {
  const { agentTeamId, projectId, isLoading } = useProjectContext();

  if (isLoading || !agentTeamId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  return <AgentTeamHome teamId={agentTeamId} projectId={projectId} />;
}
