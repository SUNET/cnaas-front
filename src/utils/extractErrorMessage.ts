/**
 * Extracts a human-readable error message from a thrown value.
 * Handles `checkJsonResponse` rejections (object with `.message`),
 * `Error` instances, and falls back to `String(err)`.
 */
export function extractErrorMessage(err: unknown): string {
  const message = readMessage(err);
  if (message !== null) return message;
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Async variant that also handles raw `Response` rejections from
 * `checkResponseStatus` — reads the JSON body to recover the backend's
 * `{message: ...}` envelope, falling back to text or `HTTP <status>`.
 * Use this in catch blocks that talk to `postData`/`deleteData`/`post`.
 */
export async function extractErrorMessageAsync(
  error: unknown,
): Promise<string> {
  if (typeof Response !== "undefined" && error instanceof Response) {
    try {
      const body: unknown = await error.clone().json();
      const message = readMessage(body);
      if (message !== null) return message;
      return JSON.stringify(body, null, 2);
    } catch {
      try {
        const text = await error.text();
        if (text) return text;
      } catch {
        /* ignore */
      }
      return `HTTP ${error.status} ${error.statusText}`;
    }
  }
  return extractErrorMessage(error);
}

// Narrows a human-readable string out of unknown without an `as` cast.
// Handles two backend shapes:
//   { message: "..." }
//   { message: { errors: ["...", "..."] } }
function readMessage(value: unknown): string | null {
  if (value === null || typeof value !== "object") return null;
  if (!("message" in value)) return null;
  const message = value.message;
  if (typeof message === "string") return message;
  if (
    message !== null &&
    typeof message === "object" &&
    "errors" in message &&
    Array.isArray(message.errors) &&
    message.errors.every((e: unknown) => typeof e === "string")
  ) {
    return message.errors.join(", ");
  }
  return null;
}
