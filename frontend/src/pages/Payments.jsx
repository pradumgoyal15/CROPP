import { useEffect, useMemo, useState } from "react";

import API from "../services/api";
import { useLanguage } from "../components/LanguageContext";

function Payments() {
  const { language } = useLanguage();
  const isHindi = language === "hi";

  const [payments, setPayments] = useState([]);
  const [procurements, setProcurements] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    procurement_id: "",
    payment_method: "Bank Transfer",
    payment_status: "Pending",
    payment_date: "",
    transaction_reference: "",
  });

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  useEffect(() => {
    fetchPayments();
    fetchProcurements();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await API.get("/payments/");
      setPayments(response.data);
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  };

  const fetchProcurements = async () => {
    try {
      const response = await API.get("/procurements/");
      setProcurements(response.data);
    } catch (error) {
      console.error("Error fetching procurements:", error);
    }
  };

  // ==========================================================
  // PAYMENT STATISTICS
  // ==========================================================

  const stats = useMemo(() => {
    const total = payments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );

    const completedPayments = payments.filter(
      (payment) => payment.payment_status === "Completed"
    );

    const pendingPayments = payments.filter(
      (payment) => payment.payment_status === "Pending"
    );

    const failedPayments = payments.filter(
      (payment) => payment.payment_status === "Failed"
    );

    const completedAmount = completedPayments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );

    const pendingAmount = pendingPayments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );

    return {
      total,
      completedAmount,
      pendingAmount,
      completedCount: completedPayments.length,
      pendingCount: pendingPayments.length,
      failedCount: failedPayments.length,
    };
  }, [payments]);

  // ==========================================================
  // FILTER PAYMENTS
  // ==========================================================

  const filteredPayments = payments.filter((payment) => {
    const text = search.toLowerCase();

    const matchesSearch =
      String(payment.payment_id || "")
        .toLowerCase()
        .includes(text) ||
      String(payment.procurement_id || "")
        .toLowerCase()
        .includes(text) ||
      payment.farmer_name?.toLowerCase().includes(text) ||
      payment.crop_name?.toLowerCase().includes(text) ||
      payment.transaction_reference?.toLowerCase().includes(text) ||
      payment.payment_method?.toLowerCase().includes(text);

    const matchesStatus =
      statusFilter === "All" ||
      payment.payment_status === statusFilter;

    const matchesMethod =
      methodFilter === "All" ||
      payment.payment_method === methodFilter;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  // ==========================================================
  // STATUS CLASS
  // ==========================================================

  const getStatusClass = (status) => {
    switch (status) {
      case "Completed":
        return "status completed";
      case "Pending":
        return "status pending";
      case "Failed":
        return "status cancelled";
      default:
        return "status";
    }
  };

  const getStatusLabel = (status) => {
    if (!isHindi) {
      return status;
    }

    switch (status) {
      case "Completed":
        return "पूर्ण";
      case "Pending":
        return "लंबित";
      case "Failed":
        return "विफल";
      default:
        return status;
    }
  };

  const getPaymentMethodLabel = (method) => {
    if (!isHindi) {
      return method;
    }

    switch (method) {
      case "Bank Transfer":
        return "बैंक ट्रांसफर";
      case "UPI":
        return "UPI";
      case "Cash":
        return "नकद";
      default:
        return method;
    }
  };

  // ==========================================================
  // FORM HANDLERS
  // ==========================================================

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const selectedProcurement = procurements.find(
    (procurement) =>
      String(procurement.procurement_id) ===
      String(formData.procurement_id)
  );

  // ==========================================================
  // OPEN ADD MODAL
  // ==========================================================

  const openAddModal = () => {
    setEditingPayment(null);
    setError("");

    setFormData({
      procurement_id: "",
      payment_method: "Bank Transfer",
      payment_status: "Pending",
      payment_date: new Date().toISOString().split("T")[0],
      transaction_reference: "",
    });

    setShowModal(true);
  };

  // ==========================================================
  // OPEN EDIT MODAL
  // ==========================================================

  const openEditModal = (payment) => {
    setEditingPayment(payment);
    setError("");

    setFormData({
      procurement_id: payment.procurement_id,
      payment_method: payment.payment_method || "Bank Transfer",
      payment_status: payment.payment_status || "Pending",
      payment_date: payment.payment_date || "",
      transaction_reference: payment.transaction_reference || "",
    });

    setShowModal(true);
  };

  // ==========================================================
  // CLOSE MODAL
  // ==========================================================

  const closeModal = () => {
    setShowModal(false);
    setEditingPayment(null);
    setError("");
  };

  // ==========================================================
  // SUBMIT PAYMENT
  // ==========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      // ======================================================
      // EDIT PAYMENT
      // ======================================================

      if (editingPayment) {
        await API.put(`/payments/${editingPayment.payment_id}`, {
          payment_method: formData.payment_method,
          payment_status: formData.payment_status,
          payment_date: formData.payment_date,
          transaction_reference: formData.transaction_reference,
        });
      }

      // ======================================================
      // NEW PAYMENT
      // ======================================================

      else {
        if (!formData.procurement_id) {
          setError(
            isHindi
              ? "कृपया खरीद का चयन करें।"
              : "Please select a procurement."
          );

          setLoading(false);
          return;
        }

        await API.post("/payments/", {
          procurement_id: Number(formData.procurement_id),
          payment_method: formData.payment_method,
          payment_status: formData.payment_status,
          payment_date: formData.payment_date,
          transaction_reference: formData.transaction_reference,
        });
      }

      await fetchPayments();
      closeModal();
    } catch (error) {
      console.error("Payment save error:", error);

      setError(
        error?.response?.data?.error ||
          (isHindi
            ? "भुगतान सहेजा नहीं जा सका।"
            : "Unable to save payment.")
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // DELETE PAYMENT
  // ==========================================================

  const handleDelete = async (paymentId) => {
    const confirmed = window.confirm(
      isHindi
        ? "क्या आप इस भुगतान को हटाना चाहते हैं?"
        : "Are you sure you want to delete this payment?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await API.delete(`/payments/${paymentId}`);
      await fetchPayments();
    } catch (error) {
      console.error("Delete payment error:", error);

      alert(
        error?.response?.data?.error ||
          (isHindi
            ? "भुगतान हटाया नहीं जा सका।"
            : "Unable to delete payment.")
      );
    }
  };

  // ==========================================================
  // QUICK STATUS UPDATE
  // ==========================================================

  const updatePaymentStatus = async (payment, newStatus) => {
    try {
      await API.put(`/payments/${payment.payment_id}`, {
        payment_status: newStatus,
        payment_method: payment.payment_method,
        payment_date: payment.payment_date,
        transaction_reference: payment.transaction_reference,
      });

      await fetchPayments();
    } catch (error) {
      console.error("Status update error:", error);

      alert(
        error?.response?.data?.error ||
          (isHindi
            ? "भुगतान की स्थिति अपडेट नहीं की जा सकी।"
            : "Unable to update payment status.")
      );
    }
  };

  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  const formatDate = (date) => {
    if (!date) {
      return isHindi ? "सेट नहीं किया गया" : "Not settled";
    }

    const dateString = String(date).substring(0, 10);

    const parsedDate = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString(
      isHindi ? "hi-IN" : "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="page-container">
      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="page-header">
        <div>
          <h1>{isHindi ? "भुगतान" : "Payments"}</h1>

          <p>
            {isHindi
              ? "किसानों के भुगतान और निपटान लेनदेन को ट्रैक करें"
              : "Track farmer payments and settlement transactions"}
          </p>
        </div>

        <button
          className="primary-button"
          onClick={openAddModal}
        >
          + {isHindi ? "भुगतान दर्ज करें" : "Record Payment"}
        </button>
      </div>

      {/* =====================================================
          STATISTICS
          ===================================================== */}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">💰</div>

          <div>
            <span>
              {isHindi
                ? "कुल भुगतान मूल्य"
                : "Total Payment Value"}
            </span>

            <h2>
              ₹
              {stats.total.toLocaleString("en-IN")}
            </h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>

          <div>
            <span>{isHindi ? "पूर्ण" : "Completed"}</span>

            <h2>
              ₹
              {stats.completedAmount.toLocaleString(
                "en-IN"
              )}
            </h2>

            <small>
              {stats.completedCount}{" "}
              {isHindi ? "लेनदेन" : "transactions"}
            </small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏳</div>

          <div>
            <span>{isHindi ? "लंबित" : "Pending"}</span>

            <h2>
              ₹
              {stats.pendingAmount.toLocaleString(
                "en-IN"
              )}
            </h2>

            <small>
              {stats.pendingCount}{" "}
              {isHindi ? "लेनदेन" : "transactions"}
            </small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>

          <div>
            <span>
              {isHindi
                ? "निपटान दर"
                : "Settlement Rate"}
            </span>

            <h2>
              {stats.total > 0
                ? Math.round(
                    (stats.completedAmount /
                      stats.total) *
                      100
                  )
                : 0}
              %
            </h2>

            <small>
              {stats.failedCount}{" "}
              {isHindi ? "विफल" : "failed"}
            </small>
          </div>
        </div>
      </div>

      {/* =====================================================
          SEARCH + FILTERS
          ===================================================== */}

      <div className="payment-filters">
        <div className="search-container">
          <input
            type="text"
            placeholder={
              isHindi
                ? "किसान, फसल या लेनदेन खोजें..."
                : "Search farmer, crop, transaction..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">
            {isHindi ? "सभी स्थितियां" : "All Statuses"}
          </option>

          <option value="Completed">
            {isHindi ? "पूर्ण" : "Completed"}
          </option>

          <option value="Pending">
            {isHindi ? "लंबित" : "Pending"}
          </option>

          <option value="Failed">
            {isHindi ? "विफल" : "Failed"}
          </option>
        </select>

        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
        >
          <option value="All">
            {isHindi ? "सभी तरीके" : "All Methods"}
          </option>

          <option value="Bank Transfer">
            {isHindi ? "बैंक ट्रांसफर" : "Bank Transfer"}
          </option>

          <option value="UPI">UPI</option>

          <option value="Cash">
            {isHindi ? "नकद" : "Cash"}
          </option>
        </select>
      </div>

      {/* =====================================================
          PAYMENT TABLE
          ===================================================== */}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{isHindi ? "भुगतान ID" : "Payment ID"}</th>

              <th>{isHindi ? "किसान" : "Farmer"}</th>

              <th>{isHindi ? "फसल" : "Crop"}</th>

              <th>{isHindi ? "राशि" : "Amount"}</th>

              <th>{isHindi ? "तरीका" : "Method"}</th>

              <th>
                {isHindi
                  ? "लेनदेन संदर्भ"
                  : "Transaction Reference"}
              </th>

              <th>
                {isHindi
                  ? "भुगतान की तारीख"
                  : "Payment Date"}
              </th>

              <th>{isHindi ? "स्थिति" : "Status"}</th>

              <th>{isHindi ? "कार्य" : "Actions"}</th>
            </tr>
          </thead>

          <tbody>
            {filteredPayments.length > 0 ? (
              filteredPayments.map((payment) => (
                <tr key={payment.payment_id}>
                  {/* PAYMENT ID */}

                  <td>
                    <strong>
                      #{payment.payment_id}
                    </strong>

                    <br />

                    <small>
                      {isHindi
                        ? "खरीद"
                        : "Procurement"}{" "}
                      #{payment.procurement_id}
                    </small>
                  </td>

                  {/* FARMER */}

                  <td>
                    <strong>
                      {payment.farmer_name}
                    </strong>

                    <br />

                    <small>
                      {isHindi
                        ? "किसान ID"
                        : "Farmer ID"}{" "}
                      #{payment.farmer_id}
                    </small>
                  </td>

                  {/* CROP */}

                  <td>{payment.crop_name}</td>

                  {/* AMOUNT */}

                  <td>
                    <strong>
                      ₹
                      {Number(
                        payment.amount || 0
                      ).toLocaleString("en-IN")}
                    </strong>
                  </td>

                  {/* METHOD */}

                  <td>
                    <span className="payment-method">
                      {payment.payment_method ===
                        "Bank Transfer" && "🏦 "}

                      {payment.payment_method ===
                        "UPI" && "📱 "}

                      {payment.payment_method ===
                        "Cash" && "💵 "}

                      {getPaymentMethodLabel(
                        payment.payment_method
                      )}
                    </span>
                  </td>

                  {/* TRANSACTION */}

                  <td>
                    {payment.transaction_reference ? (
                      <code>
                        {payment.transaction_reference}
                      </code>
                    ) : (
                      <span>—</span>
                    )}
                  </td>

                  {/* DATE */}

                  <td>
                    {formatDate(
                      payment.payment_date
                    )}
                  </td>

                  {/* STATUS */}

                  <td>
                    <span
                      className={getStatusClass(
                        payment.payment_status
                      )}
                    >
                      {getStatusLabel(
                        payment.payment_status
                      )}
                    </span>
                  </td>

                  {/* ACTIONS */}

                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                      }}
                    >
                      {payment.payment_status ===
                        "Pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              updatePaymentStatus(
                                payment,
                                "Completed"
                              )
                            }
                            style={{
                              padding: "6px 10px",
                              cursor: "pointer",
                            }}
                          >
                            ✓{" "}
                            {isHindi
                              ? "पूर्ण करें"
                              : "Complete"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updatePaymentStatus(
                                payment,
                                "Failed"
                              )
                            }
                            style={{
                              padding: "6px 10px",
                              cursor: "pointer",
                            }}
                          >
                            ✕{" "}
                            {isHindi
                              ? "विफल करें"
                              : "Failed"}
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          openEditModal(payment)
                        }
                        style={{
                          padding: "6px 10px",
                          cursor: "pointer",
                        }}
                      >
                        {isHindi ? "संपादित करें" : "Edit"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            payment.payment_id
                          )
                        }
                        style={{
                          padding: "6px 10px",
                          cursor: "pointer",
                        }}
                      >
                        {isHindi ? "हटाएं" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="9"
                  style={{
                    textAlign: "center",
                    padding: "30px",
                  }}
                >
                  {isHindi
                    ? "कोई भुगतान नहीं मिला।"
                    : "No payments found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* =====================================================
          PAYMENT SUMMARY
          ===================================================== */}

      <div className="payment-summary">
        <div>
          <span>
            {isHindi ? "दिखाए जा रहे हैं" : "Showing"}
          </span>

          <strong>
            {filteredPayments.length}
          </strong>

          <span>
            {" "}
            {isHindi ? "में से" : "of"}{" "}
            {payments.length}{" "}
            {isHindi ? "भुगतान" : "payments"}
          </span>
        </div>

        <div>
          <span>
            {isHindi
              ? "फ़िल्टर किया गया मूल्य"
              : "Filtered Value"}
          </span>

          <strong>
            ₹
            {filteredPayments
              .reduce(
                (sum, payment) =>
                  sum +
                  Number(payment.amount || 0),
                0
              )
              .toLocaleString("en-IN")}
          </strong>
        </div>
      </div>

      {/* =====================================================
          PAYMENT MODAL
          ===================================================== */}

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: "560px",
              borderRadius: "12px",
              padding: "24px",
              boxShadow:
                "0 20px 50px rgba(0,0,0,0.2)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* MODAL HEADER */}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>
                  {editingPayment
                    ? isHindi
                      ? "भुगतान संपादित करें"
                      : "Edit Payment"
                    : isHindi
                    ? "भुगतान दर्ज करें"
                    : "Record Payment"}
                </h2>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: "#666",
                  }}
                >
                  {isHindi
                    ? "किसान भुगतान निपटान"
                    : "Farmer payment settlement"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "24px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            {/* ERROR */}

            {error && (
              <div
                style={{
                  background: "#fee2e2",
                  color: "#991b1b",
                  padding: "12px",
                  borderRadius: "8px",
                  marginBottom: "15px",
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* PROCUREMENT */}

              <div style={{ marginBottom: "16px" }}>
                <label>
                  <strong>
                    {isHindi ? "खरीद" : "Procurement"}
                  </strong>
                </label>

                <select
                  name="procurement_id"
                  value={formData.procurement_id}
                  onChange={handleInputChange}
                  disabled={!!editingPayment}
                  required
                  style={{
                    width: "100%",
                    marginTop: "7px",
                    padding: "10px",
                    borderRadius: "7px",
                    border: "1px solid #ccc",
                  }}
                >
                  <option value="">
                    {isHindi
                      ? "खरीद चुनें"
                      : "Select Procurement"}
                  </option>

                  {procurements
                    .filter(
                      (procurement) =>
                        procurement.status !==
                        "Cancelled"
                    )
                    .map((procurement) => (
                      <option
                        key={
                          procurement.procurement_id
                        }
                        value={
                          procurement.procurement_id
                        }
                      >
                        #
                        {
                          procurement.procurement_id
                        }
                        {" — "}
                        {procurement.farmer_name}
                        {" — "}
                        {procurement.crop_name}
                        {" — ₹"}
                        {Number(
                          procurement.total_amount ||
                            0
                        ).toLocaleString("en-IN")}
                      </option>
                    ))}
                </select>
              </div>

              {/* SELECTED PROCUREMENT INFO */}

              {selectedProcurement &&
                !editingPayment && (
                  <div
                    style={{
                      background: "#f5f7fa",
                      padding: "14px",
                      borderRadius: "8px",
                      marginBottom: "16px",
                    }}
                  >
                    <strong>
                      {isHindi
                        ? "भुगतान विवरण"
                        : "Payment Details"}
                    </strong>

                    <div
                      style={{
                        marginTop: "8px",
                        display: "grid",
                        gap: "5px",
                      }}
                    >
                      <span>
                        {isHindi
                          ? "किसान:"
                          : "Farmer:"}{" "}
                        <strong>
                          {
                            selectedProcurement.farmer_name
                          }
                        </strong>
                      </span>

                      <span>
                        {isHindi
                          ? "फसल:"
                          : "Crop:"}{" "}
                        <strong>
                          {
                            selectedProcurement.crop_name
                          }
                        </strong>
                      </span>

                      <span>
                        {isHindi
                          ? "मात्रा:"
                          : "Quantity:"}{" "}
                        <strong>
                          {
                            selectedProcurement.quantity
                          }
                        </strong>
                      </span>

                      <span>
                        {isHindi
                          ? "राशि:"
                          : "Amount:"}{" "}
                        <strong>
                          ₹
                          {Number(
                            selectedProcurement.total_amount ||
                              0
                          ).toLocaleString("en-IN")}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}

              {/* PAYMENT METHOD */}

              <div style={{ marginBottom: "16px" }}>
                <label>
                  <strong>
                    {isHindi
                      ? "भुगतान का तरीका"
                      : "Payment Method"}
                  </strong>
                </label>

                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: "100%",
                    marginTop: "7px",
                    padding: "10px",
                    borderRadius: "7px",
                    border: "1px solid #ccc",
                  }}
                >
                  <option value="Bank Transfer">
                    🏦{" "}
                    {isHindi
                      ? "बैंक ट्रांसफर"
                      : "Bank Transfer"}
                  </option>

                  <option value="UPI">
                    📱 UPI
                  </option>

                  <option value="Cash">
                    💵 {isHindi ? "नकद" : "Cash"}
                  </option>
                </select>
              </div>

              {/* STATUS */}

              <div style={{ marginBottom: "16px" }}>
                <label>
                  <strong>
                    {isHindi
                      ? "भुगतान की स्थिति"
                      : "Payment Status"}
                  </strong>
                </label>

                <select
                  name="payment_status"
                  value={formData.payment_status}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: "100%",
                    marginTop: "7px",
                    padding: "10px",
                    borderRadius: "7px",
                    border: "1px solid #ccc",
                  }}
                >
                  <option value="Pending">
                    {isHindi ? "लंबित" : "Pending"}
                  </option>

                  <option value="Completed">
                    {isHindi ? "पूर्ण" : "Completed"}
                  </option>

                  <option value="Failed">
                    {isHindi ? "विफल" : "Failed"}
                  </option>
                </select>
              </div>

              {/* DATE */}

              <div style={{ marginBottom: "16px" }}>
                <label>
                  <strong>
                    {isHindi
                      ? "भुगतान की तारीख"
                      : "Payment Date"}
                  </strong>
                </label>

                <input
                  type="date"
                  name="payment_date"
                  value={formData.payment_date}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: "100%",
                    marginTop: "7px",
                    padding: "10px",
                    borderRadius: "7px",
                    border: "1px solid #ccc",
                  }}
                />
              </div>

              {/* TRANSACTION REFERENCE */}

              <div style={{ marginBottom: "20px" }}>
                <label>
                  <strong>
                    {isHindi
                      ? "लेनदेन संदर्भ"
                      : "Transaction Reference"}
                  </strong>
                </label>

                <input
                  type="text"
                  name="transaction_reference"
                  placeholder="e.g. UPI123456789"
                  value={
                    formData.transaction_reference
                  }
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    marginTop: "7px",
                    padding: "10px",
                    borderRadius: "7px",
                    border: "1px solid #ccc",
                  }}
                />
              </div>

              {/* BUTTONS */}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    padding: "10px 18px",
                    cursor: "pointer",
                  }}
                >
                  {isHindi ? "रद्द करें" : "Cancel"}
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="primary-button"
                  style={{
                    padding: "10px 18px",
                    cursor: "pointer",
                  }}
                >
                  {loading
                    ? isHindi
                      ? "सहेजा जा रहा है..."
                      : "Saving..."
                    : editingPayment
                    ? isHindi
                      ? "भुगतान अपडेट करें"
                      : "Update Payment"
                    : isHindi
                    ? "भुगतान सहेजें"
                    : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Payments;