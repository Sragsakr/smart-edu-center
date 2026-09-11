import { describe, expect, it } from "vitest";

import { describeDevice } from "./device-label";

/**
 * وصف الجهاز قرار عرض بحت: لا يترتب عليه أي قرار أمني، فتُختبر الحالات كبيانات
 * لا كنسخ من نفس الاختبار. والحالات مأخوذة من `user_agent` حقيقي لا مُختلق، لأن
 * ترتيب القواعد هو المنطق كله هنا، واختبار ترتيب خاطئ يمرّ بسهولة على قيم مصنوعة.
 */

const cases: { name: string; userAgent: string | null; label: string; kind: string }[] = [
  {
    name: "iPhone Safari",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    label: "Safari على iPhone",
    kind: "mobile",
  },
  {
    name: "iPad Safari",
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    label: "Safari على iPad",
    kind: "tablet",
  },
  {
    name: "Android phone Chrome",
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
    label: "Chrome على Android",
    kind: "mobile",
  },
  {
    name: "Android tablet has no Mobile token and must not read as a phone",
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    label: "Chrome على جهاز Android لوحي",
    kind: "tablet",
  },
  {
    name: "Windows desktop Edge",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
    label: "Edge على Windows",
    kind: "desktop",
  },
  {
    name: "macOS Firefox",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:127.0) Gecko/20100101 Firefox/127.0",
    label: "Firefox على macOS",
    kind: "desktop",
  },
  {
    name: "ChromeOS Chrome",
    userAgent:
      "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    label: "Chrome على ChromeOS",
    kind: "desktop",
  },
  {
    name: "Linux desktop without a recognisable browser",
    userAgent: "Mozilla/5.0 (X11; Linux x86_64)",
    label: "Linux",
    kind: "desktop",
  },
  {
    name: "browser-only user agent reports the browser without inventing a platform",
    userAgent: "Chrome/126.0.0.0",
    label: "متصفح Chrome",
    kind: "desktop",
  },
  { name: "missing user agent", userAgent: null, label: "جهاز غير معروف", kind: "unknown" },
  { name: "empty user agent", userAgent: "   ", label: "جهاز غير معروف", kind: "unknown" },
  { name: "unrecognisable user agent", userAgent: "curl/8.4.0", label: "جهاز غير معروف", kind: "unknown" },
];

describe("describeDevice", () => {
  for (const { name, userAgent, label, kind } of cases) {
    it(`reports "${label}" for ${name}`, () => {
      expect(describeDevice(userAgent)).toEqual({ kind, label });
    });
  }

  it("prefers the tablet rule over the generic Linux rule an Android tablet also matches", () => {
    const tablet = describeDevice("Mozilla/5.0 (Linux; Android 13; SM-X700) Chrome/126 Safari/537.36");
    expect(tablet.kind).toBe("tablet");
    expect(tablet.label).not.toContain("Linux");
  });
});
