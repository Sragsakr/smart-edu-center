import { describe, expect, it } from "vitest";
import {
  authSubmissionSchema,
  rejectionReasonSchema,
  workspaceRequestSchema,
} from "./validation";

const validWorkspaceRequest = {
  tenantType: "center",
  requestedProductLevel: "operations",
  name: "سنتر التفوق",
  slug: "al-tafawoq",
  mobilePhone: "+201001234567",
  whatsappPhone: "+201009876543",
};

describe("account input validation", () => {
  it("normalizes email and preserves a valid password", () => {
    expect(
      authSubmissionSchema.parse({
        email: "  OWNER@Example.COM ",
        password: "correct horse battery staple",
        intent: "sign-in",
      }),
    ).toEqual({
      email: "owner@example.com",
      password: "correct horse battery staple",
      intent: "sign-in",
    });
  });

  it("rejects an unknown authentication intent", () => {
    expect(
      authSubmissionSchema.safeParse({
        email: "owner@example.com",
        password: "correct horse battery staple",
        intent: "activate-admin",
      }).success,
    ).toBe(false);
  });

  it.each([
    {
      scenario: "unsupported customer type",
      request: { ...validWorkspaceRequest, tenantType: "student" },
    },
    {
      scenario: "unsupported product level",
      request: { ...validWorkspaceRequest, requestedProductLevel: "enterprise" },
    },
    {
      scenario: "malformed slug",
      request: { ...validWorkspaceRequest, slug: "Arabic Slug" },
    },
    {
      scenario: "mobile number without country code",
      request: { ...validWorkspaceRequest, mobilePhone: "01001234567" },
    },
    {
      scenario: "WhatsApp number without country code",
      request: { ...validWorkspaceRequest, whatsappPhone: "01009876543" },
    },
  ])("rejects $scenario", ({ request }) => {
    expect(workspaceRequestSchema.safeParse(request).success).toBe(false);
  });

  it("normalizes a valid workspace request", () => {
    expect(
      workspaceRequestSchema.parse({
        tenantType: "teacher",
        requestedProductLevel: "learning_platform",
        name: "  سنتر التفوق  ",
        slug: "  AL-TAFAWOQ  ",
        mobilePhone: "  +201001234567  ",
        whatsappPhone: "  +201009876543  ",
      }),
    ).toEqual({
      tenantType: "teacher",
      requestedProductLevel: "learning_platform",
      name: "سنتر التفوق",
      slug: "al-tafawoq",
      mobilePhone: "+201001234567",
      whatsappPhone: "+201009876543",
    });
  });

  it("rejects a non-actionable rejection reason", () => {
    expect(rejectionReasonSchema.safeParse("لا").success).toBe(false);
  });

  it("normalizes a valid rejection reason", () => {
    expect(rejectionReasonSchema.parse("  بيانات النشاط غير مكتملة  ")).toBe(
      "بيانات النشاط غير مكتملة",
    );
  });
});
