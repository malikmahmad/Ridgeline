import { z } from "zod";

export function parseOrThrow(schema, data, badRequest) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field:   i.path.join("."),
      message: i.message,
    }));
    throw badRequest("Please fix the errors below.", details);
  }
  return result.data;
}

export const registerSchema = z.object({
  name:     z.string().trim().min(2, "Name must be at least 2 characters."),
  email:    z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const loginSchema = z.object({
  email:    z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const updateProfileSchema = z.object({
  name:  z.string().trim().min(2, "Name must be at least 2 characters."),
  title: z.string().trim().optional().default(""),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters.")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter.")
    .regex(/[0-9]/, "Must contain at least one number."),
});

export const createUserSchema = z.object({
  name:     z.string().trim().min(2, "Name is required."),
  email:    z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role:     z.enum(["admin", "manager", "member"]),
  title:    z.string().trim().optional().default(""),
});

export const updateUserSchema = z.object({
  name:     z.string().trim().min(2, "Name is required."),
  role:     z.enum(["admin", "manager", "member"]),
  title:    z.string().trim().optional().default(""),
  isActive: z.coerce.boolean().optional().default(true),
});

export const createProjectSchema = z.object({
  name:        z.string().trim().min(2, "Project name is required."),
  description: z.string().trim().optional().default(""),
  startDate:   z.string().trim().optional().nullable(),
  endDate:     z.string().trim().optional().nullable(),
  priority:    z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  status:      z.enum(["planning", "active", "on_hold", "completed", "cancelled"]).default("planning"),
  managerId:   z.coerce.number().int().positive("Assign a Project Manager."),
});

export const updateProjectSchema = createProjectSchema
  .partial({ managerId: true })
  .extend({
    managerId: z.coerce.number().int().positive().optional().nullable(),
  });

export const projectManagerUpdateSchema = z.object({
  name:        z.string().trim().min(2, "Project name is required."),
  description: z.string().trim().optional().default(""),
  startDate:   z.string().trim().optional().nullable(),
  endDate:     z.string().trim().optional().nullable(),
  priority:    z.enum(["low", "medium", "high", "urgent"]),
  status:      z.enum(["planning", "active", "on_hold", "completed", "cancelled"]),
});

export const addMemberSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

const optionalId = z.preprocess(
  (val) => (val === "" || val === undefined ? null : val),
  z.coerce.number().int().positive().nullable().optional()
);

export const createTaskSchema = z.object({
  title:       z.string().trim().min(2, "Task title is required."),
  description: z.string().trim().optional().default(""),
  assigneeId:  optionalId,
  priority:    z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate:     z.string().trim().optional().nullable(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const updateTaskStatusSchema = z.object({
  status: z.enum(["todo", "in_progress", "review", "completed"]),
});

export const createCommentSchema = z.object({
  message: z.string().trim().min(1, "Comment cannot be empty."),
});
