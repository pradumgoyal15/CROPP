import { useEffect, useState } from "react";
import API from "../services/api";

function formatDateForInput(value) {
  if (!value) return "";

  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(value) {
  if (!value) return "—";

  const normalized = formatDateForInput(value);

  if (!normalized) {
    return "Invalid Date";
  }

  const [year, month, day] = normalized.split("-");

  return `${day}-${month}-${year}`;
}

function Procurements() {
  const [procurements, setProcurements] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [crops, setCrops] = useState([]);
  const [centers, setCenters] = useState([]);

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [capacity, setCapacity] = useState(null);
  const [capacityError, setCapacityError] = useState("");

  const [updatingId, setUpdatingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [formData, setFormData] = useState({
    farmer_id: "",
    crop_id: "",
    center_id: "",
    quantity: "",
    price_per_unit: "",
    procurement_date: "",
    status: "Pending",
  });

  useEffect(() => {
    fetchProcurements();
    fetchFarmers();
    fetchCrops();
    fetchCenters();
  }, []);

  useEffect(() => {
    if (!formData.center_id) {
      setCapacity(null);
      setCapacityError("");
      return;
    }

    API.get(`/centers/${formData.center_id}/capacity`)
      .then((response) => {
        setCapacity(response.data);
        setCapacityError("");
      })
      .catch((error) => {
        console.error("Error fetching center capacity:", error);
        setCapacity(null);
        setCapacityError("Unable to check center capacity.");
      });
  }, [formData.center_id]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchProcurements(false);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchProcurements = async (showLoading = true) => {
    try {
      if (showLoading) {
        setRefreshing(true);
      }

      const response = await API.get("/procurements/");

      const cleanedData = Array.isArray(response.data)
        ? response.data.map((item) => ({
            ...item,
            procurement_date: formatDateForInput(item.procurement_date),
          }))
        : [];

      setProcurements(cleanedData);
    } catch (error) {
      console.error("Error fetching procurements:", error);

      if (showLoading) {
        alert("Failed to load procurements");
      }
    } finally {
      if (showLoading) {
        setRefreshing(false);
      }
    }
  };

  const fetchFarmers = async () => {
    try {
      const response = await API.get("/farmers/");
      setFarmers(response.data);
    } catch (error) {
      console.error("Error fetching farmers:", error);
    }
  };

  const fetchCrops = async () => {
    try {
      const response = await API.get("/crops/");
      setCrops(response.data);
    } catch (error) {
      console.error("Error fetching crops:", error);
    }
  };

  const fetchCenters = async () => {
    try {
      const response = await API.get("/centers/");
      setCenters(response.data);
    } catch (error) {
      console.error("Error fetching centers:", error);
    }
  };

  const openAddModal = () => {
    setEditingId(null);

    setFormData({
      farmer_id: "",
      crop_id: "",
      center_id: "",
      quantity: "",
      price_per_unit: "",
      procurement_date: formatDateForInput(new Date()),
      status: "Pending",
    });

    setCapacity(null);
    setCapacityError("");
    setShowModal(true);
  };

  const openEditModal = (procurement) => {
    setEditingId(procurement.procurement_id);

    setFormData({
      farmer_id: procurement.farmer_id,
      crop_id: procurement.crop_id,
      center_id: procurement.center_id,
      quantity: procurement.quantity,
      price_per_unit: procurement.price_per_unit,
      procurement_date: formatDateForInput(
        procurement.procurement_date
      ),
      status: procurement.status,
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setCapacity(null);
    setCapacityError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCropChange = (e) => {
    const cropId = e.target.value;

    const selectedCrop = crops.find(
      (crop) => String(crop.id) === String(cropId)
    );

    setFormData((prev) => ({
      ...prev,
      crop_id: cropId,
      price_per_unit: selectedCrop
        ? selectedCrop.msp_price
        : "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.farmer_id ||
      !formData.crop_id ||
      !formData.center_id ||
      !formData.quantity ||
      !formData.price_per_unit ||
      !formData.procurement_date
    ) {
      alert("Please fill all required fields.");
      return;
    }

    const normalizedDate = formatDateForInput(
      formData.procurement_date
    );

    if (!normalizedDate) {
      alert("Please select a valid procurement date.");
      return;
    }

    if (
      capacity &&
      Number(formData.quantity) >
        Number(capacity.remaining_capacity)
    ) {
      alert(
        `Only ${capacity.remaining_capacity} Quintal capacity is available at this center.`
      );
      return;
    }

    const payload = {
      ...formData,
      procurement_date: normalizedDate,
    };

    try {
      if (editingId) {
        await API.put(`/procurements/${editingId}`, payload);

        alert("Procurement updated successfully!");
      } else {
        await API.post("/procurements/", payload);

        alert("Procurement added successfully!");
      }

      closeModal();

      await fetchProcurements();
    } catch (error) {
      console.error("Error saving procurement:", error);

      alert(
        error.response?.data?.error ||
          "Failed to save procurement. Please try again."
      );
    }
  };

  const updateStatus = async (procurement, newStatus) => {
    const actionText =
      newStatus === "Approved"
        ? "approve"
        : newStatus === "Cancelled"
        ? "cancel"
        : "update";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionText} procurement #${procurement.procurement_id}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingId(procurement.procurement_id);

      /*
       * IMPORTANT:
       * We intentionally send ONLY the status here.
       *
       * This prevents the old JavaScript date value such as:
       * "Fri, 11 Sep 2026 00:00:00 GMT"
       *
       * from being sent to MySQL.
       */
      await API.put(
        `/procurements/${procurement.procurement_id}`,
        {
          status: newStatus,
        }
      );

      await fetchProcurements(false);

      alert(
        newStatus === "Approved"
          ? "Procurement approved successfully!"
          : newStatus === "Cancelled"
          ? "Procurement cancelled successfully!"
          : "Procurement status updated successfully!"
      );
    } catch (error) {
      console.error("Error updating procurement status:", error);

      alert(
        error.response?.data?.error ||
          "Failed to update procurement status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this procurement?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await API.delete(`/procurements/${id}`);

      alert("Procurement deleted successfully!");

      await fetchProcurements(false);
    } catch (error) {
      console.error("Error deleting procurement:", error);

      alert(
        error.response?.data?.error ||
          "Failed to delete procurement. Please try again."
      );
    }
  };

  const filteredProcurements = procurements.filter(
    (procurement) => {
      const searchText = search.toLowerCase();

      return (
        String(procurement.procurement_id || "")
          .toLowerCase()
          .includes(searchText) ||
        procurement.farmer_name
          ?.toLowerCase()
          .includes(searchText) ||
        procurement.crop_name
          ?.toLowerCase()
          .includes(searchText) ||
        procurement.center_name
          ?.toLowerCase()
          .includes(searchText) ||
        procurement.center_code
          ?.toLowerCase()
          .includes(searchText) ||
        procurement.queue_number
          ?.toLowerCase()
          .includes(searchText) ||
        procurement.status
          ?.toLowerCase()
          .includes(searchText)
      );
    }
  );

  const getStatusClass = (status) => {
    switch (status) {
      case "Completed":
        return "status completed";

      case "Pending":
        return "status pending";

      case "Approved":
        return "status approved";

      case "Cancelled":
        return "status cancelled";

      default:
        return "status";
    }
  };

  const isUpdating = (id) => {
    return updatingId === id;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Procurements</h1>

          <p>
            Manage farmer crop procurement records
          </p>
        </div>

        <button
          className="add-btn"
          onClick={openAddModal}
        >
          + Add Procurement
        </button>
      </div>

      <div
        style={{
          marginBottom: "18px",
          padding: "14px 16px",
          borderRadius: "10px",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div>
          <strong>🔄 Live Queue Sync</strong>

          <div
            style={{
              marginTop: "4px",
              fontSize: "13px",
              color: "#6b7280",
            }}
          >
            Queue positions automatically refresh every
            10 seconds.
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchProcurements()}
          disabled={refreshing}
          style={{
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: "7px",
            background: "#ffffff",
            cursor: refreshing
              ? "not-allowed"
              : "pointer",
          }}
        >
          {refreshing ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      <div className="search-container">
        <input
          type="text"
          placeholder="Search farmer, crop, center, queue or status..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="search-input"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Farmer</th>
              <th>Crop</th>
              <th>Center</th>
              <th>Queue</th>
              <th>Position</th>
              <th>Quantity</th>
              <th>Price / Unit</th>
              <th>Total Amount</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredProcurements.length > 0 ? (
              filteredProcurements.map(
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
                        {procurement.farmer_name}
                      </strong>

                      <br />

                      <small>
                        {procurement.farmer_phone}
                      </small>
                    </td>

                    <td>
                      {procurement.crop_name}
                    </td>

                    <td>
                      <strong>
                        {procurement.center_name}
                      </strong>

                      <br />

                      <small>
                        {procurement.center_code}
                      </small>
                    </td>

                    <td>
                      {procurement.queue_number ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "7px 10px",
                            borderRadius: "7px",
                            background: "#eef2ff",
                            fontWeight: "600",
                          }}
                        >
                          {
                            procurement.queue_number
                          }
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td>
                      {procurement.queue_position ? (
                        <>
                          <strong>
                            #
                            {
                              procurement.queue_position
                            }
                          </strong>

                          <br />

                          <small>
                            {Math.max(
                              Number(
                                procurement.queue_position
                              ) - 1,
                              0
                            )}{" "}
                            ahead
                          </small>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td>
                      {procurement.quantity}{" "}
                      Quintal
                    </td>

                    <td>
                      ₹
                      {Number(
                        procurement.price_per_unit
                      ).toLocaleString("en-IN")}
                    </td>

                    <td>
                      <strong>
                        ₹
                        {Number(
                          procurement.total_amount
                        ).toLocaleString("en-IN")}
                      </strong>
                    </td>

                    <td>
                      {formatDateForDisplay(
                        procurement.procurement_date
                      )}
                    </td>

                    <td>
                      <span
                        className={getStatusClass(
                          procurement.status
                        )}
                      >
                        {procurement.status}
                      </span>
                    </td>

                    <td>
                      <div
                        className="action-buttons"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "7px",
                        }}
                      >
                        {procurement.status ===
                          "Pending" && (
                          <button
                            type="button"
                            className="edit-btn"
                            disabled={isUpdating(
                              procurement.procurement_id
                            )}
                            onClick={() =>
                              updateStatus(
                                procurement,
                                "Approved"
                              )
                            }
                          >
                            {isUpdating(
                              procurement.procurement_id
                            )
                              ? "Updating..."
                              : "Approve"}
                          </button>
                        )}

                        {procurement.status ===
                          "Pending" && (
                          <button
                            type="button"
                            className="delete-btn"
                            disabled={isUpdating(
                              procurement.procurement_id
                            )}
                            onClick={() =>
                              updateStatus(
                                procurement,
                                "Cancelled"
                              )
                            }
                          >
                            Cancel
                          </button>
                        )}

                        <button
                          type="button"
                          className="edit-btn"
                          onClick={() =>
                            openEditModal(
                              procurement
                            )
                          }
                          disabled={isUpdating(
                            procurement.procurement_id
                          )}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="delete-btn"
                          onClick={() =>
                            handleDelete(
                              procurement.procurement_id
                            )
                          }
                          disabled={isUpdating(
                            procurement.procurement_id
                          )}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )
            ) : (
              <tr>
                <td
                  colSpan="12"
                  className="no-data"
                >
                  No procurements found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>
                {editingId
                  ? "Edit Procurement"
                  : "Add Procurement"}
              </h2>

              <button
                className="close-btn"
                onClick={closeModal}
                type="button"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Farmer *</label>

                <select
                  name="farmer_id"
                  value={formData.farmer_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Select Farmer
                  </option>

                  {farmers.map((farmer) => (
                    <option
                      key={farmer.id}
                      value={farmer.id}
                    >
                      {farmer.name} -{" "}
                      {farmer.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Crop *</label>

                <select
                  name="crop_id"
                  value={formData.crop_id}
                  onChange={handleCropChange}
                  required
                >
                  <option value="">
                    Select Crop
                  </option>

                  {crops.map((crop) => (
                    <option
                      key={crop.id}
                      value={crop.id}
                    >
                      {crop.crop_name} - MSP ₹
                      {crop.msp_price}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>
                  Procurement Center *
                </label>

                <select
                  name="center_id"
                  value={formData.center_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Select Center
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

              {capacity && (
                <div className="capacity-card">
                  <div className="capacity-header">
                    <strong>
                      {capacity.center_name}
                    </strong>

                    <span>
                      {
                        capacity.utilization_percentage
                      }
                      % utilized
                    </span>
                  </div>

                  <div className="capacity-bar">
                    <div
                      className="capacity-fill"
                      style={{
                        width: `${Math.min(
                          Number(
                            capacity.utilization_percentage
                          ),
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>

                  <div className="capacity-details">
                    <span>
                      Used:{" "}
                      <strong>
                        {capacity.used_capacity}{" "}
                        Quintal
                      </strong>
                    </span>

                    <span>
                      Available:{" "}
                      <strong>
                        {
                          capacity.remaining_capacity
                        }{" "}
                        Quintal
                      </strong>
                    </span>

                    <span>
                      Daily Capacity:{" "}
                      <strong>
                        {capacity.capacity_per_day}{" "}
                        Quintal
                      </strong>
                    </span>
                  </div>

                  {Number(formData.quantity) >
                    Number(
                      capacity.remaining_capacity
                    ) && (
                    <div className="capacity-warning">
                      ⚠️ Requested quantity exceeds
                      the remaining capacity of this
                      center.
                    </div>
                  )}
                </div>
              )}

              {capacityError && (
                <div className="capacity-error">
                  {capacityError}
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>
                    Quantity (Quintal) *
                  </label>

                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    min="0.01"
                    step="0.01"
                    placeholder="Enter quantity"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Price / Unit *</label>

                  <input
                    type="number"
                    name="price_per_unit"
                    value={
                      formData.price_per_unit
                    }
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="Enter price"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  Procurement Date *
                </label>

                <input
                  type="date"
                  name="procurement_date"
                  value={
                    formData.procurement_date
                  }
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Status *</label>

                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Pending">
                    Pending
                  </option>

                  <option value="Approved">
                    Approved
                  </option>

                  <option value="Completed">
                    Completed
                  </option>

                  <option value="Cancelled">
                    Cancelled
                  </option>
                </select>
              </div>

              {formData.quantity &&
                formData.price_per_unit && (
                  <div className="total-preview">
                    <span>
                      Estimated Total:
                    </span>

                    <strong>
                      ₹
                      {(
                        Number(
                          formData.quantity
                        ) *
                        Number(
                          formData.price_per_unit
                        )
                      ).toLocaleString("en-IN")}
                    </strong>
                  </div>
                )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-btn"
                >
                  {editingId
                    ? "Update Procurement"
                    : "Save Procurement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Procurements;