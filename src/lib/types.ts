export type TaskStatus = "TODO" | "IN_PROGRESS" | "EVIDENCE_SUBMITTED" | "DONE";
export type UserRole = "USER" | "ADMIN";

export type UserSummary = {
  id: string;
  name: string;
  email: string;
};

export type UserDTO = UserSummary & {
  role: UserRole;
  createdAt: string;
};

export type TaskEvidenceDTO = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: UserSummary;
};

// Plain, serializable shape passed from Server Components to Client
// Components (dates as ISO strings). Keeping a DTO separate from the Prisma
// model means the client bundle never needs Prisma's generated types.
export type TaskDTO = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  owner: UserSummary;
  assigneeId: string | null;
  assignee: UserSummary | null;
  approvedById: string | null;
  approvedAt: string | null;
  reviewNote: string | null;
};

export type TaskDetailDTO = TaskDTO & {
  evidence: TaskEvidenceDTO[];
};
