import { useEffect, useMemo, useState } from "react";

import API from "../services/api";
import { useLanguage } from "../components/LanguageContext";

function Centers() {
  const { language } = useLanguage();
  const isHindi = language === "hi";

  const [centers, setCenters] = useState([]);
  const [procurements, setProcurements] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    center_code: "",
    center_name: "",
    contact_number: "",
    address: "",
    district: "",
    state: "",
    capacity_per_day: "",
  });

  useEffect(() => {
    fetchCenters();
    fetchProcurements();
  }, []);

  const fetchCenters = async () => {
    try {
      const response = await API.get("/centers/");
      setCenters(response.data);
    } catch (error) {
      console.error("Error fetching centers:", error);
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

  /* ===============================
     CENTER STATISTICS
  =============================== */
  const getCenterStats = (centerId) => {
    const centerProcurements = procurements.filter(
      (item) =>
        Number(item.center_id) === Number(centerId) &&
        item.status !== "Cancelled"
    );

    const usedCapacity = centerProcurements.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );

    return {
      usedCapacity,
      procurementCount: centerProcurements.length,
    };
  };

  const stats = useMemo(() => {
    const totalCenters = centers.length;

    const totalDailyCapacity = centers.reduce(
      (sum, center) =>
        sum + Number(center.capacity_per_day || 0),
      0
    );

    const totalUsedCapacity = centers.reduce(
      (sum, center) =>
        sum + getCenterStats(center.id).usedCapacity,
      0
    );

    const totalAvailableCapacity =
      totalDailyCapacity - totalUsedCapacity;

    const utilization =
      totalDailyCapacity > 0
        ? (totalUsedCapacity / totalDailyCapacity) * 100
        : 0;

    return {
      totalCenters,
      totalDailyCapacity,
      totalUsedCapacity,
      totalAvailableCapacity,
      utilization,
    };
  }, [centers, procurements]);

  /* ===============================
     SEARCH
  =============================== */
  const filteredCenters = centers.filter((center) => {
    const text = search.toLowerCase();

    return (
      center.center_name
        ?.toLowerCase()
        .includes(text) ||
      center.center_code
        ?.toLowerCase()
        .includes(text) ||
      center.district
        ?.toLowerCase()
        .includes(text) ||
      center.state
        ?.toLowerCase()
        .includes(text) ||
      center.address
        ?.toLowerCase()
        .includes(text)
    );
  });

  /* ===============================
     MODAL
  =============================== */
  const openAddModal = () => {
    setEditingId(null);

    setFormData({
      center_code: "",
      center_name: "",
      contact_number: "",
      address: "",
      district: "",
      state: "",
      capacity_per_day: "",
    });

    setShowModal(true);
  };

  const openEditModal = (center) => {
    setEditingId(center.id);

    setFormData({
      center_code: center.center_code || "",
      center_name: center.center_name || "",
      contact_number: center.contact_number || "",
      address: center.address || "",
      district: center.district || "",
      state: center.state || "",
      capacity_per_day: center.capacity_per_day || "",
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  /* ===============================
     FORM CHANGE
  =============================== */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* ===============================
     SUBMIT
  =============================== */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.center_code ||
      !formData.center_name ||
      !formData.contact_number ||
      !formData.address ||
      !formData.district ||
      !formData.state ||
      !formData.capacity_per_day
    ) {
      alert(
        isHindi
          ? "कृपया सभी आवश्यक फ़ील्ड भरें।"
          : "Please fill all required fields."
      );
      return;
    }

    if (formData.contact_number.length !== 10) {
      alert(
        isHindi
          ? "कृपया 10 अंकों का सही संपर्क नंबर दर्ज करें।"
          : "Please enter a valid 10-digit contact number."
      );
      return;
    }

    if (Number(formData.capacity_per_day) <= 0) {
      alert(
        isHindi
          ? "दैनिक क्षमता 0 से अधिक होनी चाहिए।"
          : "Daily capacity must be greater than 0."
      );
      return;
    }

    try {
      if (editingId) {
        await API.put(
          `/centers/${editingId}`,
          formData
        );

        alert(
          isHindi
            ? "खरीद केंद्र सफलतापूर्वक अपडेट किया गया!"
            : "Procurement center updated successfully!"
        );
      } else {
        await API.post("/centers/", formData);

        alert(
          isHindi
            ? "खरीद केंद्र सफलतापूर्वक जोड़ा गया!"
            : "Procurement center added successfully!"
        );
      }

      closeModal();
      fetchCenters();
    } catch (error) {
      console.error("Error saving center:", error);

      alert(
        error.response?.data?.error ||
          (isHindi
            ? "खरीद केंद्र सेव नहीं किया जा सका।"
            : "Failed to save procurement center.")
      );
    }
  };

  /* ===============================
     DELETE
  =============================== */
  const handleDelete = async (id) => {
    if (
      !window.confirm(
        isHindi
          ? "क्या आप इस खरीद केंद्र को हटाना चाहते हैं?"
          : "Are you sure you want to delete this procurement center?"
      )
    ) {
      return;
    }

    try {
      await API.delete(`/centers/${id}`);

      alert(
        isHindi
          ? "खरीद केंद्र सफलतापूर्वक हटाया गया!"
          : "Procurement center deleted successfully!"
      );

      fetchCenters();
    } catch (error) {
      console.error("Error deleting center:", error);

      alert(
        error.response?.data?.error ||
          (isHindi
            ? "खरीद केंद्र हटाया नहीं जा सका।"
            : "Failed to delete procurement center.")
      );
    }
  };

  /* ===============================
     UTILIZATION
  =============================== */
  const getUtilization = (center) => {
    const used = getCenterStats(center.id).usedCapacity;

    const capacity = Number(
      center.capacity_per_day || 0
    );

    if (capacity <= 0) return 0;

    return Math.min(
      (used / capacity) * 100,
      100
    );
  };

  const getCapacityStatus = (percentage) => {
    if (percentage >= 90) {
      return isHindi ? "उच्च" : "High";
    }

    if (percentage >= 70) {
      return isHindi ? "मध्यम" : "Medium";
    }

    return isHindi ? "उपलब्ध" : "Available";
  };

  const getCapacityStatusClass = (percentage) => {
    if (percentage >= 90) {
      return "center-capacity high";
    }

    if (percentage >= 70) {
      return "center-capacity medium";
    }

    return "center-capacity available";
  };

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1>
            {isHindi
              ? "खरीद केंद्र"
              : "Procurement Centers"}
          </h1>

          <p>
            {isHindi
              ? "खरीद केंद्रों और उपलब्ध क्षमता की निगरानी करें"
              : "Monitor procurement centers and available capacity"}
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={openAddModal}
        >
          + {isHindi ? "केंद्र जोड़ें" : "Add Center"}
        </button>
      </div>

      {/* STATISTICS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            🏢
          </div>

          <div>
            <span>
              {isHindi
                ? "कुल केंद्र"
                : "Total Centers"}
            </span>

            <h2>{stats.totalCenters}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            📦
          </div>

          <div>
            <span>
              {isHindi
                ? "दैनिक क्षमता"
                : "Daily Capacity"}
            </span>

            <h2>
              {stats.totalDailyCapacity.toLocaleString(
                "en-IN"
              )}{" "}
              {isHindi ? "क्विंटल" : "Q"}
            </h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            📊
          </div>

          <div>
            <span>
              {isHindi
                ? "उपयोग की गई क्षमता"
                : "Used Capacity"}
            </span>

            <h2>
              {stats.totalUsedCapacity.toLocaleString(
                "en-IN"
              )}{" "}
              {isHindi ? "क्विंटल" : "Q"}
            </h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            🟢
          </div>

          <div>
            <span>
              {isHindi
                ? "उपलब्ध क्षमता"
                : "Available Capacity"}
            </span>

            <h2>
              {Math.max(
                stats.totalAvailableCapacity,
                0
              ).toLocaleString("en-IN")}{" "}
              {isHindi ? "क्विंटल" : "Q"}
            </h2>
          </div>
        </div>
      </div>

      {/* OVERALL UTILIZATION */}
      <div className="center-overview-card">
        <div className="center-overview-header">
          <div>
            <strong>
              {isHindi
                ? "कुल केंद्र क्षमता"
                : "Overall Center Capacity"}
            </strong>

            <span>
              {stats.utilization.toFixed(1)}%{" "}
              {isHindi ? "उपयोग में" : "utilized"}
            </span>
          </div>

          <strong>
            {stats.totalUsedCapacity.toLocaleString(
              "en-IN"
            )}{" "}
            /{" "}
            {stats.totalDailyCapacity.toLocaleString(
              "en-IN"
            )}{" "}
            {isHindi ? "क्विंटल" : "Quintal"}
          </strong>
        </div>

        <div className="center-overview-bar">
          <div
            style={{
              width: `${Math.min(
                stats.utilization,
                100
              )}%`,
            }}
          ></div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="search-container">
        <input
          type="text"
          placeholder={
            isHindi
              ? "केंद्र, कोड, जिला, राज्य खोजें..."
              : "Search center, code, district, state..."
          }
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />
      </div>

      {/* CENTER CARDS */}
      <div className="center-grid">
        {filteredCenters.length > 0 ? (
          filteredCenters.map((center) => {
            const centerStats =
              getCenterStats(center.id);

            const utilization =
              getUtilization(center);

            const status =
              getCapacityStatus(
                utilization
              );

            return (
              <div
                className="center-card"
                key={center.id}
              >
                {/* CARD HEADER */}
                <div className="center-card-header">
                  <div>
                    <span className="center-code">
                      {center.center_code}
                    </span>

                    <h3>
                      {center.center_name}
                    </h3>
                  </div>

                  <span
                    className={getCapacityStatusClass(
                      utilization
                    )}
                  >
                    {status}
                  </span>
                </div>

                {/* LOCATION */}
                <div className="center-info">
                  <div>
                    📍
                    <span>
                      {center.address}
                    </span>
                  </div>

                  <div>
                    🏙️
                    <span>
                      {center.district},{" "}
                      {center.state}
                    </span>
                  </div>

                  <div>
                    📞
                    <span>
                      {center.contact_number}
                    </span>
                  </div>
                </div>

                {/* CAPACITY */}
                <div className="center-capacity-section">
                  <div className="capacity-title">
                    <span>
                      {isHindi
                        ? "क्षमता उपयोग"
                        : "Capacity Utilization"}
                    </span>

                    <strong>
                      {utilization.toFixed(1)}%
                    </strong>
                  </div>

                  <div className="center-capacity-bar">
                    <div
                      style={{
                        width: `${utilization}%`,
                      }}
                    ></div>
                  </div>

                  <div className="center-capacity-details">
                    <span>
                      {isHindi
                        ? "उपयोग:"
                        : "Used:"}{" "}
                      <strong>
                        {centerStats.usedCapacity.toLocaleString(
                          "en-IN"
                        )}{" "}
                        {isHindi ? "क्विंटल" : "Q"}
                      </strong>
                    </span>

                    <span>
                      {isHindi
                        ? "उपलब्ध:"
                        : "Available:"}{" "}
                      <strong>
                        {Math.max(
                          Number(
                            center.capacity_per_day
                          ) -
                            centerStats.usedCapacity,
                          0
                        ).toLocaleString(
                          "en-IN"
                        )}{" "}
                        {isHindi ? "क्विंटल" : "Q"}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* FOOTER */}
                <div className="center-card-footer">
                  <div>
                    <small>
                      {isHindi
                        ? "दैनिक क्षमता"
                        : "Daily Capacity"}
                    </small>

                    <strong>
                      {Number(
                        center.capacity_per_day
                      ).toLocaleString(
                        "en-IN"
                      )}{" "}
                      {isHindi
                        ? "क्विंटल"
                        : "Quintal"}
                    </strong>
                  </div>

                  <div>
                    <small>
                      {isHindi
                        ? "खरीद"
                        : "Procurements"}
                    </small>

                    <strong>
                      {
                        centerStats.procurementCount
                      }
                    </strong>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="center-actions">
                  <button
                    className="edit-btn"
                    onClick={() =>
                      openEditModal(center)
                    }
                  >
                    {isHindi
                      ? "संपादित करें"
                      : "Edit"}
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() =>
                      handleDelete(center.id)
                    }
                  >
                    {isHindi
                      ? "हटाएं"
                      : "Delete"}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            {isHindi
              ? "कोई खरीद केंद्र नहीं मिला।"
              : "No procurement centers found."}
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>
                  {editingId
                    ? isHindi
                      ? "खरीद केंद्र संपादित करें"
                      : "Edit Procurement Center"
                    : isHindi
                    ? "खरीद केंद्र जोड़ें"
                    : "Add Procurement Center"}
                </h2>

                <p>
                  {isHindi
                    ? "खरीद केंद्र का विवरण दर्ज करें"
                    : "Enter procurement center details"}
                </p>
              </div>

              <button
                className="close-btn"
                onClick={closeModal}
                type="button"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* CODE */}
              <div className="form-group">
                <label>
                  {isHindi
                    ? "केंद्र कोड"
                    : "Center Code"}{" "}
                  <span>*</span>
                </label>

                <input
                  type="text"
                  name="center_code"
                  value={formData.center_code}
                  onChange={handleChange}
                  placeholder={
                    isHindi
                      ? "उदाहरण: LPC004"
                      : "Example: LPC004"
                  }
                  required
                />
              </div>

              {/* NAME */}
              <div className="form-group">
                <label>
                  {isHindi
                    ? "केंद्र का नाम"
                    : "Center Name"}{" "}
                  <span>*</span>
                </label>

                <input
                  type="text"
                  name="center_name"
                  value={formData.center_name}
                  onChange={handleChange}
                  placeholder={
                    isHindi
                      ? "केंद्र का नाम दर्ज करें"
                      : "Enter center name"
                  }
                  required
                />
              </div>

              {/* CONTACT */}
              <div className="form-group">
                <label>
                  {isHindi
                    ? "संपर्क नंबर"
                    : "Contact Number"}{" "}
                  <span>*</span>
                </label>

                <input
                  type="tel"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleChange}
                  maxLength="10"
                  placeholder={
                    isHindi
                      ? "10 अंकों का संपर्क नंबर"
                      : "10-digit contact number"
                  }
                  required
                />
              </div>

              {/* ADDRESS */}
              <div className="form-group">
                <label>
                  {isHindi
                    ? "पता"
                    : "Address"}{" "}
                  <span>*</span>
                </label>

                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder={
                    isHindi
                      ? "केंद्र का पता दर्ज करें"
                      : "Enter center address"
                  }
                  required
                />
              </div>

              {/* DISTRICT */}
              <div className="form-group">
                <label>
                  {isHindi
                    ? "जिला"
                    : "District"}{" "}
                  <span>*</span>
                </label>

                <input
                  type="text"
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  placeholder={
                    isHindi
                      ? "जिला दर्ज करें"
                      : "Enter district"
                  }
                  required
                />
              </div>

              {/* STATE */}
              <div className="form-group">
                <label>
                  {isHindi
                    ? "राज्य"
                    : "State"}{" "}
                  <span>*</span>
                </label>

                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder={
                    isHindi
                      ? "राज्य दर्ज करें"
                      : "Enter state"
                  }
                  required
                />
              </div>

              {/* CAPACITY */}
              <div className="form-group">
                <label>
                  {isHindi
                    ? "दैनिक क्षमता (क्विंटल)"
                    : "Daily Capacity (Quintal)"}{" "}
                  <span>*</span>
                </label>

                <input
                  type="number"
                  name="capacity_per_day"
                  value={
                    formData.capacity_per_day
                  }
                  onChange={handleChange}
                  min="1"
                  step="1"
                  placeholder={
                    isHindi
                      ? "उदाहरण: 5000"
                      : "Example: 5000"
                  }
                  required
                />
              </div>

              {/* BUTTONS */}
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeModal}
                >
                  {isHindi
                    ? "रद्द करें"
                    : "Cancel"}
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                >
                  {editingId
                    ? isHindi
                      ? "केंद्र अपडेट करें"
                      : "Update Center"
                    : isHindi
                    ? "केंद्र सेव करें"
                    : "Save Center"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Centers;