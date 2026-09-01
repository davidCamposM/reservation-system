import { AuthFooter, NewPasswordForm } from "@/components/auth-forms";
import { SectionHeading } from "@/components/section-heading";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <section className="mx-auto max-w-md"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><SectionHeading eyebrow="Nueva contraseña" title="Crea una contraseña nueva" description="El enlace es personal, vence en 30 minutos y solo puede usarse una vez." /><NewPasswordForm token={token} /><AuthFooter register /></div></section>;
}
