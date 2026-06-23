/**
 * Sign-in gate (only shown when Supabase is configured). Email + password, with
 * a sign-in / create-account toggle. The brass-on-graphite instrument framing,
 * with the index ring as a quiet hero.
 */
import { useState } from "react";
import { supabase } from "@/data/supabase";
import { WatchDial } from "@/ui/WatchDial";
import { Sigma } from "@/ui/Sigma";
import { Button, Field, Panel } from "@/ui/kit";

export function SignIn() {
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  // Normalize the email the same way Supabase stores it: trimmed + lowercased.
  // Phone keyboards love to auto-capitalize the first letter, which otherwise
  // turns a correct address into an "invalid credentials" error.
  const cleanEmail = email.trim().toLowerCase();

  const submit = async () => {
    if (!supabase || !cleanEmail) return;
    if (mode !== "forgot" && !password) return;
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) setMsg({ tone: "bad", text: error.message });
      } else if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password });
        if (error) setMsg({ tone: "bad", text: error.message });
        else if (!data.session)
          setMsg({ tone: "ok", text: "Account created — check your email to confirm, then sign in." });
      } else {
        // Password reset: email a recovery link that returns to this app and
        // signs you in, so you can set a fresh password from any device.
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: window.location.origin,
        });
        if (error) setMsg({ tone: "bad", text: error.message });
        else setMsg({ tone: "ok", text: "Reset link sent — open it on this device to get back in." });
      }
    } finally {
      setBusy(false);
    }
  };

  const cta = busy ? "…" : mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Send reset link";

  return (
    <div className="flex min-h-screen items-center justify-center bg-ground px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <WatchDial size={188} mode="live" showConstruction showLogo />
        </div>
        <Panel className="p-6">
          <div className="mb-5 flex items-center gap-2.5">
            <Sigma size={20} />
            <div>
              <div className="font-disp text-[13px] font-semibold tracking-brand">ARTYMER</div>
              <div className="font-mono text-[11px] uppercase tracking-wide text-faint">
                {mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Reset password"}
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
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@studio.com"
              mono={false}
              autoCapitalize="none"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
            />
            {mode !== "forgot" && (
              <Field
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                mono={false}
                autoCapitalize="none"
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                spellCheck={false}
              />
            )}
            <Button
              type="submit"
              variant="primary"
              disabled={busy || !cleanEmail || (mode !== "forgot" && !password)}
              className="mt-1 justify-center"
            >
              {cta}
            </Button>
          </form>

          {msg && <p className={"mt-3 font-mono text-[13px] " + (msg.tone === "ok" ? "text-ok" : "text-bad")}>{msg.text}</p>}

          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={() => {
                setMode((m) => (m === "in" ? "up" : "in"));
                setMsg(null);
              }}
              className="text-left font-mono text-[12px] uppercase tracking-label text-faint hover:text-dim"
            >
              {mode === "up" ? "Have an account? Sign in" : "Need an account? Create one"}
            </button>
            <button
              onClick={() => {
                setMode((m) => (m === "forgot" ? "in" : "forgot"));
                setMsg(null);
              }}
              className="text-left font-mono text-[12px] uppercase tracking-label text-faint hover:text-dim"
            >
              {mode === "forgot" ? "Back to sign in" : "Forgot password?"}
            </button>
          </div>
        </Panel>
        <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-wide text-faint">
          one operator · one workshop
        </p>
      </div>
    </div>
  );
}
