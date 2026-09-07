# IAM-004 — Membership Invitation Email

## Current delivery

The first delivery channel is Supabase Auth via `admin.auth.admin.inviteUserByEmail`. The invitation action sets `redirectTo` to the generated `/invite?token=...` URL. The database stores only the SHA-256 token hash; the raw token exists only in the delivered/copied link.

For an email address that already belongs to a Supabase Auth user, Supabase may reject a second Auth invitation as an already-registered user. In that case the Team UI exposes the newly rotated invitation URL for the manager to copy and send manually. Resend (or another transactional provider) is the planned generic delivery channel for existing users later.

## Supabase invite template copy

**Subject**

دعوة للانضمام إلى فريق Smart Edu

**Body**

مرحبًا،

تمت دعوتك للانضمام إلى فريق على Smart Edu. اضغط على زر قبول الدعوة أدناه باستخدام نفس البريد الإلكتروني الذي استلم هذه الرسالة.

`قبول الدعوة: {{ .ConfirmationURL }}`

الدعوة لها مدة صلاحية محدودة، ويمكن لمدير مساحة العمل إلغاؤها أو إعادة إصدارها في أي وقت. إذا لم تكن تتوقع هذه الدعوة فتجاهل الرسالة.

## Security contract

- Never include the token hash in email or UI.
- Never persist the raw token in the database.
- Resend rotates the raw token and invalidates the previous URL.
- Acceptance requires an authenticated user whose JWT email exactly matches `invitee_email`.
- Acceptance, membership upsert and audit write happen inside one database transaction.
