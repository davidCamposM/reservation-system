import { SectionHeading } from "@/components/section-heading";
import { AuthFooter, RegistrationForm } from "@/components/auth-forms";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  return <section className="mx-auto max-w-md"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><SectionHeading eyebrow="Nueva cuenta" title="Crea tu cuenta" description="Podrás revisar y gestionar tus reservas desde un solo lugar." /><RegistrationForm callbackUrl={callbackUrl} /><AuthFooter register callbackUrl={callbackUrl} /></div></section>;
}
