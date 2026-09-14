export class AppError extends Error {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string | undefined;

  constructor(type: string, title: string, status: number, detail?: string) {
    super(detail ?? title);
    this.name = new.target.name;
    this.type = type;
    this.title = title;
    this.status = status;
    this.detail = detail;
  }
}

export class BadRequestError extends AppError {
  constructor(type: string, title: string, detail?: string) {
    super(type, title, 400, detail);
  }
}

export class ForbiddenError extends AppError {
  constructor(type: string, title: string, detail?: string) {
    super(type, title, 403, detail);
  }
}

export class UnauthorizedError extends AppError {
  constructor(type: string, title: string, detail?: string) {
    super(type, title, 401, detail);
  }
}

export class NotFoundError extends AppError {
  constructor(type: string, title: string, detail?: string) {
    super(type, title, 404, detail);
  }
}

export class ConflictError extends AppError {
  constructor(type: string, title: string, detail?: string) {
    super(type, title, 409, detail);
  }
}
