import { useEffect, useMemo, useState } from "react";

import axios from "axios";

import {
  Boxes,
  CheckCircle2,
  Clock3,
  MapPin,
  PackageCheck,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";

import { useLanguage } from "../components/LanguageContext";

const API_BASE = "http://localhost:5000/api";
const API = axios.create({ baseURL: API_BASE });

const STAGES = [
  "Farmer Harvest",
  "Procurement Center",
  "Quality Check",
  "Storage",
  "Distribution",
  "Delivered",
];

const STATUS_OPTIONS = ["Active", "Completed", "On Hold"];

const QUALITY_OPTIONS = [
  "Pending",
  "Passed",
  "Needs Review",
  "Failed",
];

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(value = "") {
  return `supply-status ${value.toLowerCase().replace(/\s+/g, "-")}`;
}

function SupplyChain() {
  const { language } = useLanguage();
  const isHindi = language === "hi";

  const [batches, setBatches] = useState([]);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    stage: "",
    status: "Active",
    quality_status: "Pending",
    notes: "",
  });

  const fetchBatches = async (showLoader = false) => {
    try {
      if (showLoader) setRefreshing(true);

      setError("");

      const response = await API.get("/procurements/supply-chain");

      setBatches(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Supply chain fetch error:", err);

      setError(
        err.response?.data?.error ||
          (isHindi
            ? "सप्लाई चेन बैच लोड करने में विफल।"
            : "Failed to load supply chain batches.")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBatches();

    const timer = setInterval(() => {
      fetchBatches();
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  const filteredBatches = useMemo(() => {
    const text = search.trim().toLowerCase();

    return batches.filter((batch) => {
      const matchesSearch =
        !text ||
        String(batch.batch_code || "")
          .toLowerCase()
          .includes(text) ||
        String(batch.traceability_id || "")
          .toLowerCase()
          .includes(text) ||
        String(batch.farmer_name || "")
          .toLowerCase()
          .includes(text) ||
        String(batch.crop_name || "")
          .toLowerCase()
          .includes(text) ||
        String(batch.center_name || "")
          .toLowerCase()
          .includes(text);

      const matchesStage =
        stageFilter === "All" ||
        batch.current_stage === stageFilter;

      const matchesStatus =
        statusFilter === "All" ||
        batch.batch_status === statusFilter;

      return matchesSearch && matchesStage && matchesStatus;
    });
  }, [batches, search, stageFilter, statusFilter]);

  const stats = useMemo(() => {
    const active = batches.filter(
      (b) => b.batch_status === "Active"
    ).length;

    const delivered = batches.filter(
      (b) => b.current_stage === "Delivered"
    ).length;

    const qualityReview = batches.filter(
      (b) => b.quality_status === "Needs Review"
    ).length;

    const totalQuantity = batches.reduce(
      (sum, b) => sum + Number(b.quantity || 0),
      0
    );

    return {
      total: batches.length,
      active,
      delivered,
      qualityReview,
      totalQuantity,
    };
  }, [batches]);

  const getStageLabel = (stage) => {
    if (!isHindi) return stage;

    const translations = {
      "Farmer Harvest": "किसान की फसल",
      "Procurement Center": "खरीद केंद्र",
      "Quality Check": "गुणवत्ता जांच",
      Storage: "भंडारण",
      Distribution: "वितरण",
      Delivered: "डिलीवर किया गया",
    };

    return translations[stage] || stage;
  };

  const getStatusLabel = (status) => {
    if (!isHindi) return status;

    const translations = {
      Active: "सक्रिय",
      Completed: "पूर्ण",
      "On Hold": "रोक दिया गया",
      Pending: "लंबित",
      Passed: "पास",
      "Needs Review": "समीक्षा आवश्यक",
      Failed: "विफल",
    };

    return translations[status] || status;
  };

  const openBatch = async (batch) => {
    try {
      const response = await API.get(
        `/procurements/supply-chain/${batch.batch_id}`
      );

      setSelectedBatch(response.data);

      setForm({
        stage:
          response.data.current_stage ||
          "Procurement Center",
        status:
          response.data.batch_status ||
          "Active",
        quality_status:
          response.data.quality_status ||
          "Pending",
        notes: "",
      });
    } catch (err) {
      alert(
        err.response?.data?.error ||
          (isHindi
            ? "बैच विवरण खोलने में विफल।"
            : "Failed to open batch details.")
      );
    }
  };

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const saveStage = async (event) => {
    event.preventDefault();

    if (!selectedBatch) return;

    try {
      setSaving(true);

      await API.put(
        `/procurements/supply-chain/${selectedBatch.batch_id}/stage`,
        form
      );

      await openBatch({
        batch_id: selectedBatch.batch_id,
      });

      await fetchBatches();

      alert(
        isHindi
          ? "सप्लाई चेन स्टेज सफलतापूर्वक अपडेट हो गया!"
          : "Supply chain stage updated successfully!"
      );
    } catch (err) {
      alert(
        err.response?.data?.error ||
          (isHindi
            ? "सप्लाई चेन स्टेज अपडेट करने में विफल।"
            : "Failed to update supply chain stage.")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="supply-chain-page">
      <div className="page-top">
        <div>
          <h2>
            {isHindi
              ? "सप्लाई चेन और ट्रेसेबिलिटी"
              : "Supply Chain & Traceability"}
          </h2>

          <p>
            {isHindi
              ? "हर पूर्ण खरीद को स्रोत से डिलीवरी तक ट्रैक करें।"
              : "Track every completed procurement from source to delivery."}
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() => fetchBatches(true)}
          disabled={refreshing}
        >
          <RefreshCw
            size={17}
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

      {error && <div className="alert-error">{error}</div>}

      <div className="stats-grid supply-stats-grid">
        <div className="stat-card">
          <div>
            <p>
              {isHindi ? "कुल बैच" : "Total Batches"}
            </p>
            <h2>{stats.total}</h2>
          </div>

          <div className="stat-icon">
            <Boxes size={21} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <p>
              {isHindi ? "सक्रिय बैच" : "Active Batches"}
            </p>
            <h2>{stats.active}</h2>
          </div>

          <div className="stat-icon">
            <Truck size={21} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <p>
              {isHindi ? "डिलीवर किए गए" : "Delivered"}
            </p>
            <h2>{stats.delivered}</h2>
          </div>

          <div className="stat-icon">
            <PackageCheck size={21} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <p>
              {isHindi ? "गुणवत्ता समीक्षा" : "Quality Review"}
            </p>
            <h2>{stats.qualityReview}</h2>
          </div>

          <div className="stat-icon">
            <Clock3 size={21} />
          </div>
        </div>
      </div>

      <div className="supply-toolbar">
        <div className="supply-search">
          <Search size={18} />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              isHindi
                ? "बैच, ट्रेसेबिलिटी ID, किसान, फसल या केंद्र खोजें..."
                : "Search batch, traceability ID, farmer, crop or center..."
            }
          />
        </div>

        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="All">
            {isHindi ? "सभी स्टेज" : "All Stages"}
          </option>

          {STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {getStageLabel(stage)}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">
            {isHindi ? "सभी स्थिति" : "All Status"}
          </option>

          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {getStatusLabel(status)}
            </option>
          ))}
        </select>
      </div>

      <div className="data-card supply-table-card">
        {loading ? (
          <div className="loading">
            {isHindi
              ? "सप्लाई चेन बैच लोड हो रहे हैं..."
              : "Loading supply chain batches..."}
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="no-data">
            <Boxes size={35} />

            <h3>
              {isHindi
                ? "कोई सप्लाई चेन बैच नहीं मिला"
                : "No supply chain batches found"}
            </h3>

            <p>
              {isHindi
                ? "ट्रेसेबिलिटी बैच बनाने के लिए किसी खरीद को पूर्ण करें।"
                : "Complete a procurement to automatically create a traceability batch."}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table supply-table">
              <thead>
                <tr>
                  <th>
                    {isHindi ? "बैच" : "Batch"}
                  </th>

                  <th>
                    {isHindi
                      ? "ट्रेसेबिलिटी ID"
                      : "Traceability ID"}
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
                    {isHindi ? "मात्रा" : "Quantity"}
                  </th>

                  <th>
                    {isHindi
                      ? "वर्तमान स्टेज"
                      : "Current Stage"}
                  </th>

                  <th>
                    {isHindi ? "गुणवत्ता" : "Quality"}
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
                {filteredBatches.map((batch) => (
                  <tr key={batch.batch_id}>
                    <td>
                      <strong>{batch.batch_code}</strong>
                    </td>

                    <td>
                      <code>{batch.traceability_id}</code>
                    </td>

                    <td>{batch.farmer_name}</td>

                    <td>{batch.crop_name}</td>

                    <td>
                      <strong>{batch.center_name}</strong>
                      <br />
                      <small>{batch.center_code}</small>
                    </td>

                    <td>
                      {Number(
                        batch.quantity || 0
                      ).toLocaleString("en-IN")}{" "}
                      {isHindi ? "क्विंटल" : "Quintal"}
                    </td>

                    <td>
                      <span className="stage-pill">
                        {getStageLabel(batch.current_stage)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={statusClass(
                          batch.quality_status
                        )}
                      >
                        {getStatusLabel(
                          batch.quality_status
                        )}
                      </span>
                    </td>

                    <td>
                      <span
                        className={statusClass(
                          batch.batch_status
                        )}
                      >
                        {getStatusLabel(
                          batch.batch_status
                        )}
                      </span>
                    </td>

                    <td>
                      <button
                        className="view-btn"
                        onClick={() =>
                          openBatch(batch)
                        }
                      >
                        {isHindi
                          ? "टाइमलाइन देखें"
                          : "View Timeline"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedBatch && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedBatch(null)}
        >
          <div
            className="modal supply-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>{selectedBatch.batch_code}</h2>

                <p>{selectedBatch.traceability_id}</p>
              </div>

              <button
                className="close-btn"
                onClick={() => setSelectedBatch(null)}
              >
                ×
              </button>
            </div>

            <div className="trace-summary">
              <div>
                <span>
                  {isHindi ? "किसान" : "Farmer"}
                </span>

                <strong>
                  {selectedBatch.farmer_name}
                </strong>
              </div>

              <div>
                <span>
                  {isHindi ? "फसल" : "Crop"}
                </span>

                <strong>
                  {selectedBatch.crop_name}
                </strong>
              </div>

              <div>
                <span>
                  {isHindi ? "मात्रा" : "Quantity"}
                </span>

                <strong>
                  {selectedBatch.quantity}{" "}
                  {isHindi ? "क्विंटल" : "Quintal"}
                </strong>
              </div>

              <div>
                <span>
                  {isHindi ? "केंद्र" : "Center"}
                </span>

                <strong>
                  {selectedBatch.center_name}
                </strong>
              </div>
            </div>

            <div className="trace-timeline">
              {(selectedBatch.events || []).map(
                (event, index) => (
                  <div
                    className="timeline-item"
                    key={event.id || index}
                  >
                    <div className="timeline-dot">
                      {index ===
                      (selectedBatch.events || []).length -
                        1 ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <MapPin size={16} />
                      )}
                    </div>

                    <div className="timeline-content">
                      <div className="timeline-top">
                        <strong>
                          {getStageLabel(event.stage)}
                        </strong>

                        <span>
                          {formatDate(
                            event.event_time
                          )}
                        </span>
                      </div>

                      <small>
                        {getStatusLabel(
                          event.event_status
                        )}
                      </small>

                      {event.notes && (
                        <p>{event.notes}</p>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>

            <form
              onSubmit={saveStage}
              className="supply-update-form"
            >
              <h3>
                {isHindi
                  ? "सप्लाई चेन अपडेट करें"
                  : "Update Supply Chain"}
              </h3>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>
                    {isHindi
                      ? "वर्तमान स्टेज"
                      : "Current Stage"}
                  </label>

                  <select
                    name="stage"
                    value={form.stage}
                    onChange={updateField}
                  >
                    {STAGES.map((stage) => (
                      <option
                        key={stage}
                        value={stage}
                      >
                        {getStageLabel(stage)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    {isHindi
                      ? "बैच स्थिति"
                      : "Batch Status"}
                  </label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={updateField}
                  >
                    {STATUS_OPTIONS.map(
                      (status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {getStatusLabel(status)}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>
                  {isHindi
                    ? "गुणवत्ता स्थिति"
                    : "Quality Status"}
                </label>

                <select
                  name="quality_status"
                  value={form.quality_status}
                  onChange={updateField}
                >
                  {QUALITY_OPTIONS.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {getStatusLabel(status)}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>
                  {isHindi
                    ? "टाइमलाइन नोट"
                    : "Timeline Note"}
                </label>

                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={updateField}
                  placeholder={
                    isHindi
                      ? "उदाहरण: गुणवत्ता निरीक्षण पूरा हुआ और बैच को भंडारण में भेज दिया गया।"
                      : "Example: Quality inspection completed and batch moved to storage."
                  }
                  rows="3"
                />
              </div>

              <button
                className="save-btn"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? isHindi
                    ? "सहेजा जा रहा है..."
                    : "Saving..."
                  : isHindi
                  ? "सप्लाई चेन अपडेट सहेजें"
                  : "Save Supply Chain Update"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SupplyChain;