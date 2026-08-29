import { SectionHeading } from "@/components/section-heading";
import { AuthFooter, RegistrationForm } from "@/components/auth-forms";

export default function RegisterPage() {
  return <section className="mx-auto max-w-md"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><SectionHeading eyebrow="Nueva cuenta" title="Crea tu cuenta" description="Podrás revisar y gestionar tus reservas desde un solo lugar." /><RegistrationForm /><AuthFooter register /></div></section>;
}
