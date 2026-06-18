import { Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "./app/Shell";
import { Deck } from "./features/Deck";
import { Pipeline } from "./features/Pipeline";
import { Projects } from "./features/Projects";
import { ProjectDetail } from "./features/project/ProjectDetail";
import { Clients } from "./features/Clients";
import { ClientDetail } from "./features/ClientDetail";
import { Suppliers } from "./features/Suppliers";
import { Money } from "./features/Money";
import { Assistant } from "./features/Assistant";
import { Settings } from "./features/Settings";

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Deck />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="money" element={<Money />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
