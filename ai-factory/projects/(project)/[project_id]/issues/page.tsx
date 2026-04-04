"use client";

import { IssueCreateDialog } from "@/components/workspace/agent-teams/issues/IssueCreateDialog";
import { IssueEditDialog } from "@/components/workspace/agent-teams/issues/IssueEditDialog";
import { IssueKanbanView } from "@/components/workspace/agent-teams/issues/IssueKanbanView";
import { IssueListView } from "@/components/workspace/agent-teams/issues/IssueListView";
import { IssueToolbar } from "@/components/workspace/agent-teams/issues/IssueToolbar";
import type { IssueViewMode } from "@/components/workspace/agent-teams/issues/IssueViewToggle";
import { useProjectContext } from "@/components/workspace/projects/ProjectContext";
import type {
  IssueStatus,
  ProjectIssueCreateRequest,
  ProjectIssueResponse,
  ProjectIssueUpdateRequest,
} from "@/lib/urlslab/models/project-issue";
import { useProjectIssuesByStatusQuery } from "@/queries/client/useProjectIssueInfiniteQuery";
import {
  useProjectIssues,
  useProjectIssuesQuery,
} from "@/queries/client/useProjectIssueQueries";
import { useProjectIssueTagsQuery } from "@/queries/client/useProjectIssueTagQueries";
import type { FC } from "react";
import { memo, useCallback, useMemo, useState } from "react";

const ProjectIssuesPage: FC = () => {
  const {
    agentTeamId,
    projectId,
    isLoading: contextLoading,
  } = useProjectContext();

  const [viewMode, setViewMode] = useState<IssueViewMode>("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<IssueStatus | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<ProjectIssueResponse | null>(
    null,
  );

  // Shared search params (excluding status — each column filters its own)
  const sharedSearchParams = useMemo(
    () => ({
      query: searchQuery || undefined,
    }),
    [searchQuery],
  );

  // Per-status infinite queries for kanban
  const {
    queries: columnQueries,
    allIssues: kanbanIssues,
    isLoading: kanbanLoading,
  } = useProjectIssuesByStatusQuery(
    agentTeamId ?? "",
    projectId,
    sharedSearchParams,
  );

  // Single flat query for list view (with optional status filter)
  const listSearchParams = useMemo(
    () => ({
      query: searchQuery || undefined,
      status: statusFilter ?? undefined,
      limit: 200,
    }),
    [searchQuery, statusFilter],
  );

  const { data: listData, isLoading: listLoading } = useProjectIssuesQuery(
    agentTeamId ?? "",
    projectId,
    viewMode === "list" ? listSearchParams : undefined,
  );

  const {
    addIssue,
    updateIssue,
    deleteIssue,
    cancelIssue,
    cancelAllInProgress,
  } = useProjectIssues(agentTeamId ?? "", projectId);
  const { data: tags } = useProjectIssueTagsQuery(agentTeamId ?? "", projectId);

  const listIssues = useMemo(() => listData?.items ?? [], [listData?.items]);
  const hasInProgress = useMemo(
    () =>
      viewMode === "kanban"
        ? columnQueries.in_progress.issues.length > 0
        : listIssues.some((i) => i.status === "in_progress"),
    [viewMode, columnQueries.in_progress.issues.length, listIssues],
  );

  const handleCreateIssue = useCallback(
    async (createData: ProjectIssueCreateRequest) => {
      await addIssue(createData);
    },
    [addIssue],
  );

  const handleUpdateIssue = useCallback(
    async (issueId: string, updateData: ProjectIssueUpdateRequest) => {
      await updateIssue(issueId, updateData);
    },
    [updateIssue],
  );

  const handleDeleteIssue = useCallback(
    async (issueId: string) => {
      await deleteIssue(issueId);
    },
    [deleteIssue],
  );

  const handleStatusChange = useCallback(
    (issueId: string, newStatus: IssueStatus) => {
      updateIssue(issueId, { status: newStatus });
    },
    [updateIssue],
  );

  const handleCancelIssue = useCallback(
    (issueId: string) => {
      cancelIssue(issueId);
    },
    [cancelIssue],
  );

  const handleStopAll = useCallback(() => {
    cancelAllInProgress();
  }, [cancelAllInProgress]);

  const handleIssueClick = useCallback((issue: ProjectIssueResponse) => {
    setEditingIssue(issue);
  }, []);

  const isLoading =
    contextLoading ||
    !agentTeamId ||
    (viewMode === "kanban" ? kanbanLoading : listLoading);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden p-5">
      <IssueToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreateClick={() => setCreateDialogOpen(true)}
        hasInProgress={hasInProgress}
        onStopAll={handleStopAll}
      />

      {viewMode === "kanban" ? (
        <IssueKanbanView
          columns={columnQueries}
          allIssues={kanbanIssues}
          onIssueClick={handleIssueClick}
          onStatusChange={handleStatusChange}
          onCancelIssue={handleCancelIssue}
          onStopAll={handleStopAll}
          tags={tags ?? []}
        />
      ) : (
        <IssueListView
          issues={listIssues}
          onIssueClick={handleIssueClick}
          onCancelIssue={handleCancelIssue}
        />
      )}

      <IssueCreateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateIssue}
        tags={tags ?? []}
      />

      <IssueEditDialog
        issue={editingIssue}
        open={editingIssue !== null}
        onClose={() => setEditingIssue(null)}
        onSubmit={handleUpdateIssue}
        onDelete={handleDeleteIssue}
        onCancel={handleCancelIssue}
        tags={tags ?? []}
      />
    </div>
  );
};

export default memo(ProjectIssuesPage);
