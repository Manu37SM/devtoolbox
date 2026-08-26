import { BadRequestException } from "@nestjs/common";
import type { ArgumentsHost } from "@nestjs/common";
import { GlobalExceptionFilter } from "./global-exception.filter";

const mockCaptureException = jest.fn();
const mockWithScope = jest.fn((cb: (scope: unknown) => void) =>
  cb({ setTags: jest.fn(), setFingerprint: jest.fn() }),
);
jest.mock("@sentry/node", () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  withScope: (...args: [(scope: unknown) => void]) => mockWithScope(...args),
}));

function makeHost(overrides: Partial<{ method: string; path: string }> = {}) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const request = { method: overrides.method ?? "GET", path: overrides.path ?? "/v1/whatever", route: undefined };
  const response = { status };
  return {
    host: {
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
    } as unknown as ArgumentsHost,
    status,
    json,
  };
}

describe("GlobalExceptionFilter", () => {
  beforeEach(() => jest.clearAllMocks());

  it("does not report a 4xx HttpException to Sentry", () => {
    const filter = new GlobalExceptionFilter();
    const { host, status } = makeHost();
    filter.catch(new BadRequestException("bad input"), host);

    expect(mockCaptureException).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(400);
  });

  it("reports an unhandled (500) error to Sentry with no request body attached", () => {
    const filter = new GlobalExceptionFilter();
    const { host, status, json } = makeHost();
    const err = new Error("boom");
    filter.catch(err, host);

    expect(mockCaptureException).toHaveBeenCalledWith(err);
    expect(status).toHaveBeenCalledWith(500);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ message: "Something went wrong. Please try again." }) }),
    );
  });
});
