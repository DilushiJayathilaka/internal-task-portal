import "server-only";

import type { TaskDTO, TaskDetailDTO } from "@/lib/types";

const userSummarySelect = { id: true, name: true, email: true } as const;

export const taskListInclude = {
  owner: { select: userSummarySelect },
  assignee: { select: userSummarySelect },
} as const;

export const taskDetailInclude = {
  ...taskListInclude,
  evidence: {
    orderBy: { uploadedAt: "desc" as const },
    include: { uploadedBy: { select: userSummarySelect } },
  },
} as const;

type UserSummary = { id: string; name: string; email: string };

type TaskWithRelations = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  owner: UserSummary;
  assigneeId: string | null;
  assignee: UserSummary | null;
  approvedById: string | null;
  approvedAt: Date | null;
  reviewNote: string | null;
};

type TaskDetailWithRelations = TaskWithRelations & {
  evidence: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    blobUrl: string;
    uploadedAt: Date;
    uploadedBy: UserSummary;
  }>;
};

export function toTaskDTO(task: TaskWithRelations): TaskDTO {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status as TaskDTO["status"],
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    ownerId: task.ownerId,
    owner: task.owner,
    assigneeId: task.assigneeId,
    assignee: task.assignee,
    approvedById: task.approvedById,
    approvedAt: task.approvedAt ? task.approvedAt.toISOString() : null,
    reviewNote: task.reviewNote,
  };
}

export function toTaskDetailDTO(task: TaskDetailWithRelations): TaskDetailDTO {
  return {
    ...toTaskDTO(task),
    evidence: task.evidence.map((item) => ({
      id: item.id,
      fileName: item.fileName,
      mimeType: item.mimeType,
      fileSize: item.fileSize,
      uploadedAt: item.uploadedAt.toISOString(),
      uploadedBy: item.uploadedBy,
    })),
  };
}
