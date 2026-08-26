import { SectionHeading } from "@/components/section-heading";
import { AuthFooter, LoginForm } from "@/components/auth-forms";

export default function LoginPage() {
  return <section className="mx-auto max-w-md"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><SectionHeading eyebrow="Acceso" title="Bienvenido de vuelta" description="Ingresa para revisar o gestionar tus reservas." /><LoginForm /><AuthFooter /></div></section>;
}
