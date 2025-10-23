// @bun
// src/types.ts
class MediatorError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "MediatorError";
  }
}

class HandlerNotFoundError extends MediatorError {
  constructor(key) {
    super(`Handler not found for "${key}"`);
  }
}

class AmbiguousHandlerError extends MediatorError {
  constructor(key) {
    super(`Ambiguous handlers for "${key}"`);
  }
}

class CanceledError extends MediatorError {
  constructor() {
    super("Operation cancelled");
  }
}
export {
  MediatorError,
  HandlerNotFoundError,
  CanceledError,
  AmbiguousHandlerError
};
