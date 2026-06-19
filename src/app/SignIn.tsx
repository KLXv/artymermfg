/**
 * Sign-in gate (only shown when Supabase is configured). Email + password, with
 * a sign-in / create-account toggle. The brass-on-graphite instrument framing,
 * with the index ring as a quiet hero.
 */
import { useState } from "react";
import { supabase } from "@/data/supabase";
import { STAGES } from "@/domain";
import { IndexRing } from "@/ui/IndexRing";
import { Sigma } from "@/ui/Sigma";
import { Button, Field, Panel } from "@/ui/kit";

export function SignIn() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const submit = async () => {
    if (!supabase || !email.trim() || !password) return;
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setMsg({ tone: "bad", text: error.message });
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) setMsg({ tone: "bad", text: error.message });
        else if (!data.session)
          setMsg({ tone: "ok", text: "Account created — check your email to confirm, then sign in." });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ground px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <IndexRing stages={STAGES} current={2} size={120} centerKicker="Artymer" centerLabel="Cockpit" />
        </div>
        <Panel className="p-6">
          <div className="mb-5 flex items-center gap-2.5">
            <Sigma size={20} />
            <div>
              <div className="font-disp text-[13px] font-semibold tracking-brand">ARTYMER</div>
              <div className="font-mono text-[11px] uppercase tracking-wide text-faint">
                {mode === "in" ? "Sign in" : "Create account"}
              </div>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex flex-col gap-3"
          >
            <Field label="Email" type="text" value={email} onChange={setEmail} placeholder="you@studio.com" mono={false} />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" mono={false} />
            <Button type="submit" variant="primary" disabled={busy || !email.trim() || !password} className="mt-1 justify-center">
              {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
            </Button>
          </form>

          {msg && <p className={"mt-3 font-mono text-[13px] " + (msg.tone === "ok" ? "text-ok" : "text-bad")}>{msg.text}</p>}

          <button
            onClick={() => {
              setMode((m) => (m === "in" ? "up" : "in"));
              setMsg(null);
            }}
            className="mt-4 font-mono text-[12px] uppercase tracking-label text-faint hover:text-dim"
          >
            {mode === "in" ? "Need an account? Create one" : "Have an account? Sign in"}
          </button>
        </Panel>
        <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-wide text-faint">
          one operator · one workshop
        </p>
      </div>
    </div>
  );
}
