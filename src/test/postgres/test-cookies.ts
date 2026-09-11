export const cookieState = { token: undefined as string | undefined };

export function resetCookieState(): void {
  cookieState.token = undefined;
}

export function setSessionCookie(token: string): void {
  cookieState.token = token;
}
