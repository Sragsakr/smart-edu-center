import { describe, expect, it } from "vitest";
import { signUpErrorMessage } from "./auth-error-message";

describe("sign-up error messages", () => {
  it.each([
    ["over_email_send_rate_limit", "انتظر قليلًا"],
    ["email_address_not_authorized", "لا تسمح بالإرسال"],
    ["weak_password", "أقوى"],
    ["signup_disabled", "متوقف مؤقتًا"],
  ])("explains the actionable %s failure", (errorCode, expectedText) => {
    expect(signUpErrorMessage(errorCode)).toContain(expectedText);
  });

  it("keeps unknown provider failures generic", () => {
    expect(signUpErrorMessage("unexpected_failure")).not.toContain("unexpected_failure");
  });
});
