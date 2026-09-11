import { useEffect, useState } from "react";

import {
  Users,
  Wheat,
  Building2,
  ClipboardList,
  IndianRupee,
  Clock,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { useLanguage } from "../components/LanguageContext";

function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const { language } = useLanguage();

  const isHindi = language === "hi";

  useEffect(() => {
    API.get("/dashboard/")
      .then((response) => {
        setData(response.data);
      })
      .catch((error) => {
        console.error(error);
        setError(
          isHindi
            ? "CROPP बैकएंड से कनेक्ट नहीं हो पाया।"
            : "Unable to connect to CROPP backend."
        );
      });
  }, [isHindi]);

  if (error) {
    return (
      <div className="dashboard-message error">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dashboard-message">
        {isHindi
          ? "डैशबोर्ड लोड हो रहा है..."
          : "Loading dashboard..."}
      </div>
    );
  }

  const stats = data.statistics;

  const cards = [
    {
      title: isHindi ? "कुल किसान" : "Total Farmers",
      value: stats.total_farmers,
      icon: Users,
      path: "/farmers",
    },
    {
      title: isHindi ? "कुल फसलें" : "Total Crops",
      value: stats.total_crops,
      icon: Wheat,
      path: "/crops",
    },
    {
      title: isHindi
        ? "खरीद केंद्र"
        : "Procurement Centers",
      value: stats.total_centers,
      icon: Building2,
      path: "/centers",
    },
    {
      title: isHindi
        ? "कुल खरीद"
        : "Total Procurements",
      value: stats.total_procurements,
      icon: ClipboardList,
      path: "/procurements",
    },
    {
      title: isHindi
        ? "कुल खरीद मूल्य"
        : "Total Procurement Value",
      value: `₹${Number(
        stats.total_procurement_amount
      ).toLocaleString("en-IN")}`,
      icon: IndianRupee,
      path: "/procurements",
    },
    {
      title: isHindi
        ? "लंबित भुगतान"
        : "Pending Payments",
      value: `₹${Number(
        stats.pending_payments
      ).toLocaleString("en-IN")}`,
      icon: Clock,
      path: "/payments",
    },
  ];

  return (
    <div className="dashboard-page">

      {/* PAGE HEADER */}
      <div className="dashboard-header">
        <div>
          <h1>
            {isHindi
              ? "CROPP डैशबोर्ड"
              : "CROPP Dashboard"}
          </h1>

          <p>
            {isHindi
              ? "कृषि खरीद की निगरानी और प्रबंधन"
              : "Agricultural procurement monitoring and management"}
          </p>
        </div>

        <button
          className="dashboard-action-btn"
          onClick={() => navigate("/procurements")}
        >
          {isHindi
            ? "खरीद प्रबंधित करें"
            : "Manage Procurements"}

          <ArrowRight size={18} />
        </button>
      </div>

      {/* STATISTICS */}
      <div className="stats-grid">
        {cards.map((card, index) => {
          const Icon = card.icon;

          return (
            <div
              className="stat-card"
              key={index}
              onClick={() => navigate(card.path)}
              style={{ cursor: "pointer" }}
            >
              <div>
                <p>{card.title}</p>
                <h2>{card.value}</h2>
              </div>

              <div className="stat-icon">
                <Icon size={24} />
              </div>
            </div>
          );
        })}
      </div>

      {/* PAYMENT SUMMARY */}
      <div className="dashboard-section">

        <div className="section-header">
          <div>
            <h2>
              {isHindi
                ? "भुगतान अवलोकन"
                : "Payment Overview"}
            </h2>

            <p>
              {isHindi
                ? "वर्तमान खरीद भुगतान स्थिति"
                : "Current procurement payment status"}
            </p>
          </div>

          <button
            onClick={() => navigate("/payments")}
          >
            {isHindi
              ? "भुगतान देखें"
              : "View Payments"}
          </button>
        </div>

        <div className="payment-summary">

          {/* COMPLETED PAYMENTS */}
          <div className="payment-box">
            <div className="payment-box-icon">
              <CheckCircle size={24} />
            </div>

            <div>
              <span>
                {isHindi
                  ? "पूर्ण भुगतान"
                  : "Completed Payments"}
              </span>

              <strong>
                ₹
                {Number(
                  stats.completed_payments
                ).toLocaleString("en-IN")}
              </strong>
            </div>
          </div>

          {/* PENDING PAYMENTS */}
          <div className="payment-box">
            <div className="payment-box-icon">
              <Clock size={24} />
            </div>

            <div>
              <span>
                {isHindi
                  ? "लंबित भुगतान"
                  : "Pending Payments"}
              </span>

              <strong>
                ₹
                {Number(
                  stats.pending_payments
                ).toLocaleString("en-IN")}
              </strong>
            </div>
          </div>

          {/* TOTAL PROCUREMENT VALUE */}
          <div className="payment-box">
            <div className="payment-box-icon">
              <IndianRupee size={24} />
            </div>

            <div>
              <span>
                {isHindi
                  ? "कुल खरीद मूल्य"
                  : "Total Procurement Value"}
              </span>

              <strong>
                ₹
                {Number(
                  stats.total_procurement_amount
                ).toLocaleString("en-IN")}
              </strong>
            </div>
          </div>

        </div>
      </div>

      {/* RECENT PROCUREMENTS */}
      <div className="dashboard-section">

        <div className="section-header">
          <div>
            <h2>
              {isHindi
                ? "हाल की खरीद"
                : "Recent Procurements"}
            </h2>

            <p>
              {isHindi
                ? "किसानों की नवीनतम खरीद गतिविधियां"
                : "Latest farmer procurement activities"}
            </p>
          </div>

          <button
            onClick={() => navigate("/procurements")}
          >
            {isHindi
              ? "सभी देखें"
              : "View All"}
          </button>
        </div>

        <div className="table-container">
          <table>

            <thead>
              <tr>
                <th>
                  {isHindi ? "किसान" : "Farmer"}
                </th>

                <th>
                  {isHindi ? "फसल" : "Crop"}
                </th>

                <th>
                  {isHindi ? "केंद्र" : "Center"}
                </th>

                <th>
                  {isHindi ? "मात्रा" : "Quantity"}
                </th>

                <th>
                  {isHindi ? "राशि" : "Amount"}
                </th>

                <th>
                  {isHindi ? "स्थिति" : "Status"}
                </th>
              </tr>
            </thead>

            <tbody>
              {data.recent_procurements.map(
                (procurement) => (
                  <tr
                    key={procurement.procurement_id}
                  >
                    <td>
                      <strong>
                        {procurement.farmer_name}
                      </strong>
                    </td>

                    <td>
                      {procurement.crop_name}
                    </td>

                    <td>
                      {procurement.center_name}
                    </td>

                    <td>
                      {procurement.quantity}{" "}
                      {isHindi
                        ? "क्विंटल"
                        : "Quintal"}
                    </td>

                    <td>
                      ₹
                      {Number(
                        procurement.total_amount
                      ).toLocaleString("en-IN")}
                    </td>

                    <td>
                      <span
                        className={`status ${procurement.status.toLowerCase()}`}
                      >
                        {procurement.status}
                      </span>
                    </td>
                  </tr>
                )
              )}
            </tbody>

          </table>
        </div>
      </div>

    </div>
  );
}

export default Dashboard;