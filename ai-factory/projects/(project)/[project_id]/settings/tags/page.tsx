"use client";

import { useProjectContext } from "@/components/workspace/projects/ProjectContext";
import type {
  ProjectIssueTagCreateRequest,
  ProjectIssueTagResponse,
  ProjectIssueTagUpdateRequest,
} from "@/lib/urlslab/models/project-issue-tag";
import {
  useProjectIssueTags,
  useProjectIssueTagsQuery,
} from "@/queries/client/useProjectIssueTagQueries";
import type { FC } from "react";
import { memo, useCallback, useState } from "react";
import { TbPencil, TbPlus, TbTrash, TbX } from "react-icons/tb";

const PRESET_COLORS = [
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#6B7280",
  "#14B8A6",
];

interface TagFormData {
  name: string;
  description: string;
  color: string;
}

const emptyForm: TagFormData = { name: "", description: "", color: "#6B7280" };

const TagsPage: FC = () => {
  const {
    agentTeamId,
    projectId,
    isLoading: contextLoading,
  } = useProjectContext();

  const { data: tags, isLoading: tagsLoading } = useProjectIssueTagsQuery(
    agentTeamId ?? "",
    projectId,
  );
  const { addTag, updateTag, deleteTag } = useProjectIssueTags(
    agentTeamId ?? "",
    projectId,
  );

  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState<ProjectIssueTagResponse | null>(
    null,
  );
  const [form, setForm] = useState<TagFormData>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreate = useCallback(() => {
    setEditingTag(null);
    setForm(emptyForm);
    setShowForm(true);
  }, []);

  const openEdit = useCallback((tag: ProjectIssueTagResponse) => {
    setEditingTag(tag);
    setForm({
      name: tag.name,
      description: tag.description ?? "",
      color: tag.color,
    });
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingTag(null);
    setForm(emptyForm);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingTag) {
        const data: ProjectIssueTagUpdateRequest = {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          color: form.color,
        };
        await updateTag(editingTag.id, data);
      } else {
        const data: ProjectIssueTagCreateRequest = {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          color: form.color,
        };
        await addTag(data);
      }
      closeForm();
    } finally {
      setIsSubmitting(false);
    }
  }, [form, editingTag, isSubmitting, addTag, updateTag, closeForm]);

  const handleDelete = useCallback(
    async (tagId: string) => {
      await deleteTag(tagId);
    },
    [deleteTag],
  );

  const isLoading = contextLoading || tagsLoading || !agentTeamId;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Tags
        </h2>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <TbPlus className="size-4" />
          Add Tag
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {editingTag ? "Edit Tag" : "Create Tag"}
            </h3>
            <button
              type="button"
              onClick={closeForm}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <TbX className="size-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px] flex-1">
              <label
                htmlFor="tag-name"
                className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
              >
                Name
              </label>
              <input
                id="tag-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Tag name"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="min-w-[180px] flex-1">
              <label
                htmlFor="tag-desc"
                className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
              >
                Description
              </label>
              <input
                id="tag-desc"
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Optional description"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Color
              </span>
              <div className="flex gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`size-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      form.color === c
                        ? "border-gray-900 dark:border-white"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!form.name.trim() || isSubmitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : editingTag ? "Update" : "Create"}
            </button>
          </div>
        </div>
      )}

      {(!tags || tags.length === 0) && !showForm ? (
        <div className="rounded-lg border border-gray-200 bg-white py-12 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No tags yet. Create one to organize your issues.
          </p>
        </div>
      ) : tags && tags.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Color
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Name
                </th>
                <th className="hidden px-4 py-2.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase sm:table-cell dark:text-gray-400">
                  Description
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {tags.map((tag) => (
                <tr
                  key={tag.id}
                  className="bg-white transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700/50"
                >
                  <td className="px-4 py-3">
                    <div
                      className="size-5 rounded-full border border-gray-200 dark:border-gray-600"
                      style={{ backgroundColor: tag.color }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {tag.name}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {tag.description || "\u2014"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(tag)}
                        className="text-gray-400 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <TbPencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(tag.id)}
                        className="text-gray-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
                      >
                        <TbTrash className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

export default memo(TagsPage);
