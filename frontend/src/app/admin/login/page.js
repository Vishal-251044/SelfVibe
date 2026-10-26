/**
 * /admin/login: staff now use the normal login (one login for app and
 * console, Owner decision). src/proxy.js already forwards visitors; this
 * redirect covers anything that reaches the page directly.
 */
import { redirect } from "next/navigation";

export default function AdminLoginPage() {
  redirect("/login?next=%2Fadmin");
}
