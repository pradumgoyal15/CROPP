import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import { useLanguage } from "../components/LanguageContext";

function Farmers() {
  const { language } = useLanguage();
  const isHindi = language === "hi";

  const [farmers, setFarmers] = useState([]);
  const [procurements, setProcurements] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    village: "",
    district: "",
    state: "",
  });

  useEffect(() => {
    fetchFarmers();
    fetchProcurements();
  }, []);

  const fetchFarmers = async () => {
    try {
      const response = await API.get("/farmers/");
      setFarmers(response.data);
    } catch (error) {
      console.error("Error fetching farmers:", error);
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

  const getFarmerStats = (farmerId) => {
    const farmerProcurements = procurements.filter(
      (item) => Number(item.farmer_id) === Number(farmerId)
    );

    const totalAmount = farmerProcurements.reduce(
      (sum, item) => sum + Number(item.total_amount || 0),
      0
    );

    const totalQuantity = farmerProcurements.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );

    return {
      count: farmerProcurements.length,
      totalAmount,
      totalQuantity,
    };
  };

  const stats = useMemo(() => {
    const totalFarmers = farmers.length;

    const totalProcurement = procurements.reduce(
      (sum, item) => sum + Number(item.total_amount || 0),
      0
    );

    const totalQuantity = procurements.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );

    const activeFarmers = new Set(
      procurements.map((item) => item.farmer_id)
    ).size;

    return {
      totalFarmers,
      activeFarmers,
      totalProcurement,
      totalQuantity,
    };
  }, [farmers, procurements]);

  const filteredFarmers = farmers.filter((farmer) => {
    const text = search.toLowerCase();

    return (
      farmer.name?.toLowerCase().includes(text) ||
      farmer.phone?.toLowerCase().includes(text) ||
      farmer.email?.toLowerCase().includes(text) ||
      farmer.village?.toLowerCase().includes(text) ||
      farmer.district?.toLowerCase().includes(text) ||
      farmer.state?.toLowerCase().includes(text)
    );
  });

  const openAddModal = () => {
    setEditingId(null);

    setFormData({
      name: "",
      phone: "",
      email: "",
      village: "",
      district: "",
      state: "",
    });

    setShowModal(true);
  };

  const openEditModal = (farmer) => {
    setEditingId(farmer.id);

    setFormData({
      name: farmer.name || "",
      phone: farmer.phone || "",
      email: farmer.email || "",
      village: farmer.village || "",
      district: farmer.district || "",
      state: farmer.state || "",
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      alert(
        isHindi
          ? "किसान का नाम और फोन नंबर आवश्यक है।"
          : "Farmer name and phone are required."
      );
      return;
    }

    if (formData.phone.length !== 10) {
      alert(
        isHindi
          ? "कृपया 10 अंकों का सही फोन नंबर दर्ज करें।"
          : "Please enter a valid 10-digit phone number."
      );
      return;
    }

    try {
      if (editingId) {
        await API.put(`/farmers/${editingId}`, formData);

        alert(
          isHindi
            ? "किसान सफलतापूर्वक अपडेट किया गया!"
            : "Farmer updated successfully!"
        );
      } else {
        await API.post("/farmers/", formData);

        alert(
          isHindi
            ? "किसान सफलतापूर्वक जोड़ा गया!"
            : "Farmer added successfully!"
        );
      }

      closeModal();
      fetchFarmers();
    } catch (error) {
      console.error("Error saving farmer:", error);

      alert(
        error.response?.data?.error ||
          (isHindi ? "किसान को सेव नहीं किया जा सका।" : "Failed to save farmer.")
      );
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        isHindi
          ? "क्या आप इस किसान को हटाना चाहते हैं?"
          : "Are you sure you want to delete this farmer?"
      )
    ) {
      return;
    }

    try {
      await API.delete(`/farmers/${id}`);

      alert(
        isHindi
          ? "किसान सफलतापूर्वक हटाया गया!"
          : "Farmer deleted successfully!"
      );

      fetchFarmers();
      fetchProcurements();
    } catch (error) {
      console.error("Error deleting farmer:", error);

      alert(
        error.response?.data?.error ||
          (isHindi ? "किसान को हटाया नहीं जा सका।" : "Failed to delete farmer.")
      );
    }
  };

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1>{isHindi ? "किसान" : "Farmers"}</h1>

          <p>
            {isHindi
              ? "पंजीकृत किसानों और खरीद गतिविधियों का प्रबंधन करें"
              : "Manage registered farmers and procurement activity"}
          </p>
        </div>

        <button className="primary-btn" onClick={openAddModal}>
          + {isHindi ? "किसान जोड़ें" : "Add Farmer"}
        </button>
      </div>

      {/* STATISTICS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👨‍🌾</div>

          <div>
            <span>{isHindi ? "कुल किसान" : "Total Farmers"}</span>
            <h2>{stats.totalFarmers}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🌾</div>

          <div>
            <span>{isHindi ? "सक्रिय किसान" : "Active Farmers"}</span>
            <h2>{stats.activeFarmers}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">₹</div>

          <div>
            <span>
              {isHindi ? "कुल खरीद मूल्य" : "Total Procurement"}
            </span>

            <h2>
              ₹
              {stats.totalProcurement.toLocaleString("en-IN")}
            </h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚖️</div>

          <div>
            <span>{isHindi ? "कुल मात्रा" : "Total Quantity"}</span>

            <h2>
              {stats.totalQuantity.toLocaleString("en-IN")}{" "}
              {isHindi ? "क्विंटल" : "Q"}
            </h2>
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="search-container">
        <input
          type="text"
          placeholder={
            isHindi
              ? "किसान, फोन, गांव, जिला खोजें..."
              : "Search farmer, phone, village, district..."
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* TABLE */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{isHindi ? "किसान" : "Farmer"}</th>
              <th>{isHindi ? "संपर्क" : "Contact"}</th>
              <th>{isHindi ? "स्थान" : "Location"}</th>
              <th>{isHindi ? "खरीद" : "Procurements"}</th>
              <th>{isHindi ? "मात्रा" : "Quantity"}</th>
              <th>{isHindi ? "कुल मूल्य" : "Total Value"}</th>
              <th>{isHindi ? "कार्य" : "Actions"}</th>
            </tr>
          </thead>

          <tbody>
            {filteredFarmers.length > 0 ? (
              filteredFarmers.map((farmer) => {
                const farmerStats = getFarmerStats(farmer.id);

                return (
                  <tr key={farmer.id}>
                    {/* FARMER */}
                    <td>
                      <strong>{farmer.name}</strong>

                      <br />

                      <small>
                        {isHindi ? "किसान आईडी" : "Farmer ID"}: #{farmer.id}
                      </small>
                    </td>

                    {/* CONTACT */}
                    <td>
                      <strong>{farmer.phone}</strong>

                      {farmer.email && (
                        <>
                          <br />
                          <small>{farmer.email}</small>
                        </>
                      )}
                    </td>

                    {/* LOCATION */}
                    <td>
                      {farmer.village && (
                        <strong>{farmer.village}</strong>
                      )}

                      {farmer.district && (
                        <>
                          <br />

                          <small>
                            {farmer.district}
                            {farmer.state ? `, ${farmer.state}` : ""}
                          </small>
                        </>
                      )}
                    </td>

                    {/* PROCUREMENT COUNT */}
                    <td>
                      <strong>{farmerStats.count}</strong>
                    </td>

                    {/* QUANTITY */}
                    <td>
                      {farmerStats.totalQuantity.toLocaleString("en-IN")}{" "}
                      {isHindi ? "क्विंटल" : "Quintal"}
                    </td>

                    {/* TOTAL */}
                    <td>
                      <strong>
                        ₹
                        {farmerStats.totalAmount.toLocaleString(
                          "en-IN"
                        )}
                      </strong>
                    </td>

                    {/* ACTIONS */}
                    <td>
                      <div className="action-buttons">
                        <button
                          className="edit-btn"
                          onClick={() => openEditModal(farmer)}
                        >
                          {isHindi ? "संपादित करें" : "Edit"}
                        </button>

                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(farmer.id)}
                        >
                          {isHindi ? "हटाएं" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan="7"
                  style={{
                    textAlign: "center",
                    padding: "30px",
                  }}
                >
                  {isHindi
                    ? "कोई किसान नहीं मिला।"
                    : "No farmers found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
                      ? "किसान संपादित करें"
                      : "Edit Farmer"
                    : isHindi
                    ? "किसान जोड़ें"
                    : "Add Farmer"}
                </h2>

                <p>
                  {isHindi
                    ? "किसान पंजीकरण विवरण दर्ज करें"
                    : "Enter farmer registration details"}
                </p>
              </div>

              <button className="close-btn" onClick={closeModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* NAME */}
              <div className="form-group">
                <label>
                  {isHindi ? "किसान का नाम" : "Farmer Name"}{" "}
                  <span>*</span>
                </label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={
                    isHindi
                      ? "किसान का नाम दर्ज करें"
                      : "Enter farmer name"
                  }
                />
              </div>

              {/* PHONE */}
              <div className="form-group">
                <label>
                  {isHindi ? "फोन नंबर" : "Phone Number"}{" "}
                  <span>*</span>
                </label>

                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  maxLength="10"
                  placeholder={
                    isHindi
                      ? "10 अंकों का मोबाइल नंबर"
                      : "10-digit mobile number"
                  }
                />
              </div>

              {/* EMAIL */}
              <div className="form-group">
                <label>{isHindi ? "ईमेल" : "Email"}</label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="farmer@example.com"
                />
              </div>

              {/* VILLAGE */}
              <div className="form-group">
                <label>{isHindi ? "गांव" : "Village"}</label>

                <input
                  type="text"
                  name="village"
                  value={formData.village}
                  onChange={handleChange}
                  placeholder={
                    isHindi
                      ? "गांव का नाम दर्ज करें"
                      : "Enter village"
                  }
                />
              </div>

              {/* DISTRICT */}
              <div className="form-group">
                <label>{isHindi ? "जिला" : "District"}</label>

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
                />
              </div>

              {/* STATE */}
              <div className="form-group">
                <label>{isHindi ? "राज्य" : "State"}</label>

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
                />
              </div>

              {/* BUTTONS */}
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeModal}
                >
                  {isHindi ? "रद्द करें" : "Cancel"}
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                >
                  {editingId
                    ? isHindi
                      ? "किसान अपडेट करें"
                      : "Update Farmer"
                    : isHindi
                    ? "किसान सेव करें"
                    : "Save Farmer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Farmers;