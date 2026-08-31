"use client";

/**
 * DESCRIPCIÓN: Dependencias para una demostración visual de producto que cambia suavemente.
 * QUÉ HACE: useEffect rota los estados solo en escritorio y useState conserva el paso visible.
 * PARA QUÉ SE UTILIZA: La landing enseña el valor de ReservaPro sin afirmar métricas ni depender de un video pesado.
 */
import { useEffect, useState } from "react";
import { BellRing, CalendarDays, Check, CreditCard, Clock3, Sparkles } from "lucide-react";

type DemoStage = "availability" | "payment" | "reminder";

/** Información visible en el indicador inferior del mockup. */
const stages: Array<{ id: DemoStage; label: string }> = [
  { id: "availability", label: "Agenda" },
  { id: "payment", label: "Pago" },
  { id: "reminder", label: "Recordatorio" },
];

/**
 * DESCRIPCIÓN: Mockup animado del producto ReservaPro.
 * QUÉ HACE: Alterna entre disponibilidad, pago aprobado y recordatorio programado en pantallas grandes.
 * PARA QUÉ SE UTILIZA: Convierte las promesas de la landing en una demostración concreta de la experiencia que ya existe.
 */
export function LandingProductDemo() {
  const [stage, setStage] = useState<DemoStage>("availability");

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 1024px)");

    function startRotation() {
      if (reducedMotion.matches || !desktop.matches) return undefined;
      return window.setInterval(() => {
        setStage((current) => current === "availability" ? "payment" : current === "payment" ? "reminder" : "availability");
      }, 4500);
    }

    let timer = startRotation();
    function restart() {
      if (timer) window.clearInterval(timer);
      timer = startRotation();
    }

    desktop.addEventListener("change", restart);
    reducedMotion.addEventListener("change", restart);
    return () => {
      if (timer) window.clearInterval(timer);
      desktop.removeEventListener("change", restart);
      reducedMotion.removeEventListener("change", restart);
    };
  }, []);

  return (
    <div className="landing-float relative mx-auto w-full max-w-md" aria-label="Demostración de ReservaPro">
      {/*
        La tarjeta principal es la única superficie visual del mockup. Antes se
        dibujaba una tarjeta translúcida inclinada detrás, que creaba bordes
        duplicados sobre la fotografía del Hero y restaba claridad al producto.
      */}
      <div className="relative overflow-hidden rounded-[1.8rem] border border-white/15 bg-ink p-4 shadow-float sm:p-5">
        <div className="flex items-center justify-between px-1 py-1 text-sm text-slate-300"><span className="font-bold text-white">ReservaPro</span><span className="ui-status-success bg-brand-soft text-brand-deep"><span className="h-1.5 w-1.5 rounded-full bg-brand" /> En línea</span></div>

        <div className="relative mt-4 min-h-[292px] rounded-2xl bg-white p-5 text-ink shadow-lg" aria-live="polite">
          {stage === "availability" && <AvailabilityStage key="availability" />}
          {stage === "payment" && <PaymentStage key="payment" />}
          {stage === "reminder" && <ReminderStage key="reminder" />}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">{stages.map((item) => <div key={item.id} className="space-y-1.5"><div className={`h-1.5 rounded-full transition ${stage === item.id ? "bg-teal-300" : "bg-slate-700"}`} /><p className={`text-center text-[10px] font-bold ${stage === item.id ? "text-teal-200" : "text-slate-500"}`}>{item.label}</p></div>)}</div>
      </div>
    </div>
  );
}

/** Estado que demuestra la elección de una hora disponible. */
function AvailabilityStage() {
  return <div className="landing-reveal"><div className="flex items-start justify-between"><div><p className="text-xs font-extrabold tracking-[.12em] text-brand">MARTES · 12 NOV</p><h2 className="mt-2 text-xl font-extrabold tracking-tight">Elige tu horario</h2><p className="mt-1 text-sm text-semantic-muted">Sesión personalizada · 60 min</p></div><span className="ui-icon h-10 w-10"><CalendarDays size={19} /></span></div><div className="mt-6 grid grid-cols-3 gap-2">{["10:00", "11:30", "16:30", "17:00", "17:30", "18:00"].map((time) => <span key={time} className={`rounded-lg border px-2 py-2 text-center text-xs font-bold ${time === "16:30" ? "border-brand bg-brand text-white" : "border-slate-200 text-slate-600"}`}>{time}</span>)}</div><div className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-semibold text-semantic-muted"><Clock3 size={15} className="text-brand" /> Disponibilidad actualizada en tiempo real</div></div>;
}

/** Estado que demuestra confirmación de cobro. */
function PaymentStage() {
  return <div className="landing-reveal"><div className="flex items-start justify-between"><div><p className="text-xs font-extrabold tracking-[.12em] text-brand">PAGO WEBPAY</p><h2 className="mt-2 text-xl font-extrabold tracking-tight">Reserva confirmada</h2><p className="mt-1 text-sm text-semantic-muted">Sesión personalizada · Camila Torres</p></div><span className="ui-icon h-10 w-10"><CreditCard size={19} /></span></div><div className="mt-6 rounded-xl border border-brand/15 bg-brand-soft p-4"><div className="flex items-center gap-2 text-sm font-extrabold text-brand-deep"><span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-white"><Check size={15} strokeWidth={3} /></span> Pago aprobado</div><div className="mt-4 flex items-center justify-between border-t border-brand/10 pt-3 text-sm"><span className="font-semibold text-semantic-muted">Total pagado</span><strong className="text-ink">$35.000</strong></div></div><p className="mt-5 text-xs font-semibold text-semantic-muted">La hora queda protegida y lista para atender.</p></div>;
}

/** Estado que demuestra el recordatorio programado de una reserva confirmada. */
function ReminderStage() {
  return <div className="landing-reveal"><div className="flex items-start justify-between"><div><p className="text-xs font-extrabold tracking-[.12em] text-brand">PRÓXIMA ATENCIÓN</p><h2 className="mt-2 text-xl font-extrabold tracking-tight">Todo listo para mañana</h2><p className="mt-1 text-sm text-semantic-muted">Miércoles · 16:30 · 60 min</p></div><span className="ui-icon h-10 w-10"><BellRing size={19} /></span></div><div className="mt-6 rounded-xl bg-ink p-4 text-white"><div className="flex items-center gap-2 text-sm font-extrabold"><Sparkles size={16} className="text-accent-lime" /> Recordatorio programado</div><p className="mt-2 text-xs leading-5 text-slate-300">Se enviará un correo 24 horas antes de la atención.</p></div><div className="mt-5 flex items-center gap-2 text-xs font-semibold text-semantic-muted"><Check size={16} className="text-semantic-success" /> Cliente informado, agenda actualizada.</div></div>;
}
