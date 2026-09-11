import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLanguage } from "../components/LanguageContext";

const API_BASE = "http://localhost:5000/api";

function ConsumerDashboard() {
  const { language, toggleLanguage } = useLanguage();
  const isHindi = language === "hi";

  const user = JSON.parse(localStorage.getItem("cropp_user"));
  const consumerId = user?.id;

  const [crops, setCrops] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [error, setError] = useState("");
  const [ordersError, setOrdersError] = useState("");

  const [selectedCrop, setSelectedCrop] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [orderMessage, setOrderMessage] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // --------------------------------------------------
  // TRACEABILITY STATE
  // --------------------------------------------------

  const [traceabilityOrder, setTraceabilityOrder] = useState(null);
  const [traceabilityData, setTraceabilityData] = useState(null);
  const [traceabilityLoading, setTraceabilityLoading] = useState(false);
  const [traceabilityError, setTraceabilityError] = useState("");

  // --------------------------------------------------
  // TRANSLATIONS
  // --------------------------------------------------

  const text = {
    en: {
      consumerPortal: "🛒 CONSUMER PORTAL",
      welcome: "Welcome",
      consumer: "Consumer",
      discover:
        "Discover agricultural products directly through CROPP.",
      logout: "Logout",
      hindi: "हिन्दी",
      english: "English",

      availableProducts: "Available Products",
      myOrders: "My Orders",
      activeOrders: "Active Orders",
      totalOrderValue: "Total Order Value",

      browseProducts: "🌾 Browse Agricultural Products",
      browseDescription:
        "Explore crops currently available through the CROPP network.",
      refresh: "↻ Refresh",

      searchPlaceholder:
        "Search crops, categories or products...",

      loadingProducts: "Loading products...",
      loadingProductsDescription:
        "Please wait while CROPP loads current crop information.",

      unableLoadProducts: "Unable to load products",
      tryAgain: "Try Again",

      noProducts: "No products found",
      noProductsDescription:
        "Try another crop name or search term.",

      available: "Available",
      agriculturalProduct: "Agricultural Product",
      source: "Source",
      croppNetwork: "CROPP Network",
      productId: "Product ID",
      requestProduct: "📦 Request Product",

      trackOrders:
        "Track your agricultural product requests and their current status.",
      refreshOrders: "↻ Refresh Orders",

      loadingOrders: "Loading your orders...",
      unableLoadOrders: "Unable to load orders",

      noOrders: "No orders yet",
      noOrdersDescription:
        "Your product requests will appear here after you place an order.",

      order: "ORDER",
      quantity: "Quantity",
      priceUnit: "Price / Unit",
      totalValue: "Total Value",
      orderDate: "Order Date",

      requested: "Requested",
      confirmed: "Confirmed",
      processing: "Processing",
      ready: "Ready",
      completed: "Completed",
      cancelled: "Cancelled",

      automaticallyRefreshed: "🔄 Automatically refreshed",
      updated: "Updated",

      viewTraceability: "🔎 View Traceability",

      featureMyOrders: "My Orders",
      featureMyOrdersDescription:
        "View and track your agricultural product requests and orders.",

      supplyTracking: "Supply Tracking",
      supplyTrackingDescription:
        "Follow the movement of products through the CROPP procurement network.",

      sourceTraceability: "Source Traceability",
      sourceTraceabilityDescription:
        "Connect products with their procurement and agricultural source.",

      productRequest: "📦 PRODUCT REQUEST",
      availableThrough:
        "Available through the CROPP procurement network.",
      requiredQuantity: "Required Quantity",
      enterQuantity: "Enter quantity in",
      estimatedValue: "Estimated Value",

      cancel: "Cancel",
      creatingOrder: "Creating Order...",
      submitRequest: "Submit Request",

      consumerAccountMissing:
        "Consumer account information is missing.",
      selectProduct: "Please select a product.",
      validQuantity: "Please enter a valid quantity.",
      orderCreated: "Order created successfully.",
      unableCreateOrder:
        "Unable to create order. Please try again.",

      traceability: "🔗 CROPP TRACEABILITY",
      traceabilityLoading: "Loading traceability...",
      traceabilityLoadingDescription:
        "CROPP is retrieving the product's procurement and supply-chain information.",

      traceabilityNotAvailable:
        "Traceability Not Available Yet",
      traceabilityAvailableAfter:
        "Traceability becomes available after a completed procurement batch is created for this crop.",

      traceabilityId: "TRACEABILITY ID",
      crop: "🌾 Crop",
      sourceFarmer: "👨‍🌾 Source Farmer",
      procurementCenter: "🏢 Procurement Center",
      batch: "📦 Batch",
      quality: "✅ Quality",

      currentSupplyStage: "CURRENT SUPPLY-CHAIN STAGE",

      procurementInformation: "📋 Procurement Information",
      procurementId: "Procurement ID",
      procurementDate: "Procurement Date",
      centerDistrict: "Center District",

      supplyChainJourney: "🚚 Supply Chain Journey",
      events: "events",
      event: "Event",

      noEvents: "No supply-chain events recorded yet.",

      verifiedRecords:
        "🔐 Verified through CROPP procurement records",

      unknownStage: "Unknown Stage",

      farmerHarvest: "Farmer Harvest",
      procurementCenterStage: "Procurement Center",
      qualityCheck: "Quality Check",
      storage: "Storage",
      distribution: "Distribution",
      delivered: "Delivered",

      pending: "Pending",
      passed: "Passed",
      needsReview: "Needs Review",
      failed: "Failed",

      traceabilityUnavailable:
        "Traceability information is not available yet.",
    },

    hi: {
      consumerPortal: "🛒 उपभोक्ता पोर्टल",
      welcome: "स्वागत है",
      consumer: "उपभोक्ता",
      discover:
        "CROPP के माध्यम से सीधे कृषि उत्पादों की जानकारी प्राप्त करें।",
      logout: "लॉग आउट",
      hindi: "हिन्दी",
      english: "English",

      availableProducts: "उपलब्ध उत्पाद",
      myOrders: "मेरे ऑर्डर",
      activeOrders: "सक्रिय ऑर्डर",
      totalOrderValue: "कुल ऑर्डर मूल्य",

      browseProducts: "🌾 कृषि उत्पाद ब्राउज़ करें",
      browseDescription:
        "CROPP नेटवर्क के माध्यम से वर्तमान में उपलब्ध फसलों को देखें।",
      refresh: "↻ रिफ्रेश",

      searchPlaceholder:
        "फसल, श्रेणी या उत्पाद खोजें...",

      loadingProducts: "उत्पाद लोड हो रहे हैं...",
      loadingProductsDescription:
        "कृपया प्रतीक्षा करें, CROPP वर्तमान फसल की जानकारी लोड कर रहा है।",

      unableLoadProducts: "उत्पाद लोड नहीं हो सके",
      tryAgain: "पुनः प्रयास करें",

      noProducts: "कोई उत्पाद नहीं मिला",
      noProductsDescription:
        "किसी अन्य फसल का नाम या खोज शब्द आज़माएं।",

      available: "उपलब्ध",
      agriculturalProduct: "कृषि उत्पाद",
      source: "स्रोत",
      croppNetwork: "CROPP नेटवर्क",
      productId: "उत्पाद ID",
      requestProduct: "📦 उत्पाद का अनुरोध करें",

      trackOrders:
        "अपने कृषि उत्पाद अनुरोधों और उनकी वर्तमान स्थिति को ट्रैक करें।",
      refreshOrders: "↻ ऑर्डर रिफ्रेश करें",

      loadingOrders: "आपके ऑर्डर लोड हो रहे हैं...",
      unableLoadOrders: "ऑर्डर लोड नहीं हो सके",

      noOrders: "अभी कोई ऑर्डर नहीं है",
      noOrdersDescription:
        "उत्पाद का ऑर्डर देने के बाद आपके अनुरोध यहां दिखाई देंगे।",

      order: "ऑर्डर",
      quantity: "मात्रा",
      priceUnit: "कीमत / इकाई",
      totalValue: "कुल मूल्य",
      orderDate: "ऑर्डर दिनांक",

      requested: "अनुरोधित",
      confirmed: "पुष्ट",
      processing: "प्रक्रिया में",
      ready: "तैयार",
      completed: "पूर्ण",
      cancelled: "रद्द",

      automaticallyRefreshed: "🔄 स्वतः रिफ्रेश",
      updated: "अपडेट",

      viewTraceability: "🔎 ट्रेसबिलिटी देखें",

      featureMyOrders: "मेरे ऑर्डर",
      featureMyOrdersDescription:
        "अपने कृषि उत्पाद अनुरोधों और ऑर्डर को देखें और ट्रैक करें।",

      supplyTracking: "सप्लाई ट्रैकिंग",
      supplyTrackingDescription:
        "CROPP खरीद नेटवर्क के माध्यम से उत्पादों की आवाजाही को ट्रैक करें।",

      sourceTraceability: "स्रोत ट्रेसबिलिटी",
      sourceTraceabilityDescription:
        "उत्पादों को उनके खरीद और कृषि स्रोत से जोड़ें।",

      productRequest: "📦 उत्पाद अनुरोध",
      availableThrough:
        "CROPP खरीद नेटवर्क के माध्यम से उपलब्ध।",
      requiredQuantity: "आवश्यक मात्रा",
      enterQuantity: "मात्रा दर्ज करें",
      estimatedValue: "अनुमानित मूल्य",

      cancel: "रद्द करें",
      creatingOrder: "ऑर्डर बनाया जा रहा है...",
      submitRequest: "अनुरोध भेजें",

      consumerAccountMissing:
        "उपभोक्ता खाते की जानकारी उपलब्ध नहीं है।",
      selectProduct: "कृपया कोई उत्पाद चुनें।",
      validQuantity: "कृपया मान्य मात्रा दर्ज करें।",
      orderCreated: "ऑर्डर सफलतापूर्वक बनाया गया।",
      unableCreateOrder:
        "ऑर्डर नहीं बनाया जा सका। कृपया पुनः प्रयास करें।",

      traceability: "🔗 CROPP ट्रेसबिलिटी",
      traceabilityLoading: "ट्रेसबिलिटी लोड हो रही है...",
      traceabilityLoadingDescription:
        "CROPP उत्पाद की खरीद और सप्लाई-चेन जानकारी प्राप्त कर रहा है।",

      traceabilityNotAvailable:
        "ट्रेसबिलिटी अभी उपलब्ध नहीं है",
      traceabilityAvailableAfter:
        "इस फसल के लिए खरीद बैच पूरा होने के बाद ट्रेसबिलिटी उपलब्ध होगी।",

      traceabilityId: "ट्रेसबिलिटी ID",
      crop: "🌾 फसल",
      sourceFarmer: "👨‍🌾 स्रोत किसान",
      procurementCenter: "🏢 खरीद केंद्र",
      batch: "📦 बैच",
      quality: "✅ गुणवत्ता",

      currentSupplyStage: "वर्तमान सप्लाई-चेन चरण",

      procurementInformation: "📋 खरीद जानकारी",
      procurementId: "खरीद ID",
      procurementDate: "खरीद दिनांक",
      centerDistrict: "केंद्र जिला",

      supplyChainJourney: "🚚 सप्लाई चेन यात्रा",
      events: "इवेंट",
      event: "इवेंट",

      noEvents: "अभी तक कोई सप्लाई-चेन इवेंट दर्ज नहीं है।",

      verifiedRecords:
        "🔐 CROPP खरीद रिकॉर्ड द्वारा सत्यापित",

      unknownStage: "अज्ञात चरण",

      farmerHarvest: "किसान की फसल",
      procurementCenterStage: "खरीद केंद्र",
      qualityCheck: "गुणवत्ता जांच",
      storage: "भंडारण",
      distribution: "वितरण",
      delivered: "डिलीवर किया गया",

      pending: "लंबित",
      passed: "पास",
      needsReview: "समीक्षा आवश्यक",
      failed: "असफल",

      traceabilityUnavailable:
        "ट्रेसबिलिटी जानकारी अभी उपलब्ध नहीं है।",
    },
  };

  const t = (key) => text[language]?.[key] || text.en[key] || key;

  // --------------------------------------------------
  // LOAD CROPS
  // --------------------------------------------------

  useEffect(() => {
    fetchCrops();
  }, []);

  // --------------------------------------------------
  // LOAD ORDERS
  // --------------------------------------------------

  useEffect(() => {
    if (!consumerId) {
      setOrdersLoading(false);
      return;
    }

    fetchOrders();

    const interval = setInterval(() => {
      fetchOrders(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [consumerId]);

  // --------------------------------------------------
  // FETCH CROPS
  // --------------------------------------------------

  const fetchCrops = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_BASE}/crops/`);

      setCrops(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to load crops:", err);

      setError(t("unableLoadProducts"));
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // FETCH ORDERS
  // --------------------------------------------------

  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) {
        setOrdersLoading(true);
      }

      setOrdersError("");

      const response = await axios.get(
        `${API_BASE}/orders/consumer/${consumerId}`
      );

      setOrders(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (err) {
      console.error("Failed to load orders:", err);

      if (!silent) {
        setOrdersError(t("unableLoadOrders"));
      }
    } finally {
      if (!silent) {
        setOrdersLoading(false);
      }
    }
  };

  // --------------------------------------------------
  // CROP HELPERS
  // --------------------------------------------------

  const filteredCrops = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return crops;
    }

    return crops.filter((crop) =>
      [
        crop.crop_name,
        crop.name,
        crop.category,
        crop.unit,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(term)
        )
    );
  }, [crops, search]);

  const getCropName = (crop) => {
    return (
      crop?.crop_name ||
      crop?.name ||
      t("agriculturalProduct")
    );
  };

  const getPrice = (crop) => {
    return (
      crop?.msp ??
      crop?.price ??
      crop?.msp_price ??
      crop?.minimum_support_price ??
      0
    );
  };

  const getUnit = (crop) => {
    return crop?.unit || "quintal";
  };

  // --------------------------------------------------
  // ORDER HELPERS
  // --------------------------------------------------

  const getStatusClass = (status) => {
    switch (status) {
      case "Pending":
        return "status-pending";

      case "Confirmed":
        return "status-approved";

      case "Processing":
        return "status-processing";

      case "Ready":
        return "status-ready";

      case "Completed":
        return "status-completed";

      case "Cancelled":
        return "status-cancelled";

      default:
        return "status-pending";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "Pending":
        return t("pending");

      case "Confirmed":
        return t("confirmed");

      case "Processing":
        return t("processing");

      case "Ready":
        return t("ready");

      case "Completed":
        return t("completed");

      case "Cancelled":
        return t("cancelled");

      default:
        return status;
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "—";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return String(dateValue);
    }

    return date.toLocaleString(
      isHindi ? "hi-IN" : "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  // --------------------------------------------------
  // TRACEABILITY HELPERS
  // --------------------------------------------------

  const formatTraceabilityStage = (stage) => {
    if (!stage) {
      return t("unknownStage");
    }

    switch (stage) {
      case "Farmer Harvest":
        return t("farmerHarvest");

      case "Procurement Center":
        return t("procurementCenterStage");

      case "Quality Check":
        return t("qualityCheck");

      case "Storage":
        return t("storage");

      case "Distribution":
        return t("distribution");

      case "Delivered":
        return t("delivered");

      default:
        return stage;
    }
  };

  const getTraceabilityStageClass = (stage) => {
    switch (stage) {
      case "Farmer Harvest":
        return "trace-stage-farmer";

      case "Procurement Center":
        return "trace-stage-procurement";

      case "Quality Check":
        return "trace-stage-quality";

      case "Storage":
        return "trace-stage-storage";

      case "Distribution":
        return "trace-stage-distribution";

      case "Delivered":
        return "trace-stage-delivered";

      default:
        return "trace-stage-default";
    }
  };

  const getQualityClass = (qualityStatus) => {
    switch (qualityStatus) {
      case "Passed":
        return "trace-quality-passed";

      case "Needs Review":
        return "trace-quality-review";

      case "Failed":
        return "trace-quality-failed";

      default:
        return "trace-quality-pending";
    }
  };

  const getQualityText = (qualityStatus) => {
    switch (qualityStatus) {
      case "Passed":
        return t("passed");

      case "Needs Review":
        return t("needsReview");

      case "Failed":
        return t("failed");

      case "Pending":
        return t("pending");

      default:
        return qualityStatus || t("pending");
    }
  };

  // --------------------------------------------------
  // OPEN TRACEABILITY
  // --------------------------------------------------

  const handleViewTraceability = async (order) => {
    setTraceabilityOrder(order);
    setTraceabilityData(null);
    setTraceabilityError("");
    setTraceabilityLoading(true);

    try {
      const response = await axios.get(
        `${API_BASE}/orders/${order.order_id}/traceability`
      );

      setTraceabilityData(response.data);
    } catch (err) {
      console.error(
        "Traceability loading failed:",
        err
      );

      const backendMessage =
        err.response?.data?.error ||
        t("traceabilityUnavailable");

      setTraceabilityError(backendMessage);
    } finally {
      setTraceabilityLoading(false);
    }
  };

  const closeTraceability = () => {
    if (traceabilityLoading) {
      return;
    }

    setTraceabilityOrder(null);
    setTraceabilityData(null);
    setTraceabilityError("");
  };

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  const handleLogout = () => {
    localStorage.removeItem("cropp_user");
    window.location.href = "/login";
  };

  // --------------------------------------------------
  // OPEN ORDER MODAL
  // --------------------------------------------------

  const handleOrderRequest = (crop) => {
    setSelectedCrop(crop);
    setQuantity("");
    setOrderMessage("");
  };

  // --------------------------------------------------
  // CREATE REAL ORDER
  // --------------------------------------------------

  const submitOrderRequest = async () => {
    if (!consumerId) {
      setOrderMessage(
        t("consumerAccountMissing")
      );
      return;
    }

    if (!selectedCrop) {
      setOrderMessage(t("selectProduct"));
      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      setOrderMessage(t("validQuantity"));
      return;
    }

    try {
      setSubmittingOrder(true);
      setOrderMessage("");

      const response = await axios.post(
        `${API_BASE}/orders/`,
        {
          consumer_id: Number(consumerId),
          crop_id: Number(selectedCrop.id),
          quantity: Number(quantity),
        }
      );

      const createdOrder = response.data?.order;

      setOrderMessage(
        `${t("orderCreated")} #${
          createdOrder?.order_id || ""
        }`
      );

      await fetchOrders(true);

      setQuantity("");
    } catch (err) {
      console.error(
        "Order creation failed:",
        err
      );

      const backendMessage =
        err.response?.data?.error ||
        t("unableCreateOrder");

      setOrderMessage(backendMessage);
    } finally {
      setSubmittingOrder(false);
    }
  };

  // --------------------------------------------------
  // ORDER STATS
  // --------------------------------------------------

  const totalOrders = orders.length;

  const activeOrders = orders.filter(
    (order) =>
      !["Completed", "Cancelled"].includes(
        order.status
      )
  ).length;

  const completedOrders = orders.filter(
    (order) => order.status === "Completed"
  ).length;

  const totalOrderValue = orders.reduce(
    (sum, order) =>
      sum + Number(order.total_amount || 0),
    0
  );

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="portal-page consumer-portal">

      {/* ==================================================
          HEADER
          ================================================== */}

      <div className="portal-header">
        <div>
          <span className="portal-badge">
            {t("consumerPortal")}
          </span>

          <h1>
            {t("welcome")},{" "}
            {user?.username || t("consumer")}!
          </h1>

          <p>
            {t("discover")}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {/* LANGUAGE BUTTON */}

          <button
            type="button"
            onClick={toggleLanguage}
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#166534",
              fontWeight: "600",
              cursor: "pointer",
              minWidth: "110px",
            }}
          >
            {isHindi
              ? "🇬🇧 English"
              : "🇮🇳 हिन्दी"}
          </button>

          {/* LOGOUT */}

          <button
            type="button"
            onClick={handleLogout}
          >
            {t("logout")}
          </button>
        </div>
      </div>

      {/* ==================================================
          SUMMARY
          ================================================== */}

      <div className="consumer-summary-grid">

        <div className="portal-card summary-card">
          <div className="portal-icon">
            🌾
          </div>

          <div>
            <h3>{crops.length}</h3>
            <p>
              {t("availableProducts")}
            </p>
          </div>
        </div>

        <div className="portal-card summary-card">
          <div className="portal-icon">
            📦
          </div>

          <div>
            <h3>{totalOrders}</h3>
            <p>
              {t("myOrders")}
            </p>
          </div>
        </div>

        <div className="portal-card summary-card">
          <div className="portal-icon">
            🚚
          </div>

          <div>
            <h3>{activeOrders}</h3>
            <p>
              {t("activeOrders")}
            </p>
          </div>
        </div>

        <div className="portal-card summary-card">
          <div className="portal-icon">
            💰
          </div>

          <div>
            <h3>
              ₹
              {totalOrderValue.toLocaleString(
                "en-IN"
              )}
            </h3>

            <p>
              {t("totalOrderValue")}
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================
          PRODUCTS
          ================================================== */}

      <div className="consumer-section">

        <div className="section-heading">

          <div>
            <h2>
              {t("browseProducts")}
            </h2>

            <p>
              {t("browseDescription")}
            </p>
          </div>

          <button
            onClick={fetchCrops}
            className="refresh-button"
          >
            {t("refresh")}
          </button>
        </div>

        {/* SEARCH */}

        <div className="consumer-search">
          <span>🔎</span>

          <input
            type="text"
            placeholder={t(
              "searchPlaceholder"
            )}
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>

        {/* LOADING */}

        {loading && (
          <div className="portal-card empty-state">

            <div className="portal-icon">
              ⏳
            </div>

            <h3>
              {t("loadingProducts")}
            </h3>

            <p>
              {t(
                "loadingProductsDescription"
              )}
            </p>

          </div>
        )}

        {/* ERROR */}

        {!loading && error && (
          <div className="portal-card empty-state error-state">

            <div className="portal-icon">
              ⚠️
            </div>

            <h3>
              {t("unableLoadProducts")}
            </h3>

            <p>
              {error}
            </p>

            <button
              onClick={fetchCrops}
            >
              {t("tryAgain")}
            </button>

          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          !error &&
          filteredCrops.length === 0 && (
            <div className="portal-card empty-state">

              <div className="portal-icon">
                🌾
              </div>

              <h3>
                {t("noProducts")}
              </h3>

              <p>
                {t(
                  "noProductsDescription"
                )}
              </p>

            </div>
          )}

        {/* PRODUCT GRID */}

        {!loading &&
          !error &&
          filteredCrops.length > 0 && (
            <div className="consumer-product-grid">

              {filteredCrops.map((crop) => (
                <div
                  className="portal-card consumer-product-card"
                  key={crop.id}
                >

                  <div className="product-top">

                    <div className="product-icon">
                      🌾
                    </div>

                    <span className="availability-badge">
                      {t("available")}
                    </span>

                  </div>

                  <h3>
                    {getCropName(crop)}
                  </h3>

                  <p className="product-category">
                    {crop.category ||
                      t(
                        "agriculturalProduct"
                      )}
                  </p>

                  <div className="product-price">

                    ₹
                    {Number(
                      getPrice(crop)
                    ).toLocaleString(
                      "en-IN"
                    )}

                    <span>
                      {" "}
                      / {getUnit(crop)}
                    </span>

                  </div>

                  <div className="product-details">

                    <div>
                      <span>
                        {t("source")}
                      </span>

                      <strong>
                        {t("croppNetwork")}
                      </strong>
                    </div>

                    <div>
                      <span>
                        {t("productId")}
                      </span>

                      <strong>
                        #{crop.id}
                      </strong>
                    </div>

                  </div>

                  <button
                    className="order-button"
                    onClick={() =>
                      handleOrderRequest(crop)
                    }
                  >
                    {t("requestProduct")}
                  </button>

                </div>
              ))}

            </div>
          )}

      </div>

      {/* ==================================================
          MY ORDERS
          ================================================== */}

      <div className="consumer-section">

        <div className="section-heading">

          <div>

            <h2>
              📦 {t("myOrders")}
            </h2>

            <p>
              {t("trackOrders")}
            </p>

          </div>

          <button
            onClick={() =>
              fetchOrders()
            }
            className="refresh-button"
          >
            {t("refreshOrders")}
          </button>

        </div>

        {/* ORDER LOADING */}

        {ordersLoading && (
          <div className="portal-card empty-state">

            <div className="portal-icon">
              ⏳
            </div>

            <h3>
              {t("loadingOrders")}
            </h3>

          </div>
        )}

        {/* ORDER ERROR */}

        {!ordersLoading &&
          ordersError && (
            <div className="portal-card empty-state error-state">

              <div className="portal-icon">
                ⚠️
              </div>

              <h3>
                {t("unableLoadOrders")}
              </h3>

              <p>
                {ordersError}
              </p>

              <button
                onClick={() =>
                  fetchOrders()
                }
              >
                {t("tryAgain")}
              </button>

            </div>
          )}

        {/* NO ORDERS */}

        {!ordersLoading &&
          !ordersError &&
          orders.length === 0 && (
            <div className="portal-card empty-state">

              <div className="portal-icon">
                📦
              </div>

              <h3>
                {t("noOrders")}
              </h3>

              <p>
                {t(
                  "noOrdersDescription"
                )}
              </p>

            </div>
          )}

        {/* ORDER LIST */}

        {!ordersLoading &&
          !ordersError &&
          orders.length > 0 && (
            <div className="consumer-orders-list">

              {orders.map((order) => (
                <div
                  className="portal-card consumer-order-card"
                  key={order.order_id}
                >

                  {/* ORDER HEADER */}

                  <div className="order-card-header">

                    <div>

                      <span className="order-id">
                        {t("order")} #
                        {order.order_id}
                      </span>

                      <h3>
                        🌾 {order.crop_name}
                      </h3>

                    </div>

                    <span
                      className={`order-status ${getStatusClass(
                        order.status
                      )}`}
                    >
                      {getStatusText(
                        order.status
                      )}
                    </span>

                  </div>

                  {/* ORDER DETAILS */}

                  <div className="order-card-details">

                    <div>
                      <span>
                        {t("quantity")}
                      </span>

                      <strong>
                        {Number(
                          order.quantity
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        {t("priceUnit")}
                      </span>

                      <strong>
                        ₹
                        {Number(
                          order.price_per_unit
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        {t("totalValue")}
                      </span>

                      <strong>
                        ₹
                        {Number(
                          order.total_amount
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        {t("orderDate")}
                      </span>

                      <strong>
                        {formatDate(
                          order.order_date
                        )}
                      </strong>
                    </div>

                  </div>

                  {/* ORDER PROGRESS */}

                  <div className="order-progress">

                    {/* STEP 1 */}

                    <div
                      className={
                        order.status ===
                        "Cancelled"
                          ? "progress-step cancelled"
                          : order.status !==
                            "Pending"
                          ? "progress-step completed"
                          : "progress-step active"
                      }
                    >
                      <span>1</span>

                      <small>
                        {t("requested")}
                      </small>
                    </div>

                    <div
                      className={
                        [
                          "Confirmed",
                          "Processing",
                          "Ready",
                          "Completed",
                        ].includes(
                          order.status
                        )
                          ? "progress-line completed"
                          : "progress-line"
                      }
                    />

                    {/* STEP 2 */}

                    <div
                      className={
                        [
                          "Confirmed",
                          "Processing",
                          "Ready",
                          "Completed",
                        ].includes(
                          order.status
                        )
                          ? "progress-step completed"
                          : "progress-step"
                      }
                    >
                      <span>2</span>

                      <small>
                        {t("confirmed")}
                      </small>
                    </div>

                    <div
                      className={
                        [
                          "Processing",
                          "Ready",
                          "Completed",
                        ].includes(
                          order.status
                        )
                          ? "progress-line completed"
                          : "progress-line"
                      }
                    />

                    {/* STEP 3 */}

                    <div
                      className={
                        [
                          "Processing",
                          "Ready",
                          "Completed",
                        ].includes(
                          order.status
                        )
                          ? "progress-step completed"
                          : "progress-step"
                      }
                    >
                      <span>3</span>

                      <small>
                        {t("processing")}
                      </small>
                    </div>

                    <div
                      className={
                        [
                          "Ready",
                          "Completed",
                        ].includes(
                          order.status
                        )
                          ? "progress-line completed"
                          : "progress-line"
                      }
                    />

                    {/* STEP 4 */}

                    <div
                      className={
                        [
                          "Ready",
                          "Completed",
                        ].includes(
                          order.status
                        )
                          ? "progress-step completed"
                          : "progress-step"
                      }
                    >
                      <span>4</span>

                      <small>
                        {t("ready")}
                      </small>
                    </div>

                    <div
                      className={
                        order.status ===
                        "Completed"
                          ? "progress-line completed"
                          : "progress-line"
                      }
                    />

                    {/* STEP 5 */}

                    <div
                      className={
                        order.status ===
                        "Completed"
                          ? "progress-step completed"
                          : "progress-step"
                      }
                    >
                      <span>5</span>

                      <small>
                        {t("completed")}
                      </small>
                    </div>

                  </div>

                  {/* ORDER FOOTER */}

                  <div className="order-card-footer">

                    <span>
                      {t(
                        "automaticallyRefreshed"
                      )}
                    </span>

                    <span>
                      {t("updated")}:{" "}
                      {formatDate(
                        order.updated_at
                      )}
                    </span>

                  </div>

                  {/* TRACEABILITY BUTTON */}

                  <div className="consumer-order-actions">

                    <button
                      className="traceability-button"
                      onClick={() =>
                        handleViewTraceability(
                          order
                        )
                      }
                    >
                      {t(
                        "viewTraceability"
                      )}
                    </button>

                  </div>

                </div>
              ))}

            </div>
          )}

      </div>

      {/* ==================================================
          FEATURES
          ================================================== */}

      <div className="consumer-feature-grid">

        <div className="portal-card feature-card">

          <div className="portal-icon">
            📦
          </div>

          <div>

            <h3>
              {t("featureMyOrders")}
            </h3>

            <p>
              {t(
                "featureMyOrdersDescription"
              )}
            </p>

          </div>

        </div>

        <div className="portal-card feature-card">

          <div className="portal-icon">
            🚚
          </div>

          <div>

            <h3>
              {t("supplyTracking")}
            </h3>

            <p>
              {t(
                "supplyTrackingDescription"
              )}
            </p>

          </div>

        </div>

        <div className="portal-card feature-card">

          <div className="portal-icon">
            🔗
          </div>

          <div>

            <h3>
              {t("sourceTraceability")}
            </h3>

            <p>
              {t(
                "sourceTraceabilityDescription"
              )}
            </p>

          </div>

        </div>

      </div>

      {/* ==================================================
          ORDER MODAL
          ================================================== */}

      {selectedCrop && (
        <div
          className="consumer-modal-overlay"
          onClick={() =>
            !submittingOrder &&
            setSelectedCrop(null)
          }
        >

          <div
            className="consumer-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="modal-header">

              <div>

                <span className="portal-badge">
                  {t("productRequest")}
                </span>

                <h2>
                  {getCropName(
                    selectedCrop
                  )}
                </h2>

              </div>

              <button
                className="modal-close"
                disabled={submittingOrder}
                onClick={() =>
                  setSelectedCrop(null)
                }
              >
                ✕
              </button>

            </div>

            {/* PRODUCT INFO */}

            <div className="modal-product-info">

              <div className="portal-icon">
                🌾
              </div>

              <div>

                <strong>
                  ₹
                  {Number(
                    getPrice(
                      selectedCrop
                    )
                  ).toLocaleString(
                    "en-IN"
                  )}
                  / {getUnit(
                    selectedCrop
                  )}
                </strong>

                <p>
                  {t(
                    "availableThrough"
                  )}
                </p>

              </div>

            </div>

            {/* QUANTITY */}

            <label>
              {t("requiredQuantity")}
            </label>

            <input
              type="number"
              min="1"
              step="0.01"
              placeholder={`${t(
                "enterQuantity"
              )} ${getUnit(
                selectedCrop
              )}`}
              value={quantity}
              disabled={submittingOrder}
              onChange={(e) => {
                setQuantity(
                  e.target.value
                );
                setOrderMessage("");
              }}
            />

            {/* ESTIMATED VALUE */}

            {quantity &&
              Number(quantity) > 0 && (
                <div className="estimated-order">

                  <span>
                    {t(
                      "estimatedValue"
                    )}
                  </span>

                  <strong>
                    ₹
                    {(
                      Number(quantity) *
                      Number(
                        getPrice(
                          selectedCrop
                        )
                      )
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </strong>

                </div>
              )}

            {/* ORDER MESSAGE */}

            {orderMessage && (
              <div
                className={
                  orderMessage.includes(
                    t("orderCreated")
                  )
                    ? "order-success-message"
                    : "order-error-message"
                }
              >

                {orderMessage.includes(
                  t("orderCreated")
                )
                  ? "✅"
                  : "⚠️"}{" "}
                {orderMessage}

              </div>
            )}

            {/* MODAL ACTIONS */}

            <div className="modal-actions">

              <button
                className="secondary-button"
                disabled={submittingOrder}
                onClick={() =>
                  setSelectedCrop(null)
                }
              >
                {t("cancel")}
              </button>

              <button
                className="order-button"
                disabled={submittingOrder}
                onClick={
                  submitOrderRequest
                }
              >
                {submittingOrder
                  ? t("creatingOrder")
                  : t("submitRequest")}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ==================================================
          TRACEABILITY MODAL
          ================================================== */}

      {traceabilityOrder && (
        <div
          className="consumer-modal-overlay traceability-overlay"
          onClick={closeTraceability}
        >

          <div
            className="consumer-modal traceability-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* TRACEABILITY HEADER */}

            <div className="modal-header traceability-modal-header">

              <div>

                <span className="portal-badge">
                  {t("traceability")}
                </span>

                <h2>
                  {
                    traceabilityOrder.crop_name
                  }
                </h2>

                <p className="trace-order-reference">
                  {t("order")} #
                  {
                    traceabilityOrder.order_id
                  }
                </p>

              </div>

              <button
                className="modal-close"
                disabled={
                  traceabilityLoading
                }
                onClick={
                  closeTraceability
                }
              >
                ✕
              </button>

            </div>

            {/* TRACEABILITY LOADING */}

            {traceabilityLoading && (
              <div className="traceability-loading">

                <div className="traceability-loading-icon">
                  🔄
                </div>

                <h3>
                  {t(
                    "traceabilityLoading"
                  )}
                </h3>

                <p>
                  {t(
                    "traceabilityLoadingDescription"
                  )}
                </p>

              </div>
            )}

            {/* TRACEABILITY ERROR */}

            {!traceabilityLoading &&
              traceabilityError && (
                <div className="traceability-empty">

                  <div className="traceability-empty-icon">
                    🔗
                  </div>

                  <h3>
                    {t(
                      "traceabilityNotAvailable"
                    )}
                  </h3>

                  <p>
                    {traceabilityError}
                  </p>

                  <small>
                    {t(
                      "traceabilityAvailableAfter"
                    )}
                  </small>

                </div>
              )}

            {/* TRACEABILITY CONTENT */}

            {!traceabilityLoading &&
              !traceabilityError &&
              traceabilityData?.traceability && (
                <div className="traceability-content">

                  {/* TRACEABILITY ID */}

                  <div className="traceability-id-card">

                    <div>

                      <span>
                        {t(
                          "traceabilityId"
                        )}
                      </span>

                      <strong>
                        {
                          traceabilityData
                            .traceability
                            .traceability_id
                        }
                      </strong>

                    </div>

                    <div className="traceability-id-icon">
                      🔗
                    </div>

                  </div>

                  {/* BASIC DETAILS */}

                  <div className="traceability-detail-grid">

                    <div className="trace-detail-card">

                      <span>
                        {t("crop")}
                      </span>

                      <strong>
                        {
                          traceabilityData
                            .traceability
                            .crop_name
                        }
                      </strong>

                    </div>

                    <div className="trace-detail-card">

                      <span>
                        {t(
                          "sourceFarmer"
                        )}
                      </span>

                      <strong>
                        {
                          traceabilityData
                            .traceability
                            .farmer_name
                        }
                      </strong>

                    </div>

                    <div className="trace-detail-card">

                      <span>
                        {t(
                          "procurementCenter"
                        )}
                      </span>

                      <strong>
                        {
                          traceabilityData
                            .traceability
                            .center_name
                        }
                      </strong>

                      <small>
                        {
                          traceabilityData
                            .traceability
                            .center_code
                        }
                      </small>

                    </div>

                    <div className="trace-detail-card">

                      <span>
                        {t("batch")}
                      </span>

                      <strong>
                        {
                          traceabilityData
                            .traceability
                            .batch_code
                        }
                      </strong>

                    </div>

                    <div className="trace-detail-card">

                      <span>
                        ⚖️ {t("quantity")}
                      </span>

                      <strong>
                        {Number(
                          traceabilityData
                            .traceability
                            .procurement_quantity ||
                            0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                    </div>

                    <div className="trace-detail-card">

                      <span>
                        {t("quality")}
                      </span>

                      <strong
                        className={getQualityClass(
                          traceabilityData
                            .traceability
                            .quality_status
                        )}
                      >
                        {getQualityText(
                          traceabilityData
                            .traceability
                            .quality_status
                        )}
                      </strong>

                    </div>

                  </div>

                  {/* CURRENT STATUS */}

                  <div className="trace-current-status">

                    <div>

                      <span>
                        {t(
                          "currentSupplyStage"
                        )}
                      </span>

                      <strong>
                        {formatTraceabilityStage(
                          traceabilityData
                            .traceability
                            .current_stage
                        )}
                      </strong>

                    </div>

                    <span
                      className={`trace-stage-badge ${getTraceabilityStageClass(
                        traceabilityData
                          .traceability
                          .current_stage
                      )}`}
                    >
                      {formatTraceabilityStage(
                        traceabilityData
                          .traceability
                          .current_stage
                      )}
                    </span>

                  </div>

                  {/* PROCUREMENT INFO */}

                  <div className="trace-section">

                    <div className="trace-section-title">

                      <h3>
                        {t(
                          "procurementInformation"
                        )}
                      </h3>

                    </div>

                    <div className="trace-info-grid">

                      <div>

                        <span>
                          {t(
                            "procurementId"
                          )}
                        </span>

                        <strong>
                          #
                          {
                            traceabilityData
                              .traceability
                              .procurement_id
                          }
                        </strong>

                      </div>

                      <div>

                        <span>
                          {t(
                            "procurementDate"
                          )}
                        </span>

                        <strong>
                          {formatDate(
                            traceabilityData
                              .traceability
                              .procurement_date
                          )}
                        </strong>

                      </div>

                      <div>

                        <span>
                          {t("priceUnit")}
                        </span>

                        <strong>
                          ₹
                          {Number(
                            traceabilityData
                              .traceability
                              .price_per_unit ||
                              0
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </strong>

                      </div>

                      <div>

                        <span>
                          {t(
                            "centerDistrict"
                          )}
                        </span>

                        <strong>
                          {
                            traceabilityData
                              .traceability
                              .center_district ||
                            "—"
                          }
                        </strong>

                      </div>

                    </div>

                  </div>

                  {/* SUPPLY CHAIN TIMELINE */}

                  <div className="trace-section">

                    <div className="trace-section-title">

                      <h3>
                        {t(
                          "supplyChainJourney"
                        )}
                      </h3>

                      <span>
                        {
                          traceabilityData
                            .events?.length ||
                          0
                        }{" "}
                        {t("events")}
                      </span>

                    </div>

                    <div className="trace-timeline">

                      {Array.isArray(
                        traceabilityData.events
                      ) &&
                        traceabilityData.events
                          .length > 0 &&
                        traceabilityData.events.map(
                          (event, index) => (
                            <div
                              className="trace-timeline-item"
                              key={
                                event.id ||
                                index
                              }
                            >

                              <div className="trace-timeline-marker">
                                {index + 1}
                              </div>

                              {index <
                                traceabilityData
                                  .events
                                  .length -
                                  1 && (
                                <div className="trace-timeline-line" />
                              )}

                              <div className="trace-timeline-content">

                                <div className="trace-event-header">

                                  <strong>
                                    {formatTraceabilityStage(
                                      event.stage
                                    )}
                                  </strong>

                                  <span>
                                    {event.event_status}
                                  </span>

                                </div>

                                <small>
                                  {formatDate(
                                    event.event_time
                                  )}
                                </small>

                                {event.notes && (
                                  <p>
                                    {
                                      event.notes
                                    }
                                  </p>
                                )}

                              </div>

                            </div>
                          )
                        )}

                      {(!traceabilityData.events ||
                        traceabilityData.events
                          .length === 0) && (
                        <div className="trace-no-events">
                          {t(
                            "noEvents"
                          )}
                        </div>
                      )}

                    </div>

                  </div>

                  {/* SOURCE FOOTER */}

                  <div className="traceability-footer">

                    <span>
                      {t(
                        "verifiedRecords"
                      )}
                    </span>

                    <span>
                      {t("updated")}:{" "}
                      {formatDate(
                        traceabilityData
                          .traceability
                          .updated_at
                      )}
                    </span>

                  </div>

                </div>
              )}

          </div>

        </div>
      )}

    </div>
  );
}

export default ConsumerDashboard;