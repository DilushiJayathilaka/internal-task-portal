"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Paperclip,
  Pencil,
  Trash2,
  UploadCloud,
  UserRound,
  XCircle,
} from "lucide-react";
import type { TaskDetailDTO, UserRole, UserSummary } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import {
  TaskFormDialog,
  type TaskFormValues,
} from "@/components/task-form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FileDropzone } from "@/components/file-dropzone";
import { formatDate } from "@/lib/format";

type TaskDetailViewProps = {
  initialTask: TaskDetailDTO;
  users: UserSummary[];
  currentUser: { id: string; role: UserRole };
};

const MAX_EVIDENCE_FILE_SIZE = 10 * 1024 * 1024;

async function parseErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  const body = await response.json().catch(() => null);
  return body?.error ?? fallback;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskDetailView({
  initialTask,
  users,
  currentUser,
}: TaskDetailViewProps) {
  const router = useRouter();
  const [task, setTask] = useState(initialTask);

  const [editOpen, setEditOpen] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  const [uploadPending, setUploadPending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [reviewPending, setReviewPending] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const isAdmin = currentUser.role === "ADMIN";
  const isAssignee = task.assigneeId === currentUser.id;
  // Editing/deleting a task has no ownership restriction - any portal
  // member can manage any task (see api/tasks/[id]/route.ts). Uploading
  // evidence and reviewing it stay role-gated: only the assignee can
  // submit proof of their own work, only an admin can approve it.
  const canUpload = isAssignee && task.status !== "DONE";
  const canReview = isAdmin && task.status === "EVIDENCE_SUBMITTED";
  const canApprove = canReview && task.evidence.length > 0;

  async function handleEdit(values: TaskFormValues) {
    setEditError(null);
    setEditPending(true);
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setEditPending(false);

    if (!response.ok) {
      const message = await parseErrorMessage(
        response,
        "Could not save changes."
      );
      setEditError(message);
      toast.error(message);
      return;
    }
    const { task: updated } = await response.json();
    setTask((prev) => ({ ...prev, ...updated }));
    setEditOpen(false);
    toast.success("Task updated.");
  }

  async function handleDelete() {
    setDeletePending(true);
    const response = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (!response.ok) {
      setDeletePending(false);
      setDeleteConfirmOpen(false);
      toast.error(
        await parseErrorMessage(response, "Could not delete the task.")
      );
      return;
    }
    toast.success(`"${task.title}" deleted.`);
    router.push("/tasks");
  }

  async function handleUpload() {
    if (!selectedFile) {
      setUploadError("Choose a file first.");
      toast.error("Choose a file first.");
      return;
    }
    if (selectedFile.size > MAX_EVIDENCE_FILE_SIZE) {
      setUploadError("File must be 10MB or smaller.");
      toast.error("File must be 10MB or smaller.");
      return;
    }

    setUploadError(null);
    setUploadPending(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    const response = await fetch(`/api/tasks/${task.id}/evidence`, {
      method: "POST",
      body: formData,
    });
    setUploadPending(false);

    if (!response.ok) {
      const message = await parseErrorMessage(
        response,
        "Could not upload the file."
      );
      setUploadError(message);
      toast.error(message);
      return;
    }
    const { task: updated } = await response.json();
    setTask(updated);
    setSelectedFile(null);
    toast.success("Evidence uploaded.");
  }

  async function handleApprove() {
    setReviewError(null);
    setReviewPending(true);
    const response = await fetch(`/api/tasks/${task.id}/approve`, {
      method: "POST",
    });
    setReviewPending(false);

    if (!response.ok) {
      const message = await parseErrorMessage(
        response,
        "Could not approve the task."
      );
      setReviewError(message);
      toast.error(message);
      return;
    }
    const { task: updated } = await response.json();
    setTask(updated);
    toast.success("Task approved.");
  }

  async function handleRequestChanges() {
    setReviewError(null);
    setReviewPending(true);
    const response = await fetch(`/api/tasks/${task.id}/request-changes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: noteDraft.trim() || undefined }),
    });
    setReviewPending(false);

    if (!response.ok) {
      const message = await parseErrorMessage(
        response,
        "Could not send the task back."
      );
      setReviewError(message);
      toast.error(message);
      return;
    }
    const { task: updated } = await response.json();
    setTask(updated);
    setNoteDraft("");
    toast.success("Changes requested.");
  }

  return (
    <div className="space-y-6">
      <Link
        href="/tasks"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft size={16} /> Back to tasks
      </Link>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold wrap-break-word">
                {task.title}
              </h1>
              <StatusBadge status={task.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              Created by {task.owner.name} on {formatDate(task.createdAt)}
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-background"
            >
              <Pencil size={14} /> Edit
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={deletePending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-60"
            >
              <Trash2 size={14} /> {deletePending ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        {task.description && (
          <p className="mt-4 text-sm whitespace-pre-wrap text-foreground">
            {task.description}
          </p>
        )}

        <div className="mt-4 flex items-center gap-1.5 text-sm text-muted">
          <UserRound size={15} />
          {task.assignee ? `Assigned to ${task.assignee.name}` : "Unassigned"}
        </div>

        {task.reviewNote && (
          <div className="mt-4 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
            <p className="font-medium">Changes requested</p>
            <p className="mt-0.5">{task.reviewNote}</p>
          </div>
        )}

        {task.status === "DONE" && task.approvedAt && (
          <div className="mt-4 rounded-lg border border-green-300/60 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-500/30 dark:bg-green-950/30 dark:text-green-200">
            Approved {formatDate(task.approvedAt)}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Paperclip size={17} /> Evidence
        </h2>

        {task.evidence.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No evidence submitted yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {task.evidence.map((item) => {
              const downloadHref = `/api/tasks/${task.id}/evidence/${item.id}`;
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <a
                      href={downloadHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate font-medium text-blue-700 hover:underline dark:text-blue-400"
                    >
                      {item.fileName}
                    </a>
                    <p className="text-xs text-muted">
                      {formatFileSize(item.fileSize)} &middot; uploaded by{" "}
                      {item.uploadedBy.name} &middot;{" "}
                      {formatDate(item.uploadedAt)}
                    </p>
                  </div>
                  <a
                    href={downloadHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg p-2 text-muted hover:bg-background hover:text-foreground"
                    aria-label={`Download ${item.fileName}`}
                  >
                    <Download size={16} />
                  </a>
                </li>
              );
            })}
          </ul>
        )}

        {canUpload && (
          <div className="mt-4 border-t border-border pt-4">
            {uploadError && (
              <p className="mb-2 text-sm text-danger">{uploadError}</p>
            )}
            <FileDropzone
              accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp"
              hint="PDF, Word, or image · up to 10MB"
              file={selectedFile}
              onFileSelect={setSelectedFile}
              disabled={uploadPending}
            />
            {selectedFile && (
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploadPending}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-60"
              >
                <UploadCloud size={15} />{" "}
                {uploadPending ? "Uploading..." : "Upload evidence"}
              </button>
            )}
          </div>
        )}
      </div>

      {canReview && (
        <div className="rounded-xl border border-blue-300/60 bg-blue-50 p-6 shadow-sm dark:border-blue-500/30 dark:bg-blue-950/20">
          <h2 className="text-base font-semibold text-blue-900 dark:text-blue-100">
            Admin review
          </h2>
          <p className="mt-1 text-sm text-blue-800/80 dark:text-blue-200/80">
            Review the evidence above, then approve completion or send it back
            with a note.
          </p>

          {reviewError && (
            <p className="mt-3 text-sm text-danger">{reviewError}</p>
          )}
          {!canApprove && (
            <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
              No evidence has been submitted yet - this can&apos;t be approved.
              Request changes to send it back to the assignee.
            </p>
          )}

          <div className="mt-3 space-y-1.5">
            <label
              htmlFor="review-note"
              className="text-sm font-medium text-blue-900 dark:text-blue-100"
            >
              Note{" "}
              <span className="font-normal">
                (shown to the assignee if you request changes)
              </span>
            </label>
            <textarea
              id="review-note"
              rows={2}
              maxLength={1000}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              className="w-full resize-none rounded-lg border border-blue-300/60 bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent dark:border-blue-500/30"
            />
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleApprove}
              disabled={reviewPending || !canApprove}
              title={
                canApprove ? undefined : "No evidence has been submitted yet."
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-700 px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              <CheckCircle2 size={16} /> Approve
            </button>
            <button
              type="button"
              onClick={handleRequestChanges}
              disabled={reviewPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium hover:bg-background disabled:opacity-60"
            >
              <XCircle size={16} /> Request changes
            </button>
          </div>
        </div>
      )}

      <TaskFormDialog
        open={editOpen}
        mode="edit"
        task={task}
        users={users}
        pending={editPending}
        error={editError}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete this task?"
        description={`"${task.title}" will be permanently removed, along with any evidence attached to it. This can't be undone.`}
        confirmLabel="Delete task"
        pending={deletePending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}
