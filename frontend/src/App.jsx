import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import { LanguageProvider } from "./components/LanguageContext";

import Dashboard from "./pages/Dashboard";
import Farmers from "./pages/Farmers";
import Crops from "./pages/Crops";
import Centers from "./pages/Centers";
import Procurements from "./pages/Procurements";
import Payments from "./pages/Payments";
import LiveQueue from "./pages/LiveQueue";
import LiveMap from "./pages/LiveMap";
import ConsumerOrders from "./pages/ConsumerOrders";
import SupplyChain from "./pages/SupplyChain";

import Login from "./pages/Login";
import FarmerDashboard from "./pages/FarmerDashboard";
import ConsumerDashboard from "./pages/ConsumerDashboard";

function AdminLayout() {
  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Header />

        <Routes>
          <Route path="/" element={<Dashboard />} />

          <Route path="/farmers" element={<Farmers />} />

          <Route path="/crops" element={<Crops />} />

          <Route path="/centers" element={<Centers />} />

          <Route path="/procurements" element={<Procurements />} />

          <Route
            path="/consumer-orders"
            element={<ConsumerOrders />}
          />

          <Route
            path="/supply-chain"
            element={<SupplyChain />}
          />

          <Route path="/payments" element={<Payments />} />

          <Route path="/live-queue" element={<LiveQueue />} />

          <Route path="/live-map" element={<LiveMap />} />

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>

          {/* Public Login */}
          <Route
            path="/login"
            element={<Login />}
          />

          {/* Farmer Portal */}
          <Route
            path="/farmer"
            element={
              <ProtectedRoute allowedRoles={["FARMER"]}>
                <FarmerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Consumer Portal */}
          <Route
            path="/consumer"
            element={
              <ProtectedRoute allowedRoles={["CONSUMER"]}>
                <ConsumerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin Portal */}
          <Route
            path="/*"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          />

        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;