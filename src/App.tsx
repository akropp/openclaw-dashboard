import { Routes, Route } from "react-router-dom";
import { useGatewayConfig } from "./api/hooks";
import { Layout } from "./components/Layout";
import { ConnectScreen } from "./components/ConnectScreen";
import Overview from "./pages/Overview";
import Agents from "./pages/Agents";
import Sessions from "./pages/Sessions";
import Swarm from "./pages/Swarm";
import Usage from "./pages/Usage";
import CronJobs from "./pages/CronJobs";
import Models from "./pages/Models";
import Logs from "./pages/Logs";

export function App() {
  const { config } = useGatewayConfig();

  if (!config) {
    return <ConnectScreen />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="agents" element={<Agents />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="swarm" element={<Swarm />} />
        <Route path="usage" element={<Usage />} />
        <Route path="cron" element={<CronJobs />} />
        <Route path="models" element={<Models />} />
        <Route path="logs" element={<Logs />} />
      </Route>
    </Routes>
  );
}
