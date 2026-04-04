"use client";

import { MarkDownEditor } from "@/components/Markdown/MarkdownEditor";
import { IconPicker } from "@/components/workspace/agent-teams/agents/IconPicker";
import { DangerZone } from "@/components/workspace/agent-teams/settings/DangerZone";
import { ProjectAvatarPicker } from "@/components/workspace/agent-teams/settings/ProjectAvatarPicker";
import { ProjectColorPicker } from "@/components/workspace/agent-teams/settings/ProjectColorPicker";
import { SettingsSection } from "@/components/workspace/agent-teams/settings/SettingsSection";
import { useProjectContext } from "@/components/workspace/projects/ProjectContext";
import useCurrentWorkspace from "@/hooks/useCurrentWorkspace";
import type { AgentTeamProjectResponse } from "@/lib/urlslab/models/agent-team-project";
import { agentTeamProjectService } from "@/lib/urlslab/services/agent-team-project-service";
import { useAgentTeamProjects } from "@/queries/client/useAgentTeamProjectQueries";
import { useCurrentSession } from "@/queries/client/useCurrentSessionQuery";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import type { FC } from "react";
import { memo, useCallback, useEffect, useState } from "react";

const ProjectSettingsPage: FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    agentTeamId,
    projectId,
    isLoading: contextLoading,
  } = useProjectContext();
  const wsParam = searchParams.get("ws");
  const qs = wsParam ? `?ws=${wsParam}` : "";

  const workspace = useCurrentWorkspace();
  const { data: session } = useCurrentSession();
  const { updateProject, deleteProject } = useAgentTeamProjects(
    agentTeamId ?? "",
  );

  const { data: project, isLoading: projectLoading } =
    useQuery<AgentTeamProjectResponse | null>({
      queryKey: [
        "agent-team-projects",
        workspace?.workspace_id ?? "",
        agentTeamId ?? "",
        projectId,
      ],
      queryFn: async () => {
        if (!session?.accessToken || !workspace || !agentTeamId) return null;
        return await agentTeamProjectService.getProject(
          workspace.workspace_id,
          agentTeamId,
          projectId,
          session.accessToken,
        );
      },
      enabled:
        !!session?.accessToken && !!workspace && !!agentTeamId && !!projectId,
    });

  const [name, setName] = useState("");
  const [specification, setSpecification] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [icon, setIcon] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setSpecification(project.specification ?? "");
      setColor(project.color);
      setIcon(project.icon);
      setImageUrl(project.image_url);
    }
  }, [project]);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const handleSave = useCallback(async () => {
    if (!name.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await updateProject(projectId, {
        name: name.trim(),
        specification: specification.trim() || undefined,
        color: color ?? undefined,
        icon: icon ?? undefined,
        image_url: imageUrl ?? undefined,
      });
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  }, [
    updateProject,
    projectId,
    name,
    specification,
    color,
    icon,
    imageUrl,
    isSaving,
  ]);

  const handleDelete = useCallback(async () => {
    await deleteProject(projectId);
    router.push(`/ai-factory/projects${qs}`);
  }, [deleteProject, projectId, router, qs]);

  const isLoading = contextLoading || projectLoading || !agentTeamId;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Project not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
        {/* General */}
        <SettingsSection
          title="General"
          description="Basic project information and branding"
        >
          <div className="space-y-5">
            <div>
              <label
                htmlFor="project-name"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Project name
              </label>
              <input
                id="project-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  markDirty();
                }}
                className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Project color
              </span>
              <ProjectColorPicker
                value={color}
                onChange={(c) => {
                  setColor(c);
                  markDirty();
                }}
              />
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Project icon
              </span>
              <IconPicker
                value={icon ?? undefined}
                onChange={(iconName) => {
                  setIcon(iconName ?? null);
                  markDirty();
                }}
                color={color ?? undefined}
              />
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Project avatar
              </span>
              <ProjectAvatarPicker
                imageUrl={imageUrl}
                icon={icon}
                color={color}
                projectName={name}
                onImageUrlChange={(url) => {
                  setImageUrl(url);
                  markDirty();
                }}
              />
            </div>
          </div>
        </SettingsSection>

        {/* Specification */}
        <SettingsSection
          title="Specification"
          description="Detailed project specification and requirements for the AI agents"
        >
          <MarkDownEditor
            key={project.id}
            markdown={specification}
            onChange={(value) => {
              setSpecification(value);
              markDirty();
            }}
            placeholder="Describe the project scope, goals, and requirements..."
            className="rows-20"
          />
        </SettingsSection>

        {/* Danger Zone */}
        <div id="danger">
          <SettingsSection
            title="Danger Zone"
            description="Irreversible and destructive actions"
            variant="danger"
          >
            <DangerZone projectName={name} onDelete={handleDelete} />
          </SettingsSection>
        </div>
      </div>

      {/* Save bar - fixed at bottom, outside scroll area */}
      {isDirty && (
        <div className="flex justify-end border-t border-gray-200 bg-white px-6 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              You have unsaved changes
            </span>
            <button
              type="button"
              onClick={() => {
                if (project) {
                  setName(project.name);
                  setSpecification(project.specification ?? "");
                  setColor(project.color);
                  setIcon(project.icon);
                  setImageUrl(project.image_url);
                  setIsDirty(false);
                }
              }}
              className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim() || isSaving}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(ProjectSettingsPage);
