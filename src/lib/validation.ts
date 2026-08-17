import * as z from "zod";

export const SignupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Name must be at least 2 characters long." })
    .max(100),
  email: z
    .email({ error: "Please enter a valid email address." })
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters long." })
    .regex(/[a-zA-Z]/, { error: "Password must contain at least one letter." })
    .regex(/[0-9]/, { error: "Password must contain at least one number." }),
});

export const LoginSchema = z.object({
  email: z
    .email({ error: "Please enter a valid email address." })
    .trim()
    .toLowerCase(),
  password: z.string().min(1, { error: "Password is required." }),
});

export const TaskStatusValues = [
  "TODO",
  "IN_PROGRESS",
  "EVIDENCE_SUBMITTED",
  "DONE",
] as const;

export const CreateTaskSchema = z.object({
  title: z.string().trim().min(1, { error: "Title is required." }).max(200),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  status: z.enum(TaskStatusValues).optional(),
  assigneeId: z
    .string()
    .trim()
    .min(1)
    .nullable()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

export const UpdateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: "Title is required." })
    .max(200)
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  status: z.enum(TaskStatusValues).optional(),
  assigneeId: z
    .string()
    .trim()
    .min(1)
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)),
});

export const RoleValues = ["USER", "ADMIN"] as const;

export const UpdateUserRoleSchema = z.object({
  role: z.enum(RoleValues),
});

export const RequestChangesSchema = z.object({
  note: z
    .string()
    .trim()
    .max(1000, { error: "Keep the note under 1000 characters." })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

export const ALLOWED_EVIDENCE_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const MAX_EVIDENCE_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const EvidenceMetadataSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(ALLOWED_EVIDENCE_MIME_TYPES, {
    error: "Unsupported file type. Upload a PDF, Word document, or image.",
  }),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(MAX_EVIDENCE_FILE_SIZE, { error: "File must be 10MB or smaller." }),
});
