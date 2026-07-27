import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AxiosRequestConfig } from "axios";

/**
 * The interceptors decide when the token is attached and when a session is torn down, so they are
 * exercised directly instead of through a mocked network layer.
 */
type RequestInterceptor = (config: AxiosRequestConfig & { headers: Record<string, unknown> }) =>
  AxiosRequestConfig & { headers: Record<string, unknown> };
type ResponseErrorInterceptor = (error: unknown) => Promise<unknown>;

const requestInterceptors: RequestInterceptor[] = [];
const responseErrorInterceptors: ResponseErrorInterceptor[] = [];

vi.mock("axios", () => ({
  default: {
    create: () => ({
      interceptors: {
        request: { use: (fn: RequestInterceptor) => requestInterceptors.push(fn) },
        response: {
          use: (_ok: unknown, onError: ResponseErrorInterceptor) => responseErrorInterceptors.push(onError),
        },
      },
    }),
  },
}));

async function loadApi() {
  requestInterceptors.length = 0;
  responseErrorInterceptors.length = 0;
  vi.resetModules();
  await import("./api");
}

function applyRequest(config: Record<string, unknown> = {}) {
  return requestInterceptors[0]({ headers: {}, ...config } as never);
}

function applyResponseError(error: unknown) {
  return responseErrorInterceptors[0](error);
}

describe("api client interceptors", () => {
  const originalLocation = window.location;

  beforeEach(async () => {
    localStorage.clear();
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { href: "/dashboard" },
    });
    await loadApi();
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  });

  it("attaches the stored token as a bearer credential", () => {
    localStorage.setItem("token", "jwt-abc");

    const config = applyRequest();

    expect(config.headers.Authorization).toBe("Bearer jwt-abc");
  });

  it("sends no Authorization header when there is no token", () => {
    const config = applyRequest();

    expect(config.headers.Authorization).toBeUndefined();
  });

  it("clears the session and redirects on a 401 from a normal endpoint", async () => {
    localStorage.setItem("token", "jwt-abc");

    await expect(
      applyResponseError({ response: { status: 401 }, config: { url: "/api/products" } })
    ).rejects.toBeTruthy();

    expect(localStorage.getItem("token")).toBeNull();
    expect(window.location.href).toBe("/login?expired=1");
  });

  it("leaves the session alone on a 401 from an auth endpoint, so a wrong password does not redirect", async () => {
    localStorage.setItem("token", "jwt-abc");

    await expect(
      applyResponseError({ response: { status: 401 }, config: { url: "/api/auth/login" } })
    ).rejects.toBeTruthy();

    expect(localStorage.getItem("token")).toBe("jwt-abc");
    expect(window.location.href).toBe("/dashboard");
  });

  it("keeps the session on a 403, which means missing permission rather than an expired token", async () => {
    localStorage.setItem("token", "jwt-abc");

    await expect(
      applyResponseError({ response: { status: 403 }, config: { url: "/api/reports/sales" } })
    ).rejects.toBeTruthy();

    expect(localStorage.getItem("token")).toBe("jwt-abc");
    expect(window.location.href).toBe("/dashboard");
  });

  it("rejects network errors without a response untouched", async () => {
    localStorage.setItem("token", "jwt-abc");

    await expect(applyResponseError({ message: "Network Error" })).rejects.toBeTruthy();

    expect(localStorage.getItem("token")).toBe("jwt-abc");
  });
});
