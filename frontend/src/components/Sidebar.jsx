import {
  LayoutDashboard,
  Users,
  Wheat,
  Building2,
  ClipboardList,
  CreditCard,
  ListOrdered,
  MapPinned,
  ShoppingCart,
  Truck,
} from "lucide-react";

import { NavLink } from "react-router-dom";
import { useLanguage } from "./LanguageContext";

function Sidebar() {
  const { t } = useLanguage();

  const menuItems = [
    {
      name: "dashboard",
      path: "/",
      icon: LayoutDashboard,
    },
    {
      name: "farmers",
      path: "/farmers",
      icon: Users,
    },
    {
      name: "crops",
      path: "/crops",
      icon: Wheat,
    },
    {
      name: "centers",
      path: "/centers",
      icon: Building2,
    },
    {
      name: "procurements",
      path: "/procurements",
      icon: ClipboardList,
    },
    {
      name: "supplyChain",
      path: "/supply-chain",
      icon: Truck,
    },
    {
      name: "consumerOrders",
      path: "/consumer-orders",
      icon: ShoppingCart,
    },
    {
      name: "liveQueue",
      path: "/live-queue",
      icon: ListOrdered,
    },
    {
      name: "liveMap",
      path: "/live-map",
      icon: MapPinned,
    },
    {
      name: "payments",
      path: "/payments",
      icon: CreditCard,
    },
  ];

  return (
    <aside className="sidebar">

      <div className="logo">
        <div className="logo-icon">
          🌾
        </div>

        <div className="logo-text">
          <h2>CROPP</h2>

          <span>
            {t("agriculturalProcurement")}
          </span>
        </div>
      </div>

      <nav className="nav-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                isActive
                  ? "nav-item active"
                  : "nav-item"
              }
            >
              <Icon size={20} />

              <span>
                {t(item.name)}
              </span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <p>
          {t("sihProject")}
        </p>

        <small>
          {t("gniot")}
        </small>
      </div>

    </aside>
  );
}

export default Sidebar;