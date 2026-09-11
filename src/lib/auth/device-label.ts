/**
 * وصف الجهاز من `user_agent`.
 *
 * دالة نقية بلا اعتماد على الخادم أو قاعدة البيانات، لأن التسمية قرار عرض بحت:
 * تُختبر بمعزل، ولا يترتب عليها أي قرار أمني. القرار الأمني في `account-sessions.ts`.
 */

export type DeviceKind = "mobile" | "tablet" | "desktop" | "unknown";

export type DeviceDescription = {
  kind: DeviceKind;
  label: string;
};

const UNKNOWN_DEVICE: DeviceDescription = { kind: "unknown", label: "جهاز غير معروف" };

/**
 * المنصّات مرتّبة من الأخصّ إلى الأعمّ، فالترتيب هو المنطق لا تفصيلًا في الكتابة.
 *
 * قاعدتان تعتمدان على الترتيب وحده:
 * - `Android` بلا `Mobile` يعني جهازًا لوحيًا في الترميز الشائع، فقاعدته تسبق قاعدة
 *   Android العامة، وإلا صُنّف التابلت هاتفًا.
 * - `Android` يحمل كلمة `Linux` في وصفه، فقاعدته تسبق قاعدة Linux العامة.
 */
const PLATFORMS: readonly { match: RegExp; name: string; kind: DeviceKind }[] = [
  { match: /iPad/i, name: "iPad", kind: "tablet" },
  { match: /Tablet|PlayBook|Silk/i, name: "جهاز لوحي", kind: "tablet" },
  { match: /Android(?!.*Mobile)/i, name: "جهاز Android لوحي", kind: "tablet" },
  { match: /iPhone/i, name: "iPhone", kind: "mobile" },
  { match: /iPod/i, name: "iPod", kind: "mobile" },
  { match: /Android/i, name: "Android", kind: "mobile" },
  { match: /Windows Phone/i, name: "Windows Phone", kind: "mobile" },
  { match: /Macintosh|Mac OS X/i, name: "macOS", kind: "desktop" },
  { match: /CrOS/i, name: "ChromeOS", kind: "desktop" },
  { match: /Windows/i, name: "Windows", kind: "desktop" },
  { match: /Linux|X11/i, name: "Linux", kind: "desktop" },
];

const BROWSERS: readonly { match: RegExp; name: string }[] = [
  { match: /Edg[A-Z]?\//i, name: "Edge" },
  { match: /OPR\/|Opera/i, name: "Opera" },
  { match: /Firefox\/|FxiOS/i, name: "Firefox" },
  { match: /Chrome\/|CriOS/i, name: "Chrome" },
  { match: /Safari\//i, name: "Safari" },
];

/** يشتق وصفًا مقروءًا للجهاز، أو وصفًا محايدًا إن تعذّر التعرف عليه. */
export function describeDevice(userAgent: string | null): DeviceDescription {
  if (!userAgent?.trim()) return UNKNOWN_DEVICE;

  const platform = PLATFORMS.find((candidate) => candidate.match.test(userAgent));
  const browser = BROWSERS.find((candidate) => candidate.match.test(userAgent));

  if (!platform && !browser) return UNKNOWN_DEVICE;
  if (!platform) return { kind: "desktop", label: `متصفح ${browser?.name}` };
  if (!browser) return { kind: platform.kind, label: platform.name };

  return { kind: platform.kind, label: `${browser.name} على ${platform.name}` };
}
