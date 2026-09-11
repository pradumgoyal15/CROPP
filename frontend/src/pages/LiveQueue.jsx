import { useEffect, useMemo, useState } from "react";

import API from "../services/api";

import { useLanguage } from "../components/LanguageContext";

function LiveQueue() {
  const { language } = useLanguage();
  const isHindi = language === "hi";

  const [procurements, setProcurements] = useState([]);
  const [centers, setCenters] = useState([]);
  const [search, setSearch] = useState("");
  const [centerFilter, setCenterFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState("");

  /* =========================================================
     FETCH QUEUE
  ========================================================= */

  const fetchQueue = async (showLoader = false) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const response = await API.get("/procurements/");

      setProcurements(response.data || []);
      setError("");
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching live queue:", err);

      setError(
        err.response?.data?.error ||
          (isHindi
            ? "लाइव कतार लोड करने में असमर्थ।"
            : "Unable to load live queue.")
      );
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  /* =========================================================
     FETCH CENTERS
  ========================================================= */

  const fetchCenters = async () => {
    try {
      const response = await API.get("/centers/");
      setCenters(response.data || []);
    } catch (err) {
      console.error("Error fetching centers:", err);
    }
  };

  /* =========================================================
     INITIAL LOAD + AUTO REFRESH
  ========================================================= */

  useEffect(() => {
    fetchQueue(true);
    fetchCenters();

    const interval = setInterval(() => {
      fetchQueue(false);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  /* =========================================================
     ACTIVE QUEUE
  ========================================================= */

  const activeQueue = useMemo(() => {
    return procurements
      .filter(
        (item) =>
          item.status === "Pending" ||
          item.status === "Approved"
      )
      .sort((a, b) => {
        const centerCompare = String(
          a.center_name || ""
        ).localeCompare(
          String(b.center_name || "")
        );

        if (centerCompare !== 0) {
          return centerCompare;
        }

        const dateCompare = String(
          a.procurement_date || ""
        ).localeCompare(
          String(b.procurement_date || "")
        );

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return (
          Number(a.queue_position || 999999) -
          Number(b.queue_position || 999999)
        );
      });
  }, [procurements]);

  /* =========================================================
     FILTER QUEUE
  ========================================================= */

  const filteredQueue = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    return activeQueue.filter((item) => {
      const matchesSearch =
        !searchText ||
        String(item.farmer_name || "")
          .toLowerCase()
          .includes(searchText) ||
        String(item.farmer_phone || "")
          .toLowerCase()
          .includes(searchText) ||
        String(item.crop_name || "")
          .toLowerCase()
          .includes(searchText) ||
        String(item.center_name || "")
          .toLowerCase()
          .includes(searchText) ||
        String(item.queue_number || "")
          .toLowerCase()
          .includes(searchText);

      const matchesCenter =
        centerFilter === "All" ||
        String(item.center_id) ===
          String(centerFilter);

      const matchesDate =
        !dateFilter ||
        normalizeDate(item.procurement_date) ===
          dateFilter;

      return (
        matchesSearch &&
        matchesCenter &&
        matchesDate
      );
    });
  }, [
    activeQueue,
    search,
    centerFilter,
    dateFilter,
  ]);

  /* =========================================================
     STATISTICS
  ========================================================= */

  const stats = useMemo(() => {
    const pending = activeQueue.filter(
      (item) => item.status === "Pending"
    ).length;

    const approved = activeQueue.filter(
      (item) => item.status === "Approved"
    ).length;

    const totalQuantity = activeQueue.reduce(
      (sum, item) =>
        sum + Number(item.quantity || 0),
      0
    );

    const centersInUse = new Set(
      activeQueue.map((item) => item.center_id)
    ).size;

    return {
      total: activeQueue.length,
      pending,
      approved,
      totalQuantity,
      centersInUse,
    };
  }, [activeQueue]);

  /* =========================================================
     UPDATE STATUS
  ========================================================= */

  const updateStatus = async (
    procurement,
    newStatus
  ) => {
    const statusMessages = {
      Approved: isHindi
        ? "क्या आप इस किसान की खरीद अनुरोध को स्वीकृत करना चाहते हैं?"
        : "Approve this farmer's procurement request?",

      Completed: isHindi
        ? "क्या आप इस खरीद को पूर्ण करना चाहते हैं?"
        : "Mark this procurement as completed?",

      Cancelled: isHindi
        ? "क्या आप इस खरीद अनुरोध को रद्द करना चाहते हैं?"
        : "Cancel this procurement request?",

      Pending: isHindi
        ? "क्या आप इस खरीद को फिर से लंबित स्थिति में भेजना चाहते हैं?"
        : "Move this procurement back to pending?",
    };

    const confirmed = window.confirm(
      statusMessages[newStatus] ||
        (isHindi
          ? `स्थिति को ${getStatusLabel(
              newStatus
            )} में बदलें?`
          : `Change status to ${newStatus}?`)
    );

    if (!confirmed) {
      return;
    }

    setUpdatingId(procurement.procurement_id);

    try {
      await API.put(
        `/procurements/${procurement.procurement_id}`,
        {
          farmer_id: procurement.farmer_id,
          crop_id: procurement.crop_id,
          center_id: procurement.center_id,
          quantity: procurement.quantity,
          price_per_unit:
            procurement.price_per_unit,
          procurement_date:
            normalizeDate(
              procurement.procurement_date
            ),
          status: newStatus,
        }
      );

      await fetchQueue(false);

      if (newStatus === "Approved") {
        alert(
          isHindi
            ? "खरीद सफलतापूर्वक स्वीकृत हो गई।"
            : "Procurement approved successfully."
        );
      } else if (newStatus === "Completed") {
        alert(
          isHindi
            ? "खरीद सफलतापूर्वक पूर्ण हो गई।"
            : "Procurement completed successfully."
        );
      } else if (newStatus === "Cancelled") {
        alert(
          isHindi
            ? "खरीद सफलतापूर्वक रद्द हो गई।"
            : "Procurement cancelled successfully."
        );
      }
    } catch (err) {
      console.error(
        "Error updating procurement status:",
        err
      );

      alert(
        err.response?.data?.error ||
          (isHindi
            ? "खरीद की स्थिति अपडेट करने में विफल।"
            : "Failed to update procurement status.")
      );
    } finally {
      setUpdatingId(null);
    }
  };

  /* =========================================================
     STATUS CLASS
  ========================================================= */

  const getStatusClass = (status) => {
    switch (status) {
      case "Pending":
        return "status pending";

      case "Approved":
        return "status approved";

      case "Completed":
        return "status completed";

      case "Cancelled":
        return "status cancelled";

      default:
        return "status";
    }
  };

  /* =========================================================
     STATUS LABEL
  ========================================================= */

  const getStatusLabel = (status) => {
    if (!isHindi) return status;

    const translations = {
      Pending: "लंबित",
      Approved: "स्वीकृत",
      Completed: "पूर्ण",
      Cancelled: "रद्द",
    };

    return translations[status] || status;
  };

  /* =========================================================
     WAIT TIME
  ========================================================= */

  const getWaitTime = (item) => {
    if (
      item.estimated_wait_minutes !==
      undefined
    ) {
      return Number(
        item.estimated_wait_minutes
      );
    }

    return (
      Number(item.people_ahead || 0) * 5
    );
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="page-container live-queue-page">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="page-header">
        <div>
          <h1>
            {isHindi
              ? "लाइव कतार प्रबंधन"
              : "Live Queue Management"}
          </h1>

          <p>
            {isHindi
              ? "किसान खरीद कतारों की निगरानी करें और अनुरोधों को रियल टाइम में प्रोसेस करें।"
              : "Monitor farmer procurement queues and process requests in real time."}
          </p>

          {lastUpdated && (
            <small className="queue-last-updated">
              {isHindi
                ? "अंतिम अपडेट:"
                : "Last updated:"}{" "}
              {lastUpdated.toLocaleTimeString(
                "en-IN"
              )}
            </small>
          )}
        </div>

        <button
          className="add-btn queue-refresh-btn"
          onClick={() => fetchQueue(false)}
          disabled={loading}
        >
          🔄{" "}
          {isHindi
            ? "कतार रिफ्रेश करें"
            : "Refresh Queue"}
        </button>
      </div>

      {/* =====================================================
          STATISTICS
      ===================================================== */}

      <div className="stats-grid live-queue-stats">
        <div className="stat-card">
          <div className="stat-icon">
            👥
          </div>

          <div>
            <span>
              {isHindi
                ? "सक्रिय कतार"
                : "Active Queue"}
            </span>

            <h2>{stats.total}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            ⏳
          </div>

          <div>
            <span>
              {isHindi ? "लंबित" : "Pending"}
            </span>

            <h2>{stats.pending}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            ✅
          </div>

          <div>
            <span>
              {isHindi ? "स्वीकृत" : "Approved"}
            </span>

            <h2>{stats.approved}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            ⚖️
          </div>

          <div>
            <span>
              {isHindi
                ? "कतार में मात्रा"
                : "Queued Quantity"}
            </span>

            <h2>
              {stats.totalQuantity.toLocaleString(
                "en-IN"
              )}
            </h2>

            <small>
              {isHindi ? "क्विंटल" : "Quintal"}
            </small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            📍
          </div>

          <div>
            <span>
              {isHindi
                ? "सक्रिय केंद्र"
                : "Active Centers"}
            </span>

            <h2>{stats.centersInUse}</h2>
          </div>
        </div>
      </div>

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <div className="queue-filter-card">
        <div className="queue-filter-group queue-search-group">
          <label>
            {isHindi ? "खोजें" : "Search"}
          </label>

          <input
            type="text"
            className="search-input"
            placeholder={
              isHindi
                ? "किसान, फसल, केंद्र या कतार नंबर..."
                : "Farmer, crop, center or queue number..."
            }
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>

        <div className="queue-filter-group">
          <label>
            {isHindi
              ? "खरीद केंद्र"
              : "Procurement Center"}
          </label>

          <select
            value={centerFilter}
            onChange={(e) =>
              setCenterFilter(e.target.value)
            }
          >
            <option value="All">
              {isHindi
                ? "सभी केंद्र"
                : "All Centers"}
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

        <div className="queue-filter-group">
          <label>
            {isHindi
              ? "खरीद दिनांक"
              : "Procurement Date"}
          </label>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) =>
              setDateFilter(e.target.value)
            }
          />
        </div>

        <button
          className="queue-clear-btn"
          onClick={() => {
            setSearch("");
            setCenterFilter("All");
            setDateFilter("");
          }}
        >
          {isHindi
            ? "फ़िल्टर साफ़ करें"
            : "Clear Filters"}
        </button>
      </div>

      {/* =====================================================
          INFORMATION BANNER
      ===================================================== */}

      <div className="queue-live-banner">
        <div className="queue-live-dot"></div>

        <div>
          <strong>
            {isHindi
              ? "लाइव कतार सक्रिय"
              : "Live Queue Active"}
          </strong>

          <span>
            {isHindi
              ? "कतार हर 10 सेकंड में अपने आप रिफ्रेश होती है।"
              : "Queue automatically refreshes every 10 seconds."}
          </span>
        </div>
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="queue-error">
          ⚠️ {error}
        </div>
      )}

      {/* =====================================================
          TABLE
      ===================================================== */}

      <div className="table-container queue-table-container">
        {loading ? (
          <div className="loading">
            {isHindi
              ? "लाइव कतार लोड हो रही है..."
              : "Loading live queue..."}
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="queue-empty">
            <div className="queue-empty-icon">
              🎫
            </div>

            <h3>
              {isHindi
                ? "कोई सक्रिय कतार अनुरोध नहीं है"
                : "No active queue requests"}
            </h3>

            <p>
              {isHindi
                ? "वर्तमान में आपके फ़िल्टर से मेल खाने वाले कोई किसान खरीद अनुरोध नहीं हैं।"
                : "There are currently no farmer procurement requests matching your filters."}
            </p>
          </div>
        ) : (
          <table className="data-table live-queue-table">
            <thead>
              <tr>
                <th>
                  {isHindi ? "कतार" : "Queue"}
                </th>

                <th>
                  {isHindi
                    ? "स्थिति/स्थान"
                    : "Position"}
                </th>

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
                  {isHindi
                    ? "मात्रा"
                    : "Quantity"}
                </th>

                <th>
                  {isHindi ? "प्रतीक्षा" : "Wait"}
                </th>

                <th>
                  {isHindi ? "स्थिति" : "Status"}
                </th>

                <th>
                  {isHindi ? "कार्य" : "Action"}
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredQueue.map(
                (procurement) => {
                  const waitMinutes =
                    getWaitTime(procurement);

                  return (
                    <tr
                      key={
                        procurement.procurement_id
                      }
                    >
                      {/* QUEUE NUMBER */}

                      <td>
                        <div className="queue-ticket">
                          <strong>
                            {procurement.queue_number ||
                              "—"}
                          </strong>

                          <small>
                            #
                            {
                              procurement.procurement_id
                            }
                          </small>
                        </div>
                      </td>

                      {/* POSITION */}

                      <td>
                        <div className="queue-position">
                          <strong>
                            #
                            {procurement.current_queue_position ||
                              procurement.queue_position ||
                              "—"}
                          </strong>

                          <small>
                            {Number(
                              procurement.people_ahead ||
                                0
                            )}{" "}
                            {isHindi
                              ? "आगे"
                              : "ahead"}
                          </small>
                        </div>
                      </td>

                      {/* FARMER */}

                      <td>
                        <strong>
                          {procurement.farmer_name ||
                            (isHindi
                              ? "अज्ञात किसान"
                              : "Unknown Farmer")}
                        </strong>

                        <br />

                        <small>
                          {procurement.farmer_phone ||
                            (isHindi
                              ? "फोन उपलब्ध नहीं"
                              : "No phone")}
                        </small>
                      </td>

                      {/* CROP */}

                      <td>
                        {procurement.crop_name ||
                          "—"}

                        <br />

                        <small>
                          {Number(
                            procurement.price_per_unit ||
                              0
                          ).toLocaleString(
                            "en-IN"
                          )}{" "}
                          /{" "}
                          {isHindi
                            ? "इकाई"
                            : "unit"}
                        </small>
                      </td>

                      {/* CENTER */}

                      <td>
                        <strong>
                          {procurement.center_name ||
                            "—"}
                        </strong>

                        <br />

                        <small>
                          {procurement.center_code ||
                            ""}
                        </small>
                      </td>

                      {/* QUANTITY */}

                      <td>
                        <strong>
                          {Number(
                            procurement.quantity ||
                              0
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </strong>

                        <br />

                        <small>
                          {isHindi
                            ? "क्विंटल"
                            : "Quintal"}
                        </small>
                      </td>

                      {/* WAIT */}

                      <td>
                        <div className="queue-wait">
                          ⏱️{" "}
                          <strong>
                            {waitMinutes}
                          </strong>

                          <small>
                            {isHindi
                              ? "मिनट अनुमानित"
                              : "min approx."}
                          </small>
                        </div>
                      </td>

                      {/* STATUS */}

                      <td>
                        <span
                          className={getStatusClass(
                            procurement.status
                          )}
                        >
                          {getStatusLabel(
                            procurement.status
                          )}
                        </span>
                      </td>

                      {/* ACTIONS */}

                      <td>
                        <div className="queue-actions">
                          {procurement.status ===
                            "Pending" && (
                            <button
                              className="queue-action approve"
                              onClick={() =>
                                updateStatus(
                                  procurement,
                                  "Approved"
                                )
                              }
                              disabled={
                                updatingId ===
                                procurement.procurement_id
                              }
                            >
                              {updatingId ===
                              procurement.procurement_id
                                ? "..."
                                : isHindi
                                ? "स्वीकृत करें"
                                : "Approve"}
                            </button>
                          )}

                          {procurement.status ===
                            "Approved" && (
                            <button
                              className="queue-action complete"
                              onClick={() =>
                                updateStatus(
                                  procurement,
                                  "Completed"
                                )
                              }
                              disabled={
                                updatingId ===
                                procurement.procurement_id
                              }
                            >
                              {updatingId ===
                              procurement.procurement_id
                                ? "..."
                                : isHindi
                                ? "पूर्ण करें"
                                : "Complete"}
                            </button>
                          )}

                          <button
                            className="queue-action cancel"
                            onClick={() =>
                              updateStatus(
                                procurement,
                                "Cancelled"
                              )
                            }
                            disabled={
                              updatingId ===
                              procurement.procurement_id
                            }
                          >
                            {isHindi
                              ? "रद्द करें"
                              : "Cancel"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* =====================================================
          FOOTER INFO
      ===================================================== */}

      {!loading &&
        filteredQueue.length > 0 && (
          <div className="queue-footer-info">
            {isHindi
              ? "दिखाए जा रहे हैं"
              : "Showing"}{" "}
            <strong>
              {filteredQueue.length}
            </strong>{" "}
            {isHindi
              ? `सक्रिय कतार अनुरोध${
                  filteredQueue.length !== 1
                    ? "ों"
                    : ""
                }`
              : `active queue request${
                  filteredQueue.length !== 1
                    ? "s"
                    : ""
                }`}
          </div>
        )}
    </div>
  );
}

/* ============================================================
   DATE NORMALIZATION
============================================================ */

function normalizeDate(value) {
  if (!value) {
    return "";
  }

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default LiveQueue;