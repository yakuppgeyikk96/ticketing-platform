import { problemSchema, type ProblemBody } from "@ticketing/contracts";
import type { ZodType } from "zod";

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemBody;

  constructor(status: number, problem: ProblemBody) {
    super(problem.title);

    this.status = status;
    this.problem = problem;
  }
}

export async function request<T>(
  path: string,
  init: {
    response: ZodType<T>;
    method?: string;
    body?: unknown;
  },
): Promise<T> {
  const res = await fetch("/api" + path, {
    method: init.method ?? "GET",
    headers:
      init.body !== undefined ? { "content-type": "application/json" } : {},
    body: init.body !== undefined ? JSON.stringify(init.body) : null,
  });

  if (res.status === 204) return init.response.parse(undefined);

  const data: unknown = await res.json();

  if (!res.ok) {
    const parsed = problemSchema.safeParse(data);

    if (parsed.success) {
      throw new ApiError(res.status, parsed.data);
    }

    throw new Error(`unexpected ${res.status} response`);
  }

  return init.response.parse(data);
}
