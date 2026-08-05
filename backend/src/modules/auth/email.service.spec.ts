import { ConfigService } from "@nestjs/config";
import { EmailService } from "./email.service";

const mockSend = jest.fn();

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

function makeConfig(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe("EmailService", () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it("falls back to console logging when RESEND_API_KEY is unset (no network call attempted)", async () => {
    const service = new EmailService(makeConfig({}));
    await service.sendVerificationEmail("dev@example.com", "https://devtoolbox.dev/verify-email?token=abc");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends via Resend when RESEND_API_KEY is set", async () => {
    mockSend.mockResolvedValue({ data: { id: "email_123" }, error: null });
    const service = new EmailService(makeConfig({ RESEND_API_KEY: "re_test_key" }));

    await service.sendPasswordResetEmail("dev@example.com", "https://devtoolbox.dev/reset-password?token=xyz");

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "dev@example.com",
        subject: "Reset your DevToolbox password",
      }),
    );
  });

  it("does not throw when Resend returns an error (email failure shouldn't fail the request)", async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: "invalid recipient" } });
    const service = new EmailService(makeConfig({ RESEND_API_KEY: "re_test_key" }));

    await expect(
      service.sendVerificationEmail("bad@example.com", "https://devtoolbox.dev/verify-email?token=abc"),
    ).resolves.toBeUndefined();
  });

  it("uses EMAIL_FROM when configured, otherwise a default", async () => {
    mockSend.mockResolvedValue({ data: { id: "email_123" }, error: null });
    const service = new EmailService(
      makeConfig({ RESEND_API_KEY: "re_test_key", EMAIL_FROM: "Custom <hi@example.com>" }),
    );

    await service.sendVerificationEmail("dev@example.com", "https://devtoolbox.dev/verify-email?token=abc");

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ from: "Custom <hi@example.com>" }));
  });
});
