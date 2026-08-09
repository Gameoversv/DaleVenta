/**
 * The message the API sent, or a fallback when it sent nothing usable.
 *
 * Axios rejects with an error whose useful part is buried under `response.data.error`, and a
 * network failure has no response at all. Every caller was unwrapping that by hand, which is how
 * a screen ends up showing "[object Object]" the one time the shape is not what it expected.
 */
export function apiErrorMessage(err: unknown, fallback = "Error"): string {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}
