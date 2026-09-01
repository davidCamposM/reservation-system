import { AuthFooter, PasswordResetRequestForm } from "@/components/auth-forms";
import { SectionHeading } from "@/components/section-heading";

export default function PasswordRecoveryPage() {
  return <section className="mx-auto max-w-md"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><SectionHeading eyebrow="Recuperación" title="Restablece tu contraseña" description="Ingresa tu correo y se enviará un enlace seguro si existe una cuenta asociada." /><PasswordResetRequestForm /><AuthFooter register /></div></section>;
}
