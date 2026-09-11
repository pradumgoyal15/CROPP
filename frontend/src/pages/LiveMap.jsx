import { useEffect, useMemo, useState } from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";

import L from "leaflet";

import API from "../services/api";

import "leaflet/dist/leaflet.css";

import {
  MapPin,
  RefreshCw,
  Search,
  Activity,
  Users,
  Package,
  Gauge,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Crosshair,
  Building2,
  ExternalLink,
} from "lucide-react";

import { useLanguage } from "../components/LanguageContext";

// ============================================================
// FIX LEAFLET DEFAULT MARKER ICON
// ============================================================

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",

  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",

  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// ============================================================
// INDIA DEFAULT VIEW
// ============================================================

const INDIA_CENTER = [22.9734, 78.6569];

// ============================================================
// DATE HELPER
// ============================================================

const getToday = () => {
  const date = new Date();

  const offset = date.getTimezoneOffset();

  const localDate = new Date(
    date.getTime() - offset * 60000
  );

  return localDate.toISOString().split("T")[0];
};

// ============================================================
// MAP FOCUS COMPONENT
// ============================================================

function MapFocus({ center }) {
  const map = useMap();

  useEffect(() => {
    if (!center) {
      return;
    }

    map.flyTo(center, 13, {
      duration: 1,
    });
  }, [center, map]);

  return null;
}

// ============================================================
// MAP FIT COMPONENT
// ============================================================

function MapFitBounds({ centers, selectedCenter }) {
  const map = useMap();

  useEffect(() => {
    if (selectedCenter) {
      return;
    }

    if (!centers || centers.length === 0) {
      map.setView(INDIA_CENTER, 5);
      return;
    }

    const validCoordinates = centers
      .filter(
        (center) =>
          center.latitude !== null &&
          center.latitude !== undefined &&
          center.longitude !== null &&
          center.longitude !== undefined &&
          !Number.isNaN(Number(center.latitude)) &&
          !Number.isNaN(Number(center.longitude))
      )
      .map((center) => [
        Number(center.latitude),
        Number(center.longitude),
      ]);

    if (validCoordinates.length === 0) {
      map.setView(INDIA_CENTER, 5);
      return;
    }

    if (validCoordinates.length === 1) {
      map.setView(validCoordinates[0], 10);
      return;
    }

    const bounds = L.latLngBounds(validCoordinates);

    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 10,
    });
  }, [centers, selectedCenter, map]);

  return null;
}

// ============================================================
// STATUS HELPERS
// ============================================================

function getStatusClass(status) {
  if (status === "Near Full") {
    return "map-status danger";
  }

  if (status === "Busy") {
    return "map-status warning";
  }

  return "map-status normal";
}

function getStatusIcon(status) {
  if (status === "Near Full") {
    return <XCircle size={16} />;
  }

  if (status === "Busy") {
    return <AlertTriangle size={16} />;
  }

  return <CheckCircle2 size={16} />;
}

function getStatusLabel(status, isHindi) {
  if (!isHindi) {
    return status;
  }

  switch (status) {
    case "Normal":
      return "सामान्य";

    case "Busy":
      return "व्यस्त";

    case "Near Full":
      return "लगभग पूर्ण";

    default:
      return status;
  }
}

// ============================================================
// MAP MARKER ICON
// ============================================================

function getMarkerIcon(status) {
  let background = "#16a34a";

  if (status === "Busy") {
    background = "#f59e0b";
  }

  if (status === "Near Full") {
    background = "#dc2626";
  }

  return L.divIcon({
    className: "cropp-map-marker-wrapper",

    html: `
      <div
        class="cropp-map-marker"
        style="background:${background};"
      >
        <span></span>
      </div>
    `,

    iconSize: [32, 42],

    iconAnchor: [16, 42],

    popupAnchor: [0, -42],
  });
}

// ============================================================
// GOOGLE MAPS URL
// ============================================================

function getGoogleMapsUrl(latitude, longitude) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

