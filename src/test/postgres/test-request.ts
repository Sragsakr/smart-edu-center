/**
 * حالة ترويسات الطلب في الاختبارات.
 *
 * `createPostgresSession` صارت تسجّل بيانات الجهاز، فتحتاج الاختبارات التحكم في
 * الترويسات التي تراها. الافتراضي بلا `user-agent` ولا عنوان، لأن الحالة الغائبة
 * يجب أن تبقى ممثّلة في الاختبارات لا مفترضة.
 */
export const requestState: { userAgent: string | null; ipAddress: string | null } = {
  userAgent: null,
  ipAddress: null,
};

export function resetRequestState(): void {
  requestState.userAgent = null;
  requestState.ipAddress = null;
}

export function setRequestDevice(userAgent: string | null, ipAddress: string | null = null): void {
  requestState.userAgent = userAgent;
  requestState.ipAddress = ipAddress;
}
