import { useEffect, useMemo, useState } from "react";

import axios from "axios";

import {
  ShoppingCart,
  RefreshCw,
  Search,
  CheckCircle,
  Clock,
  Package,
  XCircle,
  IndianRupee,
  Trash2,
  ChevronDown,
} from "lucide-react";

import { useLanguage } from "../components/LanguageContext";

const API_BASE = "http://localhost:5000/api";

const STATUS_OPTIONS = [
  "Pending",
  "Confirmed",
  "Processing",
  "Ready",
  "Completed",
  "Cancelled",
];

function ConsumerOrders() {
  const { language } = useLanguage();
  const isHindi = language === "hi";

  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");

  const fetchOrders = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await axios.get(`${API_BASE}/orders/`);

      setOrders(
        Array.isArray(response.data)
          ? response.data
          : response.data.orders || []
      );
    } catch (err) {
      console.error("Failed to load consumer orders:", err);

      setError(
        err.response?.data?.error ||
          (isHindi
            ? "उपभोक्ता ऑर्डर लोड करने में असमर्थ।"
            : "Unable to load consumer orders.")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const interval = setInterval(() => {
      fetchOrders(true);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const filteredOrders = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "All" ||
        String(order.status || "") === statusFilter;

      const searchableText = [
        order.id,
        order.order_id,
        order.consumer_id,
        order.consumer_name,
        order.username,
        order.crop_name,
        order.crop,
        order.crop_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !searchText || searchableText.includes(searchText);

      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  const stats = useMemo(() => {
    const total = orders.length;

    const pending = orders.filter(
      (order) => order.status === "Pending"
    ).length;

    const active = orders.filter((order) =>
      ["Confirmed", "Processing", "Ready"].includes(
        order.status
      )
    ).length;

    const completed = orders.filter(
      (order) => order.status === "Completed"
    ).length;

    const totalValue = orders.reduce(
      (sum, order) =>
        sum + Number(order.total_amount || 0),
      0
    );

    return {
      total,
      pending,
      active,
      completed,
      totalValue,
    };
  }, [orders]);

  const formatCurrency = (value) => {
    return `₹${Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getOrderId = (order) => {
    return order.id ?? order.order_id;
  };

  const getConsumerName = (order) => {
    return (
      order.consumer_name ||
      order.username ||
      `Consumer #${order.consumer_id || "—"}`
    );
  };

  const getCropName = (order) => {
    return (
      order.crop_name ||
      order.crop ||
      `Crop #${order.crop_id || "—"}`
    );
  };

  const getStatusLabel = (status) => {
    if (!isHindi) return status;

    const translations = {
      Pending: "लंबित",
      Confirmed: "पुष्टि की गई",
      Processing: "प्रोसेसिंग",
      Ready: "तैयार",
      Completed: "पूर्ण",
      Cancelled: "रद्द",
    };

    return translations[status] || status;
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      setUpdatingId(orderId);
      setError("");

      await axios.put(
        `${API_BASE}/orders/${orderId}/status`,
        {
          status: newStatus,
        }
      );

      await fetchOrders(true);
    } catch (err) {
      console.error("Failed to update order:", err);

      setError(
        err.response?.data?.error ||
          (isHindi
            ? "ऑर्डर की स्थिति अपडेट करने में असमर्थ।"
            : "Unable to update order status.")
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteOrder = async (orderId) => {
    const confirmed = window.confirm(
      isHindi
        ? "क्या आप इस उपभोक्ता ऑर्डर को हटाना चाहते हैं?"
        : "Are you sure you want to delete this consumer order?"
    );

    if (!confirmed) return;

    try {
      setUpdatingId(orderId);
      setError("");

      await axios.delete(
        `${API_BASE}/orders/${orderId}`
      );

      await fetchOrders(true);
    } catch (err) {
      console.error("Failed to delete order:", err);

      setError(
        err.response?.data?.error ||
          (isHindi
            ? "उपभोक्ता ऑर्डर हटाने में असमर्थ।"
            : "Unable to delete consumer order.")
      );
    } finally {
      setUpdatingId(null);
    }
  };

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

  return (
    <div className="page-container consumer-orders-page">
      {/* PAGE HEADER */}

      <div className="page-top">
        <div>
          <div className="page-title-row">
            <div className="page-icon">
              <ShoppingCart size={24} />
            </div>

            <div>
              <h1>
                {isHindi
                  ? "उपभोक्ता ऑर्डर"
                  : "Consumer Orders"}
              </h1>

              <p>
                {isHindi
                  ? "CROPP पर उपभोक्ता ऑर्डर प्रबंधित और मॉनिटर करें।"
                  : "Manage and monitor consumer orders across CROPP."}
              </p>
            </div>
          </div>
        </div>

        <button
          className="primary-btn"
          onClick={() => fetchOrders(true)}
          disabled={refreshing}
        >
          <RefreshCw
            size={18}
            className={refreshing ? "spin" : ""}
          />

          {refreshing
            ? isHindi
              ? "रिफ्रेश हो रहा है..."
              : "Refreshing..."
            : isHindi
            ? "रिफ्रेश"
            : "Refresh"}
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div className="error-message">
          <XCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* STATISTICS */}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <ShoppingCart size={22} />
          </div>

          <div>
            <span>
              {isHindi
                ? "कुल ऑर्डर"
                : "Total Orders"}
            </span>

            <strong>{stats.total}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Clock size={22} />
          </div>

          <div>
            <span>
              {isHindi ? "लंबित" : "Pending"}
            </span>

            <strong>{stats.pending}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Package size={22} />
          </div>

          <div>
            <span>
              {isHindi
                ? "सक्रिय ऑर्डर"
                : "Active Orders"}
            </span>

            <strong>{stats.active}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <CheckCircle size={22} />
          </div>

          <div>
            <span>
              {isHindi ? "पूर्ण" : "Completed"}
            </span>

            <strong>{stats.completed}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <IndianRupee size={22} />
          </div>

          <div>
            <span>
              {isHindi
                ? "कुल ऑर्डर मूल्य"
                : "Total Order Value"}
            </span>

            <strong>
              {formatCurrency(stats.totalValue)}
            </strong>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}

      <div className="data-card">
        <div className="farmers-toolbar">
          <div className="search-bar">
            <Search size={18} />

            <input
              type="text"
              placeholder={
                isHindi
                  ? "उपभोक्ता, फसल या ऑर्डर ID से खोजें..."
                  : "Search by consumer, crop or order ID..."
              }
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>

          <div className="filter-group">
            <label>
              {isHindi ? "स्थिति" : "Status"}
            </label>

            <div className="select-wrapper">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
              >
                <option value="All">
                  {isHindi
                    ? "सभी स्थितियां"
                    : "All Statuses"}
                </option>

                {STATUS_OPTIONS.map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>

              <ChevronDown size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* ORDERS TABLE */}

      <div className="data-card orders-table-card">
        <div className="section-header">
          <div>
            <h2>
              {isHindi
                ? "उपभोक्ता ऑर्डर"
                : "Consumer Orders"}
            </h2>

            <p>
              {isHindi
                ? `${filteredOrders.length} में से ${orders.length} ऑर्डर दिखाए जा रहे हैं`
                : `Showing ${filteredOrders.length} of ${orders.length} orders`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            <RefreshCw
              size={28}
              className="spin"
            />

            <h3>
              {isHindi
                ? "ऑर्डर लोड हो रहे हैं..."
                : "Loading orders..."}
            </h3>

            <p>
              {isHindi
                ? "नवीनतम उपभोक्ता ऑर्डर प्राप्त किए जा रहे हैं।"
                : "Fetching the latest consumer orders."}
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <ShoppingCart size={40} />

            <h3>
              {isHindi
                ? "कोई उपभोक्ता ऑर्डर नहीं मिला"
                : "No consumer orders found"}
            </h3>

            <p>
              {search || statusFilter !== "All"
                ? isHindi
                  ? "अपनी खोज या स्थिति फ़िल्टर बदलकर देखें।"
                  : "Try changing your search or status filter."
                : isHindi
                ? "जब ग्राहक ऑर्डर देंगे तो उपभोक्ता ऑर्डर यहां दिखाई देंगे।"
                : "Consumer orders will appear here when customers place orders."}
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table consumer-orders-table">
              <thead>
                <tr>
                  <th>
                    {isHindi ? "ऑर्डर ID" : "Order ID"}
                  </th>

                  <th>
                    {isHindi ? "उपभोक्ता" : "Consumer"}
                  </th>

                  <th>
                    {isHindi ? "फसल" : "Crop"}
                  </th>

                  <th>
                    {isHindi ? "मात्रा" : "Quantity"}
                  </th>

                  <th>
                    {isHindi
                      ? "कीमत / इकाई"
                      : "Price / Unit"}
                  </th>

                  <th>
                    {isHindi
                      ? "कुल राशि"
                      : "Total Amount"}
                  </th>

                  <th>
                    {isHindi
                      ? "ऑर्डर दिनांक"
                      : "Order Date"}
                  </th>

                  <th>
                    {isHindi ? "स्थिति" : "Status"}
                  </th>

                  <th>
                    {isHindi ? "कार्य" : "Actions"}
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => {
                  const orderId = getOrderId(order);

                  return (
                    <tr key={orderId}>
                      <td>
                        <strong>
                          #{orderId}
                        </strong>
                      </td>

                      <td>
                        <div className="order-consumer">
                          <strong>
                            {getConsumerName(order)}
                          </strong>

                          {order.consumer_id && (
                            <small>
                              {isHindi
                                ? `ID: ${order.consumer_id}`
                                : `ID: ${order.consumer_id}`}
                            </small>
                          )}
                        </div>
                      </td>

                      <td>
                        <strong>
                          {getCropName(order)}
                        </strong>
                      </td>

                      <td>
                        {Number(
                          order.quantity || 0
                        ).toLocaleString("en-IN")}
                      </td>

                      <td>
                        {formatCurrency(
                          order.price_per_unit
                        )}
                      </td>

                      <td>
                        <strong>
                          {formatCurrency(
                            order.total_amount
                          )}
                        </strong>
                      </td>

                      <td>
                        {formatDate(
                          order.order_date
                        )}
                      </td>

                      <td>
                        <span
                          className={`status-badge ${getStatusClass(
                            order.status
                          )}`}
                        >
                          {getStatusLabel(
                            order.status || "Pending"
                          )}
                        </span>
                      </td>

                      <td>
                        <div className="order-actions">
                          <div className="status-select-wrapper">
                            <select
                              value={
                                order.status ||
                                "Pending"
                              }
                              onChange={(e) =>
                                updateStatus(
                                  orderId,
                                  e.target.value
                                )
                              }
                              disabled={
                                updatingId === orderId
                              }
                            >
                              {STATUS_OPTIONS.map(
                                (status) => (
                                  <option
                                    key={status}
                                    value={status}
                                  >
                                    {getStatusLabel(
                                      status
                                    )}
                                  </option>
                                )
                              )}
                            </select>

                            <ChevronDown
                              size={14}
                            />
                          </div>

                          <button
                            className="icon-btn danger"
                            title={
                              isHindi
                                ? "ऑर्डर हटाएं"
                                : "Delete order"
                            }
                            onClick={() =>
                              deleteOrder(orderId)
                            }
                            disabled={
                              updatingId === orderId
                            }
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConsumerOrders;