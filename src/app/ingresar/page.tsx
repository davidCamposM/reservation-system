import { SectionHeading } from "@/components/section-heading";
import { AuthFooter, LoginForm } from "@/components/auth-forms";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  return <section className="mx-auto max-w-md"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><SectionHeading eyebrow="Acceso" title="Bienvenido de vuelta" description="Ingresa para revisar o gestionar tus reservas." /><LoginForm callbackUrl={callbackUrl} /><AuthFooter callbackUrl={callbackUrl} /></div></section>;
}
