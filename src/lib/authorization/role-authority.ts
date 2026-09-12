import type { MemberRole } from "@/lib/authorization/policy";

/**
 * سلطة الدور على الأدوار: أي دور يستطيع هذا الدور أن يمنحه ويديره.
 *
 * مصدر حقيقة واحد كان غائبًا: `assertAssignableRole` كانت تتحقق من أن الدور **قيمة
 * صحيحة**، لا من أن الفاعل **يملك سلطة منحه**. فمرّ مشرف يدعو مشرفًا آخر، وهو ما
 * تنص المصفوفة على منعه: `admin` يدير `teacher/receptionist/accountant` فقط، ولا
 * يرفع مشرفًا آخر لأنه لا يستطيع إدارته لاحقًا.
 *
 * والأثر ليس شكليًا: مشرف مخترَق يستطيع إنشاء مشرفين بلا حد، وكل واحد منهم يملك
 * إلغاء فواتير وتصحيح مدفوعات وإدارة الفريق، ولا يوقفهم إلا المالك.
 *
 * والقاعدة مشتقة من المصفوفة لا مكرّرة عنها، ويحرسها اختبار مطابقة.
 * المرجع: docs/RBAC_MATRIX.md §5 (Memberships / team).
 */

/** أدوار يمكن منحها بدعوة، بترتيب من الأعلى سلطة إلى الأدنى. */
const ASSIGNABLE_ORDER: readonly MemberRole[] = ["admin", "teacher", "receptionist", "accountant"];

/**
 * أعلى دور يستطيع الفاعل منحه.
 *
 * `owner` يمنح كل الأدوار القابلة للتعيين. و`admin` يمنح ما دون `admin` فقط.
 * وبقية الأدوار لا تمنح شيئًا.
 *
 * و`owner` ليس دورًا قابلًا للتعيين أصلًا لأي فاعل، لأنه لا يُمنح بدعوة: له مسار
 * مستقل (`transferTenantOwnership`) لأنه يغيّر من يملك المساحة لا من يعمل فيها.
 */
export function assignableRolesFor(actorRole: MemberRole): readonly MemberRole[] {
  if (actorRole === "owner") return ASSIGNABLE_ORDER;
  if (actorRole === "admin") return ASSIGNABLE_ORDER.filter((role) => role !== "admin");
  return [];
}

/** هل يملك الفاعل سلطة منح هذا الدور أو إدارته؟ */
export function canAssignRole(actorRole: MemberRole, targetRole: MemberRole): boolean {
  return assignableRolesFor(actorRole).includes(targetRole);
}

/** رسالة الرفض العربية، موحّدة حتى لا تختلف بين المواضع. */
export const ROLE_AUTHORITY_MESSAGE = "لا يمكنك منح صلاحية أعلى من صلاحياتك في المساحة";
