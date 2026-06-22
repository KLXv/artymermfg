import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Intro } from "./app/Intro";
import { Shell } from "./app/Shell";
import { SignIn } from "./app/SignIn";
import { Deck } from "./features/Deck";
import { Pipeline } from "./features/Pipeline";
import { Projects } from "./features/Projects";
import { ProjectDetail } from "./features/project/ProjectDetail";
import { Clients } from "./features/Clients";
import { ClientDetail } from "./features/ClientDetail";
import { Suppliers } from "./features/Suppliers";
import { Tasks } from "./features/Tasks";
import { Money } from "./features/Money";
import { Invoices } from "./features/Invoices";
import { Marketing } from "./features/Marketing";
import { Assistant } from "./features/Assistant";
import { Guide } from "./features/Guide";
import { Settings } from "./features/Settings";
import { ShareDossier } from "./features/ShareDossier";
import { Collection } from "./features/Collection";
import { isSupabaseConfigured } from "./data/supabase";
import { useAuth } from "./state/useAuth";
import { SyncProvider } from "./state/sync";
import { Sigma } from "./ui/Sigma";

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ground">
      <Sigma size={28} />
    </div>
  );
}

function Cockpit() {
  const { user, ready } = useAuth();
  if (!ready) return <Splash />;
  if (isSupabaseConfigured() && !user) return <SignIn />;
  return (
    <SyncProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Deck />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="money" element={<Money />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="marketing" element={<Marketing />} />
          <Route path="assistant" element={<Assistant />} />
          <Route path="guide" element={<Guide />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </SyncProvider>
  );
}

export default function App() {
  // Cinematic intro: once per session, never on the public share page, and not
  // when the visitor prefers reduced motion.
  const [intro, setIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    const isShare = /^\/(share|collection)/.test(window.location.pathname);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = sessionStorage.getItem("artymer:intro");
    return !isShare && !reduce && !seen;
  });

  return (
    <>
      {intro && (
        <Intro
          onDone={() => {
            sessionStorage.setItem("artymer:intro", "1");
            setIntro(false);
          }}
        />
      )}
      <Routes>
        {/* Public, read-only dossier — no auth, no shell. */}
        <Route path="/share" element={<ShareDossier />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/*" element={<Cockpit />} />
      </Routes>
    </>
  );
}
