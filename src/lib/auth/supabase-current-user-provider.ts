import "server-only";

import type { CurrentUserProvider } from "@/lib/auth/current-user-provider";
import { createClient } from "@/lib/supabase/server";

export class SupabaseCurrentUserProvider implements CurrentUserProvider {
  async getCurrentUser() {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw new Error("current user lookup failed");
    if (!user) return null;

    return {
      id: user.id,
      email: user.email ?? "",
    };
  }
}
