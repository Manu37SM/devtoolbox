import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { AiGatewayService } from "./ai-gateway.service";

const mockCreate = jest.fn();

jest.mock("@anthropic-ai/sdk", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
  };
});

function textResponse(text: string, usage = { input_tokens: 10, output_tokens: 5 }) {
  return { content: [{ type: "text", text }], usage };
}

function makeConfig(overrides: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = {
    AI_MODEL_HAIKU: "claude-haiku-4-5",
    AI_MODEL_SONNET: "claude-sonnet-4-5",
    ANTHROPIC_API_KEY: "test-key",
    ...overrides,
  };
  return {
    get: jest.fn((key: string) => values[key]),
    getOrThrow: jest.fn((key: string) => {
      const v = values[key];
      if (v === undefined) throw new Error(`Missing config: ${key}`);
      return v;
    }),
  };
}

function makePrisma() {
  return {
    aiUsageEvent: {
      create: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(3),
    },
    user: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "user-1", plan: "FREE" }),
    },
  };
}

describe("AiGatewayService", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("explain() calls the haiku model and records usage", async () => {
    mockCreate.mockResolvedValue(textResponse("Matches one or more digits."));
    const prisma = makePrisma();
    const service = new AiGatewayService(prisma as never, makeConfig() as never);

    const result = await service.explain({ toolSlug: "regex-tester", subject: "regex", input: "\\d+" }, "user-1");

    expect(result.explanation).toBe("Matches one or more digits.");
    expect(result.model).toBe("claude-haiku-4-5");
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: "claude-haiku-4-5" }));
    expect(prisma.aiUsageEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user-1", inputTokens: 10, outputTokens: 5 }) }),
    );
  });

  it("explain() works anonymously (no userId) and stores a null userId on the usage event", async () => {
    mockCreate.mockResolvedValue(textResponse("Explanation."));
    const prisma = makePrisma();
    const service = new AiGatewayService(prisma as never, makeConfig() as never);

    await service.explain({ toolSlug: "regex-tester", subject: "regex", input: "\\d+" }, undefined);

    expect(prisma.aiUsageEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: null }) }),
    );
  });

  it("generate() parses RESULT/EXPLANATION and validates a cron result", async () => {
    mockCreate.mockResolvedValue(textResponse("RESULT: 0 9 * * 1-5\nEXPLANATION: Runs weekdays at 9am."));
    const service = new AiGatewayService(makePrisma() as never, makeConfig() as never);

    const result = await service.generate({ target: "cron", prompt: "every weekday at 9am" }, "user-1");

    expect(result.result).toBe("0 9 * * 1-5");
    expect(result.explanation).toBe("Runs weekdays at 9am.");
    expect(result.validated).toBe(true);
  });

  it("generate() flags an invalid cron result as unvalidated", async () => {
    mockCreate.mockResolvedValue(textResponse("RESULT: not a cron\nEXPLANATION: oops"));
    const service = new AiGatewayService(makePrisma() as never, makeConfig() as never);

    const result = await service.generate({ target: "cron", prompt: "every weekday at 9am" }, "user-1");

    expect(result.validated).toBe(false);
    expect(result.validationNote).toBeDefined();
  });

  it("generate() validates a regex result against provided examples", async () => {
    mockCreate.mockResolvedValue(textResponse("RESULT: ^\\d{3}-\\d{4}$\nEXPLANATION: Matches a phone extension."));
    const service = new AiGatewayService(makePrisma() as never, makeConfig() as never);

    const result = await service.generate(
      { target: "regex", prompt: "a phone extension", examples: ["555-1234"] },
      "user-1",
    );

    expect(result.validated).toBe(true);
  });

  it("diffSummary() routes to the sonnet model", async () => {
    mockCreate.mockResolvedValue(textResponse("The 'name' field was renamed to 'fullName'."));
    const service = new AiGatewayService(makePrisma() as never, makeConfig() as never);

    const result = await service.diffSummary({ before: '{"name":"a"}', after: '{"fullName":"a"}', format: "json" }, "user-1");

    expect(result.model).toBe("claude-sonnet-4-5");
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: "claude-sonnet-4-5" }));
  });

  it("jsonRepair() resolves deterministically without ever calling the model", async () => {
    const service = new AiGatewayService(makePrisma() as never, makeConfig() as never);

    const result = await service.jsonRepair({ input: '{"a":1,"b":2,}' }, "user-1");

    expect(result.repairedBy).toBe("deterministic");
    expect(JSON.parse(result.repaired)).toEqual({ a: 1, b: 2 });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("jsonRepair() falls back to the model when deterministic repair fails, stripping a code fence", async () => {
    mockCreate.mockResolvedValue(textResponse('```json\n{"a": 1}\n```'));
    const prisma = makePrisma();
    const service = new AiGatewayService(prisma as never, makeConfig() as never);

    const result = await service.jsonRepair({ input: '{"a": 1, "b": [1, 2' }, "user-1");

    expect(result.repairedBy).toBe("ai");
    expect(result.repaired).toBe('{"a": 1}');
    expect(prisma.aiUsageEvent.create).toHaveBeenCalled();
  });

  it("jsonRepair() throws if even the AI fallback doesn't produce valid JSON", async () => {
    mockCreate.mockResolvedValue(textResponse("I can't help with that."));
    const service = new AiGatewayService(makePrisma() as never, makeConfig() as never);

    await expect(service.jsonRepair({ input: '{"a": 1, "b": [1, 2' }, "user-1")).rejects.toThrow(BadRequestException);
  });

  it("throws ServiceUnavailableException when no Anthropic API key is configured and a real call is needed", async () => {
    const service = new AiGatewayService(makePrisma() as never, makeConfig({ ANTHROPIC_API_KEY: undefined }) as never);

    await expect(service.explain({ toolSlug: "x", subject: "regex", input: "a" }, "user-1")).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it("getUsage() returns the request count and quota for the user's plan", async () => {
    const prisma = makePrisma();
    const service = new AiGatewayService(prisma as never, makeConfig() as never);

    const usage = await service.getUsage("user-1");

    expect(usage).toEqual({
      plan: "FREE",
      periodStart: expect.any(String),
      requestCount: 3,
      quota: 60,
    });
  });
});
