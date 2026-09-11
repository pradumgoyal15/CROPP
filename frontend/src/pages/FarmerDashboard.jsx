import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Wheat,
  Building2,
  ClipboardList,
  IndianRupee,
  Clock,
  CheckCircle,
  Bell,
  LogOut,
  RefreshCw,
  MapPin,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

import API from "../services/api";
import { useLanguage } from "../components/LanguageContext";

function FarmerDashboard() {
  const navigate = useNavigate();

  const { language, toggleLanguage } = useLanguage();
  const isHindi = language === "hi";

  const [user, setUser] = useState(null);
  const [farmer, setFarmer] = useState(null);

  const [crops, setCrops] = useState([]);
  const [centers, setCenters] = useState([]);
  const [procurements, setProcurements] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [queueRefreshing, setQueueRefreshing] = useState(false);

  const [showProcurementForm, setShowProcurementForm] =
    useState(false);

  const [formData, setFormData] = useState({
    crop_id: "",
    quantity: "",
    center_id: "",
    procurement_date: new Date()
      .toISOString()
      .split("T")[0],
  });

  const [recommendations, setRecommendations] = useState([]);
  const [recommendationLoading, setRecommendationLoading] =
    useState(false);

  /* =========================================================
     GET LOGGED-IN USER
  ========================================================= */

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("cropp_user");

      if (!storedUser) {
        navigate("/login", { replace: true });
        return;
      }

      const parsedUser = JSON.parse(storedUser);

      if (parsedUser.role !== "FARMER") {
        navigate("/login", { replace: true });
        return;
      }

      setUser(parsedUser);
    } catch (error) {
      console.error("Invalid CROPP user:", error);
      localStorage.removeItem("cropp_user");
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  /* =========================================================
     LOAD ALL FARMER DATA
  ========================================================= */

  useEffect(() => {
    if (!user?.farmer_id) return;

    loadAllData(user.farmer_id);
  }, [user]);

  const loadAllData = async (farmerId) => {
    try {
      setLoading(true);
      setError("");

      const [
        farmerResponse,
        cropsResponse,
        centersResponse,
        procurementsResponse,
        paymentsResponse,
        notificationsResponse,
      ] = await Promise.all([
        API.get("/farmers/"),
        API.get("/crops/"),
        API.get("/centers/"),
        API.get("/procurements/"),
        API.get("/payments/"),
        API.get(`/notifications/farmer/${farmerId}`),
      ]);

      const farmersData = farmerResponse.data || [];
      const farmerData = farmersData.find(
        (item) => Number(item.id) === Number(farmerId)
      );

      setFarmer(farmerData || null);
      setCrops(cropsResponse.data || []);
      setCenters(centersResponse.data || []);

      const allProcurements = procurementsResponse.data || [];

      const farmerProcurements = allProcurements.filter(
        (item) =>
          Number(item.farmer_id) === Number(farmerId)
      );

      setProcurements(farmerProcurements);

      const allPayments = paymentsResponse.data || [];

      const farmerPayments = allPayments.filter(
        (item) =>
          Number(item.farmer_id) === Number(farmerId)
      );

      setPayments(farmerPayments);

      setNotifications(
        notificationsResponse.data || []
      );
    } catch (error) {
      console.error("Error loading farmer dashboard:", error);

      setError(
        isHindi
          ? "डैशबोर्ड डेटा लोड नहीं हो सका। कृपया बैकएंड सर्वर जांचें।"
          : "Unable to load dashboard data. Please check the backend server."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     REFRESH QUEUE / PROCUREMENT DATA
  ========================================================= */

  const refreshQueue = async () => {
    if (!user?.farmer_id) return;

    try {
      setQueueRefreshing(true);

      const response = await API.get("/procurements/");

      const allProcurements = response.data || [];

      const farmerProcurements = allProcurements.filter(
        (item) =>
          Number(item.farmer_id) ===
          Number(user.farmer_id)
      );

      setProcurements(farmerProcurements);
    } catch (error) {
      console.error("Error refreshing queue:", error);
    } finally {
      setQueueRefreshing(false);
    }
  };

  /* =========================================================
     AUTO REFRESH QUEUE EVERY 10 SECONDS
  ========================================================= */

  useEffect(() => {
    if (!user?.farmer_id) return;

    const interval = setInterval(() => {
      refreshQueue();
    }, 10000);

    return () => clearInterval(interval);
  }, [user]);

  /* =========================================================
     FORM HANDLING
  ========================================================= */

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  /* =========================================================
     CROP CHANGE
  ========================================================= */

  const selectedCrop = useMemo(() => {
    return crops.find(
      (crop) =>
        String(crop.id) === String(formData.crop_id)
    );
  }, [crops, formData.crop_id]);

  const selectedPrice = selectedCrop
    ? Number(selectedCrop.msp_price || 0)
    : 0;

  const estimatedAmount =
    Number(formData.quantity || 0) *
    selectedPrice;

  /* =========================================================
     SMART CENTER RECOMMENDATION
  ========================================================= */

  useEffect(() => {
    const getRecommendations = async () => {
      if (
        !formData.quantity ||
        !formData.procurement_date ||
        centers.length === 0
      ) {
        setRecommendations([]);
        return;
      }

      const quantity = Number(formData.quantity);

      if (quantity <= 0) {
        setRecommendations([]);
        return;
      }

      setRecommendationLoading(true);

      try {
        const results = await Promise.all(
          centers.map(async (center) => {
            try {
              const response = await API.get(
                `/centers/${center.id}/capacity`,
                {
                  params: {
                    date: formData.procurement_date,
                  },
                }
              );

              const data = response.data;

              return {
                ...data,
                center_id: center.id,
                center_name:
                  data.center_name ||
                  center.center_name,
                canHandle:
                  Number(data.remaining_capacity || 0) >=
                  quantity,
              };
            } catch (error) {
              console.error(
                "Center capacity error:",
                center.center_name,
                error
              );

              return null;
            }
          })
        );

        const validResults = results
          .filter(Boolean)
          .sort(
            (a, b) =>
              Number(b.remaining_capacity || 0) -
              Number(a.remaining_capacity || 0)
          );

        setRecommendations(validResults);
      } catch (error) {
        console.error(
          "Recommendation error:",
          error
        );

        setRecommendations([]);
      } finally {
        setRecommendationLoading(false);
      }
    };

    getRecommendations();
  }, [
    formData.quantity,
    formData.procurement_date,
    centers,
  ]);

  /* =========================================================
     SELECT RECOMMENDED CENTER
  ========================================================= */

  const selectRecommendedCenter = (centerId) => {
    setFormData((previous) => ({
      ...previous,
      center_id: String(centerId),
    }));
  };

  /* =========================================================
     SUBMIT PROCUREMENT REQUEST
  ========================================================= */

  const handleSubmitProcurement = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !user?.farmer_id ||
      !formData.crop_id ||
      !formData.quantity ||
      !formData.center_id ||
      !formData.procurement_date
    ) {
      setError(
        isHindi
          ? "कृपया सभी आवश्यक फ़ील्ड भरें।"
          : "Please fill all required fields."
      );

      return;
    }

    if (Number(formData.quantity) <= 0) {
      setError(
        isHindi
          ? "मात्रा 0 से अधिक होनी चाहिए।"
          : "Quantity must be greater than 0."
      );

      return;
    }

    try {
      setSubmitting(true);

      await API.post("/procurements/", {
        farmer_id: user.farmer_id,
        crop_id: Number(formData.crop_id),
        center_id: Number(formData.center_id),
        quantity: Number(formData.quantity),
        price_per_unit: selectedPrice,
        procurement_date:
          formData.procurement_date,
        status: "Pending",
      });

      setSuccess(
        isHindi
          ? "खरीद अनुरोध सफलतापूर्वक जमा हो गया।"
          : "Procurement request submitted successfully."
      );

      setFormData({
        crop_id: "",
        quantity: "",
        center_id: "",
        procurement_date: new Date()
          .toISOString()
          .split("T")[0],
      });

      setRecommendations([]);

      setShowProcurementForm(false);

      await loadAllData(user.farmer_id);
    } catch (error) {
      console.error(
        "Error submitting procurement:",
        error
      );

      setError(
        error.response?.data?.error ||
          (isHindi
            ? "खरीद अनुरोध जमा नहीं हो सका।"
            : "Unable to submit procurement request.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = () => {
    localStorage.removeItem("cropp_user");
    navigate("/login", { replace: true });
  };

  /* =========================================================
     PROCUREMENT STATUS
  ========================================================= */

  const getStatusClass = (status) => {
    switch (status) {
      case "Completed":
        return "status completed";

      case "Approved":
        return "status approved";

      case "Pending":
        return "status pending";

      case "Cancelled":
        return "status cancelled";

      default:
        return "status";
    }
  };

  const getStatusText = (status) => {
    if (!isHindi) return status;

    switch (status) {
      case "Pending":
        return "लंबित";

      case "Approved":
        return "स्वीकृत";

      case "Completed":
        return "पूर्ण";

      case "Cancelled":
        return "रद्द";

      default:
        return status;
    }
  };

  /* =========================================================
     PAYMENT STATUS
  ========================================================= */

  const getPaymentStatusText = (status) => {
    if (!isHindi) return status;

    switch (status) {
      case "Pending":
        return "लंबित";

      case "Completed":
        return "पूर्ण";

      case "Failed":
        return "विफल";

      default:
        return status;
    }
  };

  /* =========================================================
     CURRENT / LATEST PROCUREMENT
  ========================================================= */

  const latestProcurement =
    procurements.length > 0
      ? [...procurements].sort((a, b) => {
          return (
            new Date(
              b.procurement_date || 0
            ) -
            new Date(
              a.procurement_date || 0
            )
          );
        })[0]
      : null;

  /* =========================================================
     ACTIVE QUEUE PROCUREMENT
  ========================================================= */

  const activeQueueProcurement =
    procurements
      .filter(
        (item) =>
          item.status === "Pending" ||
          item.status === "Approved"
      )
      .sort(
        (a, b) =>
          Number(
            a.queue_position || 999999
          ) -
          Number(
            b.queue_position || 999999
          )
      )[0] || null;

  /* =========================================================
     PAYMENT STATS
  ========================================================= */

  const completedPaymentAmount =
    payments
      .filter(
        (payment) =>
          payment.payment_status ===
          "Completed"
      )
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );

  const pendingPaymentAmount =
    payments
      .filter(
        (payment) =>
          payment.payment_status ===
          "Pending"
      )
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );

  const totalPaymentAmount = payments.reduce(
    (sum, payment) =>
      sum + Number(payment.amount || 0),
    0
  );

  /* =========================================================
     TOTAL PROCUREMENT VALUE
  ========================================================= */

  const totalProcurementValue =
    procurements.reduce(
      (sum, procurement) =>
        sum +
        Number(procurement.total_amount || 0),
      0
    );

  /* =========================================================
     LOADING STATE
  ========================================================= */

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f6faf7",
          padding: "20px",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            padding: "35px",
            borderRadius: "16px",
            boxShadow:
              "0 8px 30px rgba(0,0,0,0.08)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "42px",
              marginBottom: "12px",
            }}
          >
            🌾
          </div>

          <h2 style={{ marginBottom: "8px" }}>
            {isHindi
              ? "डैशबोर्ड लोड हो रहा है..."
              : "Loading dashboard..."}
          </h2>

          <p style={{ color: "#6b7280" }}>
            {isHindi
              ? "कृपया प्रतीक्षा करें"
              : "Please wait"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6faf7",
        padding: "20px",
      }}
    >
      {/* =====================================================
          TOP BAR
      ===================================================== */}

      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto 20px",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "15px",
          flexWrap: "wrap",
          boxShadow:
            "0 4px 18px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#dcfce7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "25px",
            }}
          >
            🌾
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                color: "#166534",
              }}
            >
              CROPP
            </h2>

            <small
              style={{
                color: "#6b7280",
              }}
            >
              Centralized Resource Optimization and Procurement Platform
            </small>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {/* LANGUAGE TOGGLE */}

          <button
            type="button"
            onClick={toggleLanguage}
            style={{
              border: "1px solid #bbf7d0",
              background: "#f0fdf4",
              color: "#166534",
              padding: "9px 15px",
              borderRadius: "10px",
              fontWeight: "700",
              cursor: "pointer",
              minWidth: "105px",
            }}
          >
            {isHindi ? "English" : "हिन्दी"}
          </button>

          {/* REFRESH */}

          <button
            type="button"
            onClick={() =>
              user?.farmer_id &&
              loadAllData(user.farmer_id)
            }
            style={{
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              color: "#374151",
              padding: "9px 13px",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "7px",
            }}
          >
            <RefreshCw size={16} />

            {isHindi
              ? "रिफ्रेश"
              : "Refresh"}
          </button>

          {/* LOGOUT */}

          <button
            type="button"
            onClick={handleLogout}
            style={{
              border: "none",
              background: "#fee2e2",
              color: "#b91c1c",
              padding: "9px 13px",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "7px",
              fontWeight: "600",
            }}
          >
            <LogOut size={16} />

            {isHindi
              ? "लॉग आउट"
              : "Logout"}
          </button>
        </div>
      </div>

      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {/* ===================================================
            WELCOME
        =================================================== */}

        <div
          style={{
            background:
              "linear-gradient(135deg, #166534, #15803d)",
            color: "#ffffff",
            borderRadius: "18px",
            padding: "28px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 6px",
                opacity: 0.85,
              }}
            >
              {isHindi
                ? "स्वागत है"
                : "Welcome"}
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: "30px",
              }}
            >
              {farmer?.name ||
                user?.username ||
                (isHindi
                  ? "किसान"
                  : "Farmer")}
            </h1>

            <p
              style={{
                margin:
                  "8px 0 0",
                opacity: 0.9,
              }}
            >
              {isHindi
                ? "अपनी कृषि खरीद और भुगतान को आसानी से प्रबंधित करें।"
                : "Manage your agricultural procurement and payments with ease."}
            </p>
          </div>

          <div
            style={{
              background:
                "rgba(255,255,255,0.14)",
              borderRadius: "14px",
              padding: "15px 20px",
              minWidth: "190px",
            }}
          >
            <small
              style={{
                opacity: 0.8,
              }}
            >
              {isHindi
                ? "किसान आईडी"
                : "Farmer ID"}
            </small>

            <strong
              style={{
                display: "block",
                fontSize: "22px",
                marginTop: "3px",
              }}
            >
              #{user?.farmer_id}
            </strong>
          </div>
        </div>

        {/* ===================================================
            ERROR / SUCCESS
        =================================================== */}

        {error && (
          <div
            style={{
              background: "#fef2f2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
              padding: "13px 16px",
              borderRadius: "10px",
              marginBottom: "15px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              background: "#f0fdf4",
              color: "#166534",
              border: "1px solid #bbf7d0",
              padding: "13px 16px",
              borderRadius: "10px",
              marginBottom: "15px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <CheckCircle size={18} />
            {success}
          </div>
        )}

        {/* ===================================================
            STATISTICS
        =================================================== */}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <ClipboardList size={23} />
            </div>

            <div>
              <p>
                {isHindi
                  ? "कुल खरीद"
                  : "Total Procurements"}
              </p>

              <h2>
                {procurements.length}
              </h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Wheat size={23} />
            </div>

            <div>
              <p>
                {isHindi
                  ? "कुल मात्रा"
                  : "Total Quantity"}
              </p>

              <h2>
                {procurements
                  .reduce(
                    (sum, item) =>
                      sum +
                      Number(
                        item.quantity || 0
                      ),
                    0
                  )
                  .toLocaleString("en-IN")}{" "}
                <small>
                  {isHindi
                    ? "क्विंटल"
                    : "Quintal"}
                </small>
              </h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <IndianRupee size={23} />
            </div>

            <div>
              <p>
                {isHindi
                  ? "कुल खरीद मूल्य"
                  : "Procurement Value"}
              </p>

              <h2>
                ₹
                {totalProcurementValue.toLocaleString(
                  "en-IN"
                )}
              </h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Clock size={23} />
            </div>

            <div>
              <p>
                {isHindi
                  ? "लंबित भुगतान"
                  : "Pending Payment"}
              </p>

              <h2>
                ₹
                {pendingPaymentAmount.toLocaleString(
                  "en-IN"
                )}
              </h2>
            </div>
          </div>
        </div>

        {/* ===================================================
            MAIN GRID
        =================================================== */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 2fr) minmax(300px, 1fr)",
            gap: "20px",
            marginTop: "20px",
          }}
        >
          {/* =================================================
              PROCUREMENT REQUEST
          ================================================= */}

          <div
            className="dashboard-section"
            style={{
              margin: 0,
            }}
          >
            <div className="section-header">
              <div>
                <h2>
                  {isHindi
                    ? "नई खरीद अनुरोध"
                    : "New Procurement Request"}
                </h2>

                <p>
                  {isHindi
                    ? "अपनी फसल की खरीद के लिए अनुरोध जमा करें।"
                    : "Submit a request for procurement of your crop."}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowProcurementForm(
                    (previous) => !previous
                  )
                }
              >
                {showProcurementForm
                  ? isHindi
                    ? "बंद करें"
                    : "Close"
                  : isHindi
                  ? "+ अनुरोध करें"
                  : "+ Request"}
              </button>
            </div>

            {showProcurementForm && (
              <form
                onSubmit={
                  handleSubmitProcurement
                }
                style={{
                  padding: "5px 0 10px",
                }}
              >
                {/* CROP */}

                <div className="form-group">
                  <label>
                    {isHindi
                      ? "फसल"
                      : "Crop"}{" "}
                    *
                  </label>

                  <select
                    name="crop_id"
                    value={formData.crop_id}
                    onChange={
                      handleFormChange
                    }
                    required
                  >
                    <option value="">
                      {isHindi
                        ? "फसल चुनें"
                        : "Select Crop"}
                    </option>

                    {crops.map((crop) => (
                      <option
                        key={crop.id}
                        value={crop.id}
                      >
                        {crop.crop_name}
                        {crop.msp_price
                          ? ` - MSP ₹${Number(
                              crop.msp_price
                            ).toLocaleString(
                              "en-IN"
                            )}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* QUANTITY */}

                <div className="form-group">
                  <label>
                    {isHindi
                      ? "मात्रा (क्विंटल)"
                      : "Quantity (Quintal)"}{" "}
                    *
                  </label>

                  <input
                    type="number"
                    name="quantity"
                    value={
                      formData.quantity
                    }
                    onChange={
                      handleFormChange
                    }
                    min="0.01"
                    step="0.01"
                    placeholder={
                      isHindi
                        ? "मात्रा दर्ज करें"
                        : "Enter quantity"
                    }
                    required
                  />
                </div>

                {/* DATE */}

                <div className="form-group">
                  <label>
                    {isHindi
                      ? "खरीद की तारीख"
                      : "Procurement Date"}{" "}
                    *
                  </label>

                  <input
                    type="date"
                    name="procurement_date"
                    value={
                      formData.procurement_date
                    }
                    onChange={
                      handleFormChange
                    }
                    required
                  />
                </div>

                {/* SMART RECOMMENDATION */}

                {formData.quantity &&
                  formData.procurement_date && (
                    <div
                      style={{
                        background: "#f0fdf4",
                        border:
                          "1px solid #bbf7d0",
                        borderRadius: "12px",
                        padding: "15px",
                        marginBottom: "18px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems:
                            "center",
                          marginBottom:
                            "12px",
                        }}
                      >
                        <strong
                          style={{
                            color:
                              "#166534",
                          }}
                        >
                          🚜{" "}
                          {isHindi
                            ? "स्मार्ट केंद्र सुझाव"
                            : "Smart Center Recommendation"}
                        </strong>

                        {recommendationLoading && (
                          <small>
                            {isHindi
                              ? "जांच हो रही है..."
                              : "Checking..."}
                          </small>
                        )}
                      </div>

                      {!recommendationLoading &&
                        recommendations.length >
                          0 && (
                          <>
                            {recommendations.some(
                              (center) =>
                                center.canHandle
                            ) ? (
                              <div
                                style={{
                                  display:
                                    "grid",
                                  gap: "9px",
                                }}
                              >
                                {recommendations
                                  .filter(
                                    (
                                      center
                                    ) =>
                                      center.canHandle
                                  )
                                  .slice(0, 3)
                                  .map(
                                    (
                                      center,
                                      index
                                    ) => (
                                      <div
                                        key={
                                          center.center_id
                                        }
                                        style={{
                                          display:
                                            "flex",
                                          justifyContent:
                                            "space-between",
                                          alignItems:
                                            "center",
                                          gap: "10px",
                                          background:
                                            "#ffffff",
                                          border:
                                            index ===
                                            0
                                              ? "2px solid #22c55e"
                                              : "1px solid #dcfce7",
                                          borderRadius:
                                            "10px",
                                          padding:
                                            "11px 13px",
                                        }}
                                      >
                                        <div>
                                          <strong>
                                            {index ===
                                              0 &&
                                              "⭐ "}
                                            {
                                              center.center_name
                                            }
                                          </strong>

                                          <small
                                            style={{
                                              display:
                                                "block",
                                              color:
                                                "#6b7280",
                                              marginTop:
                                                "3px",
                                            }}
                                          >
                                            {isHindi
                                              ? "उपलब्ध क्षमता"
                                              : "Available"}{" "}
                                            :{" "}
                                            {
                                              center.remaining_capacity
                                            }{" "}
                                            {isHindi
                                              ? "क्विंटल"
                                              : "Quintal"}
                                          </small>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            selectRecommendedCenter(
                                              center.center_id
                                            )
                                          }
                                          style={{
                                            border:
                                              "none",
                                            background:
                                              "#166534",
                                            color:
                                              "#ffffff",
                                            padding:
                                              "8px 12px",
                                            borderRadius:
                                              "8px",
                                            cursor:
                                              "pointer",
                                            fontWeight:
                                              "600",
                                          }}
                                        >
                                          {isHindi
                                            ? "चुनें"
                                            : "Select"}
                                        </button>
                                      </div>
                                    )
                                  )}
                              </div>
                            ) : (
                              <div
                                style={{
                                  color:
                                    "#b45309",
                                  background:
                                    "#fffbeb",
                                  padding:
                                    "11px",
                                  borderRadius:
                                    "8px",
                                }}
                              >
                                ⚠️{" "}
                                {isHindi
                                  ? `इस तारीख को ${formData.quantity} क्विंटल के लिए कोई केंद्र पर्याप्त क्षमता नहीं रखता।`
                                  : `No procurement center has enough capacity for ${formData.quantity} Quintal on ${formData.procurement_date}.`}
                              </div>
                            )}
                          </>
                        )}
                    </div>
                  )}

                {/* CENTER */}

                <div className="form-group">
                  <label>
                    {isHindi
                      ? "खरीद केंद्र"
                      : "Procurement Center"}{" "}
                    *
                  </label>

                  <select
                    name="center_id"
                    value={
                      formData.center_id
                    }
                    onChange={
                      handleFormChange
                    }
                    required
                  >
                    <option value="">
                      {isHindi
                        ? "केंद्र चुनें"
                        : "Select Center"}
                    </option>

                    {centers.map((center) => (
                      <option
                        key={center.id}
                        value={center.id}
                      >
                        {center.center_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* PRICE */}

                {selectedCrop && (
                  <div
                    style={{
                      background:
                        "#f9fafb",
                      border:
                        "1px solid #e5e7eb",
                      borderRadius: "10px",
                      padding: "13px",
                      marginBottom:
                        "15px",
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      {isHindi
                        ? "MSP / प्रति क्विंटल कीमत"
                        : "MSP / Price per Quintal"}
                    </span>

                    <strong>
                      ₹
                      {selectedPrice.toLocaleString(
                        "en-IN"
                      )}
                    </strong>
                  </div>
                )}

                {/* ESTIMATED TOTAL */}

                {estimatedAmount > 0 && (
                  <div
                    style={{
                      background:
                        "#ecfdf5",
                      border:
                        "1px solid #a7f3d0",
                      borderRadius: "10px",
                      padding: "15px",
                      marginBottom:
                        "17px",
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      {isHindi
                        ? "अनुमानित कुल राशि"
                        : "Estimated Total"}
                    </span>

                    <strong
                      style={{
                        color:
                          "#166534",
                        fontSize:
                          "20px",
                      }}
                    >
                      ₹
                      {estimatedAmount.toLocaleString(
                        "en-IN"
                      )}
                    </strong>
                  </div>
                )}

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submitting}
                  style={{
                    width: "100%",
                    justifyContent:
                      "center",
                    opacity: submitting
                      ? 0.7
                      : 1,
                  }}
                >
                  {submitting
                    ? isHindi
                      ? "जमा हो रहा है..."
                      : "Submitting..."
                    : isHindi
                    ? "खरीद अनुरोध जमा करें"
                    : "Submit Procurement Request"}
                </button>
              </form>
            )}
          </div>

          {/* =================================================
              LIVE QUEUE
          ================================================= */}

          <div
            className="dashboard-section"
            style={{
              margin: 0,
            }}
          >
            <div className="section-header">
              <div>
                <h2>
                  {isHindi
                    ? "लाइव कतार"
                    : "Live Queue"}
                </h2>

                <p>
                  {isHindi
                    ? "आपकी वर्तमान कतार स्थिति"
                    : "Your current queue position"}
                </p>
              </div>

              <button
                type="button"
                onClick={refreshQueue}
                disabled={
                  queueRefreshing
                }
              >
                <RefreshCw
                  size={15}
                  style={{
                    marginRight: "5px",
                  }}
                />

                {isHindi
                  ? "रिफ्रेश"
                  : "Refresh"}
              </button>
            </div>

            {activeQueueProcurement ? (
              <div
                style={{
                  background:
                    "#f0fdf4",
                  border:
                    "1px solid #bbf7d0",
                  borderRadius: "14px",
                  padding: "18px",
                }}
              >
                <div
                  style={{
                    textAlign:
                      "center",
                    marginBottom:
                      "15px",
                  }}
                >
                  <small
                    style={{
                      color:
                        "#6b7280",
                    }}
                  >
                    {isHindi
                      ? "आपका कतार नंबर"
                      : "Your Queue Number"}
                  </small>

                  <div
                    style={{
                      fontSize:
                        "30px",
                      fontWeight:
                        "800",
                      color:
                        "#166534",
                      marginTop:
                        "5px",
                    }}
                  >
                    {activeQueueProcurement.queue_number ||
                      "—"}
                  </div>
                </div>

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "1fr 1fr",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      background:
                        "#ffffff",
                      borderRadius:
                        "10px",
                      padding:
                        "12px",
                      textAlign:
                        "center",
                    }}
                  >
                    <small>
                      {isHindi
                        ? "स्थिति"
                        : "Status"}
                    </small>

                    <strong
                      style={{
                        display:
                          "block",
                        marginTop:
                          "5px",
                      }}
                    >
                      {getStatusText(
                        activeQueueProcurement.status
                      )}
                    </strong>
                  </div>

                  <div
                    style={{
                      background:
                        "#ffffff",
                      borderRadius:
                        "10px",
                      padding:
                        "12px",
                      textAlign:
                        "center",
                    }}
                  >
                    <small>
                      {isHindi
                        ? "स्थिति नंबर"
                        : "Position"}
                    </small>

                    <strong
                      style={{
                        display:
                          "block",
                        marginTop:
                          "5px",
                        color:
                          "#166534",
                      }}
                    >
                      {activeQueueProcurement.queue_position ||
                        "—"}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    marginTop:
                      "12px",
                    background:
                      "#ffffff",
                    borderRadius:
                      "10px",
                    padding:
                      "12px",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                    }}
                  >
                    <span>
                      {isHindi
                        ? "फसल"
                        : "Crop"}
                    </span>

                    <strong>
                      {
                        activeQueueProcurement.crop_name
                      }
                    </strong>
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      marginTop:
                        "7px",
                    }}
                  >
                    <span>
                      {isHindi
                        ? "केंद्र"
                        : "Center"}
                    </span>

                    <strong>
                      {
                        activeQueueProcurement.center_name
                      }
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding:
                    "35px 15px",
                  textAlign:
                    "center",
                  color:
                    "#6b7280",
                }}
              >
                <Clock
                  size={35}
                  style={{
                    marginBottom:
                      "8px",
                  }}
                />

                <p>
                  {isHindi
                    ? "अभी कोई सक्रिय कतार नहीं है।"
                    : "No active queue right now."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ===================================================
            LATEST PROCUREMENT
        =================================================== */}

        <div
          className="dashboard-section"
          style={{
            marginTop: "20px",
          }}
        >
          <div className="section-header">
            <div>
              <h2>
                {isHindi
                  ? "नवीनतम खरीद"
                  : "Latest Procurement"}
              </h2>

              <p>
                {isHindi
                  ? "आपकी सबसे हाल की खरीद गतिविधि"
                  : "Your most recent procurement activity"}
              </p>
            </div>
          </div>

          {latestProcurement ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "15px",
              }}
            >
              <div className="payment-box">
                <Wheat size={24} />

                <div>
                  <span>
                    {isHindi
                      ? "फसल"
                      : "Crop"}
                  </span>

                  <strong>
                    {
                      latestProcurement.crop_name
                    }
                  </strong>
                </div>
              </div>

              <div className="payment-box">
                <Building2
                  size={24}
                />

                <div>
                  <span>
                    {isHindi
                      ? "केंद्र"
                      : "Center"}
                  </span>

                  <strong>
                    {
                      latestProcurement.center_name
                    }
                  </strong>
                </div>
              </div>

              <div className="payment-box">
                <Wheat size={24} />

                <div>
                  <span>
                    {isHindi
                      ? "मात्रा"
                      : "Quantity"}
                  </span>

                  <strong>
                    {
                      latestProcurement.quantity
                    }{" "}
                    {isHindi
                      ? "क्विंटल"
                      : "Quintal"}
                  </strong>
                </div>
              </div>

              <div className="payment-box">
                <IndianRupee
                  size={24}
                />

                <div>
                  <span>
                    {isHindi
                      ? "राशि"
                      : "Amount"}
                  </span>

                  <strong>
                    ₹
                    {Number(
                      latestProcurement.total_amount ||
                        0
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </strong>
                </div>
              </div>

              <div className="payment-box">
                <CheckCircle
                  size={24}
                />

                <div>
                  <span>
                    {isHindi
                      ? "स्थिति"
                      : "Status"}
                  </span>

                  <strong>
                    {getStatusText(
                      latestProcurement.status
                    )}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <p
              style={{
                color: "#6b7280",
                padding: "20px 0",
              }}
            >
              {isHindi
                ? "अभी कोई खरीद रिकॉर्ड नहीं मिला।"
                : "No procurement records found."}
            </p>
          )}
        </div>

        {/* ===================================================
            PROCUREMENT HISTORY
        =================================================== */}

        <div
          className="dashboard-section"
          style={{
            marginTop: "20px",
          }}
        >
          <div className="section-header">
            <div>
              <h2>
                {isHindi
                  ? "खरीद इतिहास"
                  : "Procurement History"}
              </h2>

              <p>
                {isHindi
                  ? "आपकी सभी खरीद गतिविधियां"
                  : "All your procurement activities"}
              </p>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>
                    {isHindi
                      ? "आईडी"
                      : "ID"}
                  </th>

                  <th>
                    {isHindi
                      ? "फसल"
                      : "Crop"}
                  </th>

                  <th>
                    {isHindi
                      ? "केंद्र"
                      : "Center"}
                  </th>

                  <th>
                    {isHindi
                      ? "मात्रा"
                      : "Quantity"}
                  </th>

                  <th>
                    {isHindi
                      ? "कीमत"
                      : "Price"}
                  </th>

                  <th>
                    {isHindi
                      ? "कुल राशि"
                      : "Total"}
                  </th>

                  <th>
                    {isHindi
                      ? "तारीख"
                      : "Date"}
                  </th>

                  <th>
                    {isHindi
                      ? "स्थिति"
                      : "Status"}
                  </th>
                </tr>
              </thead>

              <tbody>
                {procurements.length >
                0 ? (
                  procurements
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(
                          b.procurement_date ||
                            0
                        ) -
                        new Date(
                          a.procurement_date ||
                            0
                        )
                    )
                    .map(
                      (procurement) => (
                        <tr
                          key={
                            procurement.procurement_id
                          }
                        >
                          <td>
                            #
                            {
                              procurement.procurement_id
                            }
                          </td>

                          <td>
                            <strong>
                              {
                                procurement.crop_name
                              }
                            </strong>
                          </td>

                          <td>
                            {
                              procurement.center_name
                            }
                          </td>

                          <td>
                            {
                              procurement.quantity
                            }{" "}
                            {isHindi
                              ? "क्विंटल"
                              : "Quintal"}
                          </td>

                          <td>
                            ₹
                            {Number(
                              procurement.price_per_unit ||
                                0
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </td>

                          <td>
                            <strong>
                              ₹
                              {Number(
                                procurement.total_amount ||
                                  0
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </strong>
                          </td>

                          <td>
                            {
                              procurement.procurement_date
                            }
                          </td>

                          <td>
                            <span
                              className={getStatusClass(
                                procurement.status
                              )}
                            >
                              {getStatusText(
                                procurement.status
                              )}
                            </span>
                          </td>
                        </tr>
                      )
                    )
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      style={{
                        textAlign:
                          "center",
                        padding:
                          "30px",
                        color:
                          "#6b7280",
                      }}
                    >
                      {isHindi
                        ? "कोई खरीद रिकॉर्ड नहीं मिला।"
                        : "No procurement records found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===================================================
            PAYMENT OVERVIEW
        =================================================== */}

        <div
          className="dashboard-section"
          style={{
            marginTop: "20px",
          }}
        >
          <div className="section-header">
            <div>
              <h2>
                {isHindi
                  ? "भुगतान अवलोकन"
                  : "Payment Overview"}
              </h2>

              <p>
                {isHindi
                  ? "आपकी खरीद से संबंधित भुगतान"
                  : "Payments related to your procurements"}
              </p>
            </div>
          </div>

          <div className="payment-summary">
            <div className="payment-box">
              <div className="payment-box-icon">
                <IndianRupee
                  size={24}
                />
              </div>

              <div>
                <span>
                  {isHindi
                    ? "कुल भुगतान"
                    : "Total Payment"}
                </span>

                <strong>
                  ₹
                  {totalPaymentAmount.toLocaleString(
                    "en-IN"
                  )}
                </strong>
              </div>
            </div>

            <div className="payment-box">
              <div className="payment-box-icon">
                <CheckCircle
                  size={24}
                />
              </div>

              <div>
                <span>
                  {isHindi
                    ? "पूर्ण भुगतान"
                    : "Completed Payment"}
                </span>

                <strong>
                  ₹
                  {completedPaymentAmount.toLocaleString(
                    "en-IN"
                  )}
                </strong>
              </div>
            </div>

            <div className="payment-box">
              <div className="payment-box-icon">
                <Clock size={24} />
              </div>

              <div>
                <span>
                  {isHindi
                    ? "लंबित भुगतान"
                    : "Pending Payment"}
                </span>

                <strong>
                  ₹
                  {pendingPaymentAmount.toLocaleString(
                    "en-IN"
                  )}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================
            PAYMENT HISTORY
        =================================================== */}

        <div
          className="dashboard-section"
          style={{
            marginTop: "20px",
          }}
        >
          <div className="section-header">
            <div>
              <h2>
                {isHindi
                  ? "भुगतान इतिहास"
                  : "Payment History"}
              </h2>

              <p>
                {isHindi
                  ? "आपके भुगतान लेनदेन"
                  : "Your payment transactions"}
              </p>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>
                    {isHindi
                      ? "भुगतान आईडी"
                      : "Payment ID"}
                  </th>

                  <th>
                    {isHindi
                      ? "फसल"
                      : "Crop"}
                  </th>

                  <th>
                    {isHindi
                      ? "राशि"
                      : "Amount"}
                  </th>

                  <th>
                    {isHindi
                      ? "तरीका"
                      : "Method"}
                  </th>

                  <th>
                    {isHindi
                      ? "तारीख"
                      : "Date"}
                  </th>

                  <th>
                    {isHindi
                      ? "स्थिति"
                      : "Status"}
                  </th>
                </tr>
              </thead>

              <tbody>
                {payments.length >
                0 ? (
                  payments.map(
                    (payment) => (
                      <tr
                        key={
                          payment.payment_id
                        }
                      >
                        <td>
                          #
                          {
                            payment.payment_id
                          }
                        </td>

                        <td>
                          {
                            payment.crop_name ||
                              "—"
                          }
                        </td>

                        <td>
                          <strong>
                            ₹
                            {Number(
                              payment.amount ||
                                0
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </strong>
                        </td>

                        <td>
                          {payment.payment_method ===
                            "Bank Transfer" &&
                            "🏦 "}

                          {payment.payment_method ===
                            "UPI" &&
                            "📱 "}

                          {payment.payment_method ===
                            "Cash" &&
                            "💵 "}

                          {payment.payment_method ||
                            "—"}
                        </td>

                        <td>
                          {payment.payment_date ||
                            (isHindi
                              ? "भुगतान नहीं हुआ"
                              : "Not settled")}
                        </td>

                        <td>
                          <span
                            className={getStatusClass(
                              payment.payment_status
                            )}
                          >
                            {getPaymentStatusText(
                              payment.payment_status
                            )}
                          </span>
                        </td>
                      </tr>
                    )
                  )
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      style={{
                        textAlign:
                          "center",
                        padding:
                          "30px",
                        color:
                          "#6b7280",
                      }}
                    >
                      {isHindi
                        ? "कोई भुगतान रिकॉर्ड नहीं मिला।"
                        : "No payment records found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===================================================
            NOTIFICATIONS
        =================================================== */}

        <div
          className="dashboard-section"
          style={{
            marginTop: "20px",
          }}
        >
          <div className="section-header">
            <div>
              <h2>
                <Bell
                  size={20}
                  style={{
                    verticalAlign:
                      "middle",
                    marginRight:
                      "7px",
                  }}
                />

                {isHindi
                  ? "सूचनाएं"
                  : "Notifications"}
              </h2>

              <p>
                {isHindi
                  ? "आपकी नवीनतम खरीद और भुगतान सूचनाएं"
                  : "Your latest procurement and payment notifications"}
              </p>
            </div>
          </div>

          {notifications.length >
          0 ? (
            <div
              style={{
                display: "grid",
                gap: "10px",
              }}
            >
              {notifications
                .slice(0, 8)
                .map(
                  (
                    notification,
                    index
                  ) => (
                    <div
                      key={
                        notification.id ||
                        index
                      }
                      style={{
                        background:
                          notification.is_read
                            ? "#ffffff"
                            : "#f0fdf4",
                        border:
                          "1px solid #e5e7eb",
                        borderRadius:
                          "10px",
                        padding:
                          "13px 15px",
                        display:
                          "flex",
                        alignItems:
                          "flex-start",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          width:
                            "34px",
                          height:
                            "34px",
                          borderRadius:
                            "50%",
                          background:
                            "#dcfce7",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          flexShrink: 0,
                        }}
                      >
                        <Bell
                          size={17}
                          color="#166534"
                        />
                      </div>

                      <div>
                        <strong>
                          {notification.title ||
                            (isHindi
                              ? "सूचना"
                              : "Notification")}
                        </strong>

                        <p
                          style={{
                            margin:
                              "4px 0 0",
                            color:
                              "#6b7280",
                          }}
                        >
                          {notification.message ||
                            notification.notification_text ||
                            ""}
                        </p>

                        {notification.created_at && (
                          <small
                            style={{
                              color:
                                "#9ca3af",
                            }}
                          >
                            {
                              notification.created_at
                            }
                          </small>
                        )}
                      </div>
                    </div>
                  )
                )}
            </div>
          ) : (
            <div
              style={{
                padding:
                  "30px",
                textAlign:
                  "center",
                color:
                  "#6b7280",
              }}
            >
              <Bell
                size={34}
                style={{
                  marginBottom:
                    "8px",
                }}
              />

              <p>
                {isHindi
                  ? "अभी कोई नई सूचना नहीं है।"
                  : "No new notifications."}
              </p>
            </div>
          )}
        </div>

        {/* ===================================================
            FARMER INFORMATION
        =================================================== */}

        <div
          className="dashboard-section"
          style={{
            marginTop: "20px",
            marginBottom: "20px",
          }}
        >
          <div className="section-header">
            <div>
              <h2>
                <User
                  size={20}
                  style={{
                    verticalAlign:
                      "middle",
                    marginRight:
                      "7px",
                  }}
                />

                {isHindi
                  ? "प्रोफ़ाइल जानकारी"
                  : "Profile Information"}
              </h2>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "15px",
            }}
          >
            <div
              style={{
                background:
                  "#f9fafb",
                borderRadius:
                  "10px",
                padding:
                  "15px",
              }}
            >
              <small>
                {isHindi
                  ? "नाम"
                  : "Name"}
              </small>

              <strong
                style={{
                  display:
                    "block",
                  marginTop:
                    "5px",
                }}
              >
                {farmer?.name ||
                  user?.username ||
                  "—"}
              </strong>
            </div>

            <div
              style={{
                background:
                  "#f9fafb",
                borderRadius:
                  "10px",
                padding:
                  "15px",
              }}
            >
              <small>
                {isHindi
                  ? "फोन"
                  : "Phone"}
              </small>

              <strong
                style={{
                  display:
                    "block",
                  marginTop:
                    "5px",
                }}
              >
                {farmer?.phone ||
                  "—"}
              </strong>
            </div>

            <div
              style={{
                background:
                  "#f9fafb",
                borderRadius:
                  "10px",
                padding:
                  "15px",
              }}
            >
              <small>
                <MapPin
                  size={14}
                  style={{
                    verticalAlign:
                      "middle",
                  }}
                />{" "}
                {isHindi
                  ? "जिला"
                  : "District"}
              </small>

              <strong
                style={{
                  display:
                    "block",
                  marginTop:
                    "5px",
                }}
              >
                {farmer?.district ||
                  "—"}
              </strong>
            </div>

            <div
              style={{
                background:
                  "#f9fafb",
                borderRadius:
                  "10px",
                padding:
                  "15px",
              }}
            >
              <small>
                {isHindi
                  ? "पता"
                  : "Address"}
              </small>

              <strong
                style={{
                  display:
                    "block",
                  marginTop:
                    "5px",
                }}
              >
                {farmer?.address ||
                  "—"}
              </strong>
            </div>
          </div>
        </div>

        {/* ===================================================
            FOOTER
        =================================================== */}

        <div
          style={{
            textAlign: "center",
            color: "#6b7280",
            padding: "10px 0 25px",
            fontSize: "13px",
          }}
        >
          CROPP —{" "}
          {isHindi
            ? "किसानों को स्मार्ट खरीद से जोड़ना"
            : "Connecting farmers with smart procurement"}
        </div>
      </div>
    </div>
  );
}

export default FarmerDashboard;