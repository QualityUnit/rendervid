"use client";

import FullscreenWrapper from "@/components/layout/FullscreenWrapper";
import PageTitle from "@/components/layout/PageTitle";
import { AgentTeamsTable } from "@/components/tables/AgentTeamsTable";
import {
  CreateAgentTeamView,
  loadWizardSession,
} from "@/components/workspace/agent-teams/CreateAgentTeamModal";
import useCurrentWorkspace from "@/hooks/useCurrentWorkspace";
import useKeyboardAddModal from "@/hooks/useKeyboardAddModal";
import useUserPermissions from "@/hooks/useUserPermissions";
import type {
  AgentTeamCreateRequest,
  AgentTeamResponse,
} from "@/lib/urlslab/models/agent-team";
import { buildAgentsSpecFromAIResult } from "@/lib/urlslab/models/agent-team-helpers";
import { AGENT_TEAMS_PERMISSIONS } from "@/lib/urlslab/permissions/user-permissions";
import { agentTeamProjectService } from "@/lib/urlslab/services/agent-team-project-service";
import { agentTeamService } from "@/lib/urlslab/services/agent-team-service";
import { projectIssueService } from "@/lib/urlslab/services/project-issue-service";
import { useAgentTeamsInfiniteQuery } from "@/queries/client/infinite-queries/useAgentTeamsInfiniteQueries";
import { useAgentTeams } from "@/queries/client/useAgentTeamQueries";
import { useCurrentSession } from "@/queries/client/useCurrentSessionQuery";
import { setConfirmDelete } from "@/stores/features/confirmDeleteSlice";
import { useAppDispatch } from "@/stores/hooks";
import type { ITableActions } from "@/types/tables";
import { Button } from "flowbite-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FC } from "react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { TbPlus } from "react-icons/tb";

const AgentTeams: FC = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspace = useCurrentWorkspace();
  const { data: session } = useCurrentSession();
  const currentUserCan = useUserPermissions(AGENT_TEAMS_PERMISSIONS);

  const [showCreateView, setShowCreateView] = useState(
    () => loadWizardSession() !== null || searchParams.get("create") === "1",
  );

  // React to ?create=1 added after initial mount (e.g. sidebar click)
  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setShowCreateView(true);
    }
  }, [searchParams]);

  const { addAgentTeam, deleteAgentTeam } = useAgentTeams();
  const { data: agentTeams, isLoading } = useAgentTeamsInfiniteQuery();

  const handleBack = useCallback(() => {
    setShowCreateView(false);
  }, []);

  const handleCreate = useCallback(
    async (data: AgentTeamCreateRequest) => {
      const result = await addAgentTeam(data);
      if (result && typeof result === "object" && "id" in result) {
        const team = result as AgentTeamResponse;
        let projectId: string | undefined;

        // Create the project if wizard included project data
        if (data.project?.name && workspace && session?.accessToken) {
          try {
            const project = await agentTeamProjectService.createProject(
              workspace.workspace_id,
              team.id,
              {
                name: data.project.name,
                specification: data.project.specification || undefined,
                channel_spec: data.channel_spec,
              },
              session.accessToken,
            );
            projectId = project?.id;
          } catch {
            console.warn("Failed to create project during onboarding");
          }
        }

        // Apply AI-generated agents_spec
        if (data.aiResult && workspace && session?.accessToken) {
          try {
            const agentsSpec = buildAgentsSpecFromAIResult(data.aiResult);
            await agentTeamService.updateAgentTeam(
              workspace.workspace_id,
              team.id,
              { agents_spec: agentsSpec },
              session.accessToken,
            );
          } catch {
            console.warn("Failed to apply AI agents spec during onboarding");
          }

          // Create periodic issues
          if (projectId && data.aiResult.periodic_issues?.length) {
            for (const issue of data.aiResult.periodic_issues) {
              try {
                await projectIssueService.createIssue(
                  workspace.workspace_id,
                  team.id,
                  projectId,
                  {
                    title: issue.title,
                    description: issue.description,
                    issue_type: "periodic",
                    frequency: issue.frequency,
                  },
                  session.accessToken,
                );
              } catch {
                console.warn(
                  "Failed to create periodic issue during onboarding",
                );
              }
            }
          }
        }

        const wsParam = workspace?.workspace_id
          ? `?ws=${workspace.workspace_id}`
          : "";
        // Navigate to the project view. Use project_id from team response
        // (auto-created) or the manually created project.
        const targetProjectId = projectId ?? team.project_id;
        if (targetProjectId) {
          router.push(
            `/ai-factory/projects/${targetProjectId}/issues${wsParam}`,
          );
        } else {
          router.push(`/ai-factory/agent-teams/${team.id}${wsParam}`);
        }
      } else {
        setShowCreateView(false);
      }
    },
    [addAgentTeam, router, workspace, session],
  );

  const addAction = useCallback(() => {
    setShowCreateView(true);
  }, []);

  const deleteAction = useCallback(
    (item: AgentTeamResponse) => {
      dispatch(
        setConfirmDelete({
          title: "Delete Agent Team",
          buttonText: "Delete",
          alert: `Are you sure you want to delete "${item.name}"?`,
          onDelete: async () => {
            await deleteAgentTeam(item.id);
          },
        }),
      );
    },
    [deleteAgentTeam, dispatch],
  );

  const duplicateAction = useCallback(
    async (item: AgentTeamResponse) => {
      await addAgentTeam({
        name: `${item.name} (copy)`,
        description: item.description || undefined,
      });
    },
    [addAgentTeam],
  );

  const actions = useMemo(
    () =>
      ({
        add: addAction,
        edit: () => {},
        duplicate: duplicateAction,
        delete: deleteAction,
      }) satisfies ITableActions<AgentTeamResponse>,
    [addAction, duplicateAction, deleteAction],
  );

  useKeyboardAddModal(addAction);

  if (showCreateView) {
    return <CreateAgentTeamView onBack={handleBack} onSubmit={handleCreate} />;
  }

  return (
    <FullscreenWrapper>
      <div className="flex items-center justify-between">
        <PageTitle>Agent Teams</PageTitle>
        {currentUserCan.CREATE && (
          <Button color="primary" size="sm" onClick={addAction}>
            <TbPlus className="mr-2 size-3" />
            Create Team
          </Button>
        )}
      </div>

      <AgentTeamsTable
        tableData={agentTeams ?? undefined}
        actions={actions}
        loading={isLoading}
        emptyTable={agentTeams?.length === 0}
        emptySearchResults={false}
      />
    </FullscreenWrapper>
  );
};

export default memo(AgentTeams);