function LiveMap() {
  const { language } = useLanguage();

  const isHindi = language === "hi";

  const [centers, setCenters] = useState([]);

  const [summary, setSummary] = useState({
    total_centers: 0,
    total_capacity: 0,
    total_used_capacity: 0,
    total_remaining_capacity: 0,
    overall_utilization: 0,
    active_queue: 0,
    queued_quantity: 0,
    normal_centers: 0,
    busy_centers: 0,
    near_full_centers: 0,
    located_centers: 0,
    unlocated_centers: 0,
  });

  const [date, setDate] = useState(getToday());

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [selectedCenter, setSelectedCenter] =
    useState(null);

  const [selectedMapCenter, setSelectedMapCenter] =
    useState(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const [lastUpdated, setLastUpdated] =
    useState(null);

  // ==========================================================
  // FETCH MONITORING DATA
  // ==========================================================

  const fetchMonitoring = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const response = await API.get(
        "/centers/live-monitoring",
        {
          params: {
            date,
          },
        }
      );

      const nextCenters =
        response.data?.centers || [];

      const nextSummary =
        response.data?.summary || {};

      setCenters(nextCenters);

      setSummary({
        total_centers:
          nextSummary.total_centers || 0,

        total_capacity:
          nextSummary.total_capacity || 0,

        total_used_capacity:
          nextSummary.total_used_capacity || 0,

        total_remaining_capacity:
          nextSummary.total_remaining_capacity || 0,

        overall_utilization:
          nextSummary.overall_utilization || 0,

        active_queue:
          nextSummary.active_queue || 0,

        queued_quantity:
          nextSummary.queued_quantity || 0,

        normal_centers:
          nextSummary.normal_centers || 0,

        busy_centers:
          nextSummary.busy_centers || 0,

        near_full_centers:
          nextSummary.near_full_centers || 0,

        located_centers:
          nextSummary.located_centers || 0,

        unlocated_centers:
          nextSummary.unlocated_centers || 0,
      });

      setLastUpdated(new Date());

      // Keep selected center data fresh after refresh.
      if (selectedCenter) {
        const updatedSelectedCenter =
          nextCenters.find(
            (center) =>
              center.id === selectedCenter.id
          );

        if (updatedSelectedCenter) {
          setSelectedCenter(
            updatedSelectedCenter
          );
        } else {
          setSelectedCenter(null);
          setSelectedMapCenter(null);
        }
      }
    } catch (err) {
      console.error(
        "Live monitoring error:",
        err
      );

      setError(
        err.response?.data?.error ||
          (isHindi
            ? "लाइव केंद्र मॉनिटरिंग लोड नहीं हो सकी।"
            : "Unable to load live center monitoring.")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ==========================================================
  // INITIAL LOAD + DATE CHANGE
  // ==========================================================

  useEffect(() => {
    fetchMonitoring(true);
  }, [date]);

  // ==========================================================
  // AUTO REFRESH
  // ==========================================================

  useEffect(() => {
    const interval = setInterval(() => {
      fetchMonitoring(false);
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [date, selectedCenter]);

  // ==========================================================
  // FILTER CENTERS
  // ==========================================================

  const filteredCenters = useMemo(() => {
    const searchText =
      search.trim().toLowerCase();

    return centers.filter((center) => {
      const matchesSearch =
        !searchText ||
        center.center_name
          ?.toLowerCase()
          .includes(searchText) ||
        center.center_code
          ?.toLowerCase()
          .includes(searchText) ||
        center.district
          ?.toLowerCase()
          .includes(searchText) ||
        center.state
          ?.toLowerCase()
          .includes(searchText);

      const matchesStatus =
        statusFilter === "All" ||
        center.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [
    centers,
    search,
    statusFilter,
  ]);

  // ==========================================================
  // CENTERS WITH VALID MAP COORDINATES
  // ==========================================================

  const mappedCenters = useMemo(() => {
    return filteredCenters.filter((center) => {
      const latitude = Number(
        center.latitude
      );

      const longitude = Number(
        center.longitude
      );

      return (
        center.latitude !== null &&
        center.latitude !== undefined &&
        center.longitude !== null &&
        center.longitude !== undefined &&
        !Number.isNaN(latitude) &&
        !Number.isNaN(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
      );
    });
  }, [filteredCenters]);

  // ==========================================================
  // SELECT CENTER
  // ==========================================================

  const handleSelectCenter = (center) => {
    setSelectedCenter(center);

    const latitude = Number(
      center.latitude
    );

    const longitude = Number(
      center.longitude
    );

    if (
      !Number.isNaN(latitude) &&
      !Number.isNaN(longitude)
    ) {
      setSelectedMapCenter([
        latitude,
        longitude,
      ]);
    } else {
      setSelectedMapCenter(null);
    }
  };

  // ==========================================================
  // STATUS COUNTS
  // ==========================================================

  const normalCount =
    centers.filter(
      (center) =>
        center.status === "Normal"
    ).length;

  const busyCount =
    centers.filter(
      (center) =>
        center.status === "Busy"
    ).length;

  const nearFullCount =
    centers.filter(
      (center) =>
        center.status === "Near Full"
    ).length;

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="page-container">
        <div className="map-loading">
          <RefreshCw
            size={30}
            className="spin"
          />

          <h2>
            {isHindi
              ? "लाइव संचालन मैप लोड हो रहा है..."
              : "Loading Live Operations Map..."}
          </h2>

          <p>
            {isHindi
              ? "खरीद केंद्र मॉनिटरिंग डेटा प्राप्त किया जा रहा है।"
              : "Fetching procurement center monitoring data."}
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // MAIN UI
  // ==========================================================

  return (
    <div className="page-container live-map-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="page-header live-map-header">
        <div>
          <div className="live-map-title">
            <MapPin size={30} />

            <div>
              <h1>
                {isHindi
                  ? "लाइव संचालन मैप"
                  : "Live Operations Map"}
              </h1>

              <p>
                {isHindi
                  ? "रीयल-टाइम खरीद केंद्र मॉनिटरिंग और क्षमता अवलोकन"
                  : "Real-time procurement center monitoring and capacity overview"}
              </p>
            </div>
          </div>
        </div>

        <div className="map-header-actions">
          <div className="live-indicator">
            <span className="live-dot"></span>

            {isHindi
              ? "लाइव"
              : "LIVE"}
          </div>

          <button
            className="refresh-map-btn"
            onClick={() =>
              fetchMonitoring(false)
            }
            disabled={refreshing}
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "spin"
                  : ""
              }
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
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="map-error">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* =====================================================
          CONTROL BAR
      ===================================================== */}

      <div className="map-control-card">
        <div className="map-control">
          <label>
            {isHindi
              ? "मॉनिटरिंग तारीख"
              : "Monitoring Date"}
          </label>

          <input
            type="date"
            value={date}
            onChange={(event) =>
              setDate(event.target.value)
            }
          />
        </div>

        <div className="map-control search-control">
          <label>
            {isHindi
              ? "केंद्र खोजें"
              : "Search Center"}
          </label>

          <div className="map-search-box">
            <Search size={18} />

            <input
              type="text"
              placeholder={
                isHindi
                  ? "केंद्र, कोड, जिला खोजें..."
                  : "Search center, code, district..."
              }
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>
        </div>

        <div className="map-control">
          <label>
            {isHindi
              ? "स्थिति"
              : "Status"}
          </label>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            <option value="All">
              {isHindi
                ? "सभी केंद्र"
                : "All Centers"}
            </option>

            <option value="Normal">
              {isHindi
                ? "सामान्य"
                : "Normal"}
            </option>

            <option value="Busy">
              {isHindi
                ? "व्यस्त"
                : "Busy"}
            </option>

            <option value="Near Full">
              {isHindi
                ? "लगभग पूर्ण"
                : "Near Full"}
            </option>
          </select>
        </div>
      </div>

      {/* =====================================================
          SUMMARY STATS
      ===================================================== */}

      <div className="map-stats-grid">

        <div className="map-stat-card">
          <div className="map-stat-icon">
            <Building2 size={22} />
          </div>

          <div>
            <span>
              {isHindi
                ? "कुल केंद्र"
                : "Total Centers"}
            </span>

            <strong>
              {summary.total_centers || 0}
            </strong>
          </div>
        </div>

        <div className="map-stat-card">
          <div className="map-stat-icon">
            <Gauge size={22} />
          </div>

          <div>
            <span>
              {isHindi
                ? "कुल उपयोग"
                : "Overall Utilization"}
            </span>

            <strong>
              {Number(
                summary.overall_utilization || 0
              ).toFixed(1)}
              %
            </strong>
          </div>
        </div>

        <div className="map-stat-card">
          <div className="map-stat-icon">
            <Users size={22} />
          </div>

          <div>
            <span>
              {isHindi
                ? "सक्रिय कतार"
                : "Active Queue"}
            </span>

            <strong>
              {summary.active_queue || 0}
            </strong>
          </div>
        </div>

        <div className="map-stat-card">
          <div className="map-stat-icon">
            <Package size={22} />
          </div>

          <div>
            <span>
              {isHindi
                ? "कतार में मात्रा"
                : "Queued Quantity"}
            </span>

            <strong>
              {Number(
                summary.queued_quantity || 0
              ).toLocaleString(
                isHindi
                  ? "hi-IN"
                  : "en-IN"
              )}{" "}
              Q
            </strong>
          </div>
        </div>
      </div>

      {/* =====================================================
          STATUS SUMMARY
      ===================================================== */}

      <div className="map-status-summary">

        <div className="status-summary-title">
          <Activity size={19} />

          {isHindi
            ? "केंद्र संचालन स्थिति"
            : "Center Operational Status"}
        </div>

        <div className="status-summary-items">

          <button
            className="status-summary-item normal"
            onClick={() =>
              setStatusFilter(
                statusFilter === "Normal"
                  ? "All"
                  : "Normal"
              )
            }
          >
            <span className="status-summary-dot"></span>

            {isHindi
              ? "सामान्य"
              : "Normal"}

            <strong>
              {normalCount}
            </strong>
          </button>

          <button
            className="status-summary-item busy"
            onClick={() =>
              setStatusFilter(
                statusFilter === "Busy"
                  ? "All"
                  : "Busy"
              )
            }
          >
            <span className="status-summary-dot"></span>

            {isHindi
              ? "व्यस्त"
              : "Busy"}

            <strong>
              {busyCount}
            </strong>
          </button>

          <button
            className="status-summary-item danger"
            onClick={() =>
              setStatusFilter(
                statusFilter === "Near Full"
                  ? "All"
                  : "Near Full"
              )
            }
          >
            <span className="status-summary-dot"></span>

            {isHindi
              ? "लगभग पूर्ण"
              : "Near Full"}

            <strong>
              {nearFullCount}
            </strong>
          </button>

        </div>
      </div>

      {/* =====================================================
          MAP + CENTER MONITORING
      ===================================================== */}

      <div className="live-map-layout">

        {/* ===================================================
            MAP
        =================================================== */}

        <div className="map-panel">

          <div className="map-panel-header">
            <div>
              <h2>
                {isHindi
                  ? "खरीद नेटवर्क"
                  : "Procurement Network"}
              </h2>

              <p>
                {mappedCenters.length}{" "}
                {isHindi
                  ? "मैप किए गए केंद्र"
                  : `mapped center${
                      mappedCenters.length !== 1
                        ? "s"
                        : ""
                    }`}
              </p>
            </div>

            <div className="map-legend">

              <span>
                <i className="legend-normal"></i>

                {isHindi
                  ? "सामान्य"
                  : "Normal"}
              </span>

              <span>
                <i className="legend-busy"></i>

                {isHindi
                  ? "व्यस्त"
                  : "Busy"}
              </span>

              <span>
                <i className="legend-danger"></i>

                {isHindi
                  ? "लगभग पूर्ण"
                  : "Near Full"}
              </span>

            </div>
          </div>

          <div className="map-container">

            <MapContainer
              center={INDIA_CENTER}
              zoom={5}
              scrollWheelZoom={true}
              className="operations-map"
            >

              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapFitBounds
                centers={mappedCenters}
                selectedCenter={selectedCenter}
              />

              {selectedMapCenter && (
                <MapFocus
                  center={selectedMapCenter}
                />
              )}

              {mappedCenters.map((center) => {
                const latitude = Number(
                  center.latitude
                );

                const longitude = Number(
                  center.longitude
                );

                return (
                  <Marker
                    key={center.id}
                    position={[
                      latitude,
                      longitude,
                    ]}
                    icon={getMarkerIcon(
                      center.status
                    )}
                    eventHandlers={{
                      click: () =>
                        handleSelectCenter(
                          center
                        ),
                    }}
                  >
                    <Popup>
                      <div className="map-popup">

                        <h3>
                          {center.center_name}
                        </h3>

                        <span>
                          {center.center_code}
                        </span>

                        <hr />

                        <p>
                          <strong>
                            {isHindi
                              ? "स्थिति:"
                              : "Status:"}
                          </strong>{" "}
                          {getStatusLabel(
                            center.status,
                            isHindi
                          )}
                        </p>

                        <p>
                          <strong>
                            {isHindi
                              ? "कतार:"
                              : "Queue:"}
                          </strong>{" "}
                          {center.active_queue || 0}
                        </p>

                        <p>
                          <strong>
                            {isHindi
                              ? "उपयोग:"
                              : "Utilization:"}
                          </strong>{" "}
                          {Number(
                            center.utilization_percentage ||
                              0
                          ).toFixed(1)}
                          %
                        </p>

                        <p>
                          <strong>
                            {isHindi
                              ? "उपयोग की गई:"
                              : "Used:"}
                          </strong>{" "}
                          {center.used_capacity || 0} Q
                        </p>

                        <p>
                          <strong>
                            {isHindi
                              ? "शेष:"
                              : "Remaining:"}
                          </strong>{" "}
                          {center.remaining_capacity || 0} Q
                        </p>

                        <button
                          onClick={() =>
                            handleSelectCenter(
                              center
                            )
                          }
                        >
                          {isHindi
                            ? "विवरण देखें"
                            : "View Details"}
                        </button>

                        <a
                          href={getGoogleMapsUrl(
                            latitude,
                            longitude
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="map-popup-link"
                        >
                          <Navigation size={14} />

                          {isHindi
                            ? "Google Maps में खोलें"
                            : "Open in Google Maps"}

                          <ExternalLink
                            size={13}
                          />
                        </a>

                      </div>
                    </Popup>
                  </Marker>
                );
              })}

            </MapContainer>

            {mappedCenters.length === 0 && (
              <div className="map-empty-overlay">

                <MapPin size={38} />

                <h3>
                  {isHindi
                    ? "कोई मैप किया गया केंद्र नहीं है"
                    : "No mapped centers"}
                </h3>

                <p>
                  {isHindi
                    ? "मैप पर केंद्र दिखाने के लिए खरीद केंद्रों में अक्षांश और देशांतर जोड़ें।"
                    : "Add latitude and longitude to procurement centers to display them on the map."}
                </p>

              </div>
            )}

          </div>
        </div>

        {/* ===================================================
            CENTER MONITORING
        =================================================== */}

        <div className="center-monitor-panel">

          <div className="center-monitor-header">

            <div>
              <h2>
                {isHindi
                  ? "केंद्र मॉनिटरिंग"
                  : "Center Monitoring"}
              </h2>

              <p>
                {filteredCenters.length}{" "}
                {isHindi
                  ? "केंद्र"
                  : `center${
                      filteredCenters.length !== 1
                        ? "s"
                        : ""
                    }`}
              </p>
            </div>

            <Crosshair size={22} />

          </div>

          <div className="center-monitor-list">

            {filteredCenters.length === 0 ? (
              <div className="center-empty">

                <Search size={30} />

                <h3>
                  {isHindi
                    ? "कोई केंद्र नहीं मिला"
                    : "No centers found"}
                </h3>

                <p>
                  {isHindi
                    ? "अपनी खोज या स्थिति फ़िल्टर बदलकर देखें।"
                    : "Try changing your search or status filter."}
                </p>

              </div>
            ) : (
              filteredCenters.map((center) => (
                <button
                  key={center.id}
                  className={
                    selectedCenter?.id === center.id
                      ? "center-monitor-card selected"
                      : "center-monitor-card"
                  }
                  onClick={() =>
                    handleSelectCenter(center)
                  }
                >

                  <div className="center-card-top">

                    <div className="center-card-icon">
                      <MapPin size={20} />
                    </div>

                    <div className="center-card-title">

                      <strong>
                        {center.center_name}
                      </strong>

                      <span>
                        {center.center_code}
                        {" • "}
                        {center.district}
                      </span>

                    </div>

                    <span
                      className={getStatusClass(
                        center.status
                      )}
                    >
                      {getStatusIcon(
                        center.status
                      )}

                      {getStatusLabel(
                        center.status,
                        isHindi
                      )}
                    </span>

                  </div>

                  <div className="center-capacity-bar">

                    <div className="capacity-bar-label">

                      <span>
                        {isHindi
                          ? "क्षमता"
                          : "Capacity"}
                      </span>

                      <strong>
                        {Number(
                          center.utilization_percentage ||
                            0
                        ).toFixed(1)}
                        %
                      </strong>

                    </div>

                    <div className="capacity-track">

                      <div
                        className={
                          center.status ===
                          "Near Full"
                            ? "capacity-fill danger"
                            : center.status ===
                              "Busy"
                            ? "capacity-fill busy"
                            : "capacity-fill normal"
                        }
                        style={{
                          width: `${Math.min(
                            Number(
                              center.utilization_percentage ||
                                0
                            ),
                            100
                          )}%`,
                        }}
                      />

                    </div>
                  </div>

                  <div className="center-mini-stats">

                    <div>
                      <Users size={15} />

                      <span>
                        {isHindi
                          ? "कतार"
                          : "Queue"}
                      </span>

                      <strong>
                        {center.active_queue || 0}
                      </strong>
                    </div>

                    <div>
                      <Package size={15} />

                      <span>
                        {isHindi
                          ? "उपयोग"
                          : "Used"}
                      </span>

                      <strong>
                        {center.used_capacity || 0}
                      </strong>

                      <small>Q</small>
                    </div>

                    <div>
                      <Gauge size={15} />

                      <span>
                        {isHindi
                          ? "खाली"
                          : "Free"}
                      </span>

                      <strong>
                        {center.remaining_capacity || 0}
                      </strong>

                      <small>Q</small>
                    </div>

                  </div>

                </button>
              ))
            )}

          </div>
        </div>

      </div>

      {/* =====================================================
          SELECTED CENTER DETAIL
      ===================================================== */}

      {selectedCenter && (
        <div className="selected-center-detail">

          <div className="selected-center-header">

            <div>

              <span className="detail-eyebrow">
                {isHindi
                  ? "चयनित खरीद केंद्र"
                  : "SELECTED PROCUREMENT CENTER"}
              </span>

              <h2>
                {selectedCenter.center_name}
              </h2>

              <p>
                {selectedCenter.center_code}
                {" • "}
                {selectedCenter.district}
                {", "}
                {selectedCenter.state}
              </p>

            </div>

            <span
              className={getStatusClass(
                selectedCenter.status
              )}
            >
              {getStatusIcon(
                selectedCenter.status
              )}

              {getStatusLabel(
                selectedCenter.status,
                isHindi
              )}
            </span>

          </div>

          <div className="detail-grid">

            <div className="detail-box">
              <span>
                {isHindi
                  ? "दैनिक क्षमता"
                  : "Daily Capacity"}
              </span>

              <strong>
                {selectedCenter.capacity_per_day || 0}{" "}
                {isHindi
                  ? "क्विंटल"
                  : "Quintal"}
              </strong>
            </div>

            <div className="detail-box">
              <span>
                {isHindi
                  ? "उपयोग की गई क्षमता"
                  : "Used Capacity"}
              </span>

              <strong>
                {selectedCenter.used_capacity || 0}{" "}
                {isHindi
                  ? "क्विंटल"
                  : "Quintal"}
              </strong>
            </div>

            <div className="detail-box">
              <span>
                {isHindi
                  ? "शेष"
                  : "Remaining"}
              </span>

              <strong>
                {selectedCenter.remaining_capacity || 0}{" "}
                {isHindi
                  ? "क्विंटल"
                  : "Quintal"}
              </strong>
            </div>

            <div className="detail-box">
              <span>
                {isHindi
                  ? "उपयोग"
                  : "Utilization"}
              </span>

              <strong>
                {Number(
                  selectedCenter.utilization_percentage ||
                    0
                ).toFixed(1)}
                %
              </strong>
            </div>

            <div className="detail-box">
              <span>
                {isHindi
                  ? "सक्रिय कतार"
                  : "Active Queue"}
              </span>

              <strong>
                {selectedCenter.active_queue || 0}{" "}
                {isHindi
                  ? "किसान"
                  : "Farmers"}
              </strong>
            </div>

            <div className="detail-box">
              <span>
                {isHindi
                  ? "कतार में मात्रा"
                  : "Queued Quantity"}
              </span>

              <strong>
                {selectedCenter.queued_quantity || 0}{" "}
                {isHindi
                  ? "क्विंटल"
                  : "Quintal"}
              </strong>
            </div>

            <div className="detail-box">
              <span>
                {isHindi
                  ? "लंबित"
                  : "Pending"}
              </span>

              <strong>
                {selectedCenter.pending_count || 0}
              </strong>
            </div>

            <div className="detail-box">
              <span>
                {isHindi
                  ? "स्वीकृत"
                  : "Approved"}
              </span>

              <strong>
                {selectedCenter.approved_count || 0}
              </strong>
            </div>

          </div>

          <div className="selected-center-footer">

            <div>
              <MapPin size={18} />

              <span>
                {selectedCenter.address}
              </span>
            </div>

            {selectedCenter.latitude !== null &&
              selectedCenter.latitude !== undefined &&
              selectedCenter.longitude !== null &&
              selectedCenter.longitude !== undefined && (
                <div className="selected-center-actions">

                  <button
                    onClick={() =>
                      setSelectedMapCenter([
                        Number(
                          selectedCenter.latitude
                        ),
                        Number(
                          selectedCenter.longitude
                        ),
                      ])
                    }
                  >
                    <Navigation size={17} />

                    {isHindi
                      ? "मैप पर केंद्रित करें"
                      : "Focus on Map"}
                  </button>

                  <a
                    href={getGoogleMapsUrl(
                      Number(
                        selectedCenter.latitude
                      ),
                      Number(
                        selectedCenter.longitude
                      )
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={16} />

                    {isHindi
                      ? "Google Maps में खोलें"
                      : "Open in Google Maps"}
                  </a>

                </div>
              )}

          </div>
        </div>
      )}

      {/* =====================================================
          LOCATION COVERAGE
      ===================================================== */}

      <div className="map-location-info">

        <div>
          <MapPin size={18} />

          <div>
            <strong>
              {isHindi
                ? "लोकेशन कवरेज"
                : "Location Coverage"}
            </strong>

            <span>
              {summary.located_centers || 0}
              {" "}
              {isHindi ? "में से" : "of"}
              {" "}
              {summary.total_centers || 0}
              {" "}
              {isHindi
                ? "केंद्रों में मैप निर्देशांक हैं"
                : "centers have map coordinates"}
            </span>
          </div>
        </div>

        {(summary.unlocated_centers || 0) > 0 && (
          <span className="location-warning">

            {summary.unlocated_centers}
            {" "}

            {isHindi
              ? "केंद्रों में लोकेशन डेटा आवश्यक है"
              : `center${
                  summary.unlocated_centers !== 1
                    ? "s"
                    : ""
                } need location data`}

          </span>
        )}

      </div>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <div className="map-footer-info">

        <div>
          <Activity size={18} />

          <span>
            {isHindi
              ? "हर 10 सेकंड में ऑटो-रिफ्रेश"
              : "Auto-refreshing every 10 seconds"}
          </span>
        </div>

        <span>
          {isHindi
            ? "अंतिम अपडेट:"
            : "Last updated:"}{" "}
          {lastUpdated
            ? lastUpdated.toLocaleTimeString(
                isHindi
                  ? "hi-IN"
                  : "en-IN"
              )
            : "--"}
        </span>

      </div>

      {/* =====================================================
          DEMO / GPS NOTE
      ===================================================== */}

      <div className="map-demo-note">

        <MapPin size={17} />

        <span>
          {isHindi
            ? "खरीद केंद्रों की लोकेशन संग्रहीत अक्षांश और देशांतर पर आधारित है। वास्तविक समय का GPS स्रोत कनेक्ट होने तक यह मैप लाइव GPS मूवमेंट प्रदर्शित नहीं करता है।"
            : "Procurement center locations are based on stored latitude and longitude. This map does not represent live GPS movement unless a real-time GPS source is connected."}
        </span>

      </div>

    </div>
  );
}

export default LiveMap;