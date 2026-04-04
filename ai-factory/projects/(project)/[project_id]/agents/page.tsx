"use client";

import { AgentTeamCanvas } from "@/components/workspace/agent-teams/agents/AgentTeamCanvas";
import { useProjectContext } from "@/components/workspace/projects/ProjectContext";

export default function ProjectAgentsPage() {
  const { agentTeamId, isLoading } = useProjectContext();

  if (isLoading || !agentTeamId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full">
      <AgentTeamCanvas teamId={agentTeamId} />
    </div>
  );
}
