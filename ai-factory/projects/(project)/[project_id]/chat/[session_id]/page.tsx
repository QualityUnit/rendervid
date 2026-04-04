"use client";

import { AgentTeamChatSession } from "@/components/workspace/agent-teams/chat/AgentTeamChatSession";
import { useProjectContext } from "@/components/workspace/projects/ProjectContext";
import { useParams } from "next/navigation";

export default function ProjectChatSessionPage() {
  const params = useParams();
  const sessionId = params.session_id as string;
  const { agentTeamId, isLoading } = useProjectContext();

  if (isLoading || !agentTeamId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  return <AgentTeamChatSession teamId={agentTeamId} sessionId={sessionId} />;
}
