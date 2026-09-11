import { useEffect, useState } from "react";

import {
  Search,
  Plus,
  Sprout,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import API from "../services/api";
import { useLanguage } from "../components/LanguageContext";

function Crops() {
  const { language } = useLanguage();
  const isHindi = language === "hi";

  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCrop, setEditingCrop] = useState(null);

  const [formData, setFormData] = useState({
    crop_name: "",
    crop_code: "",
    category: "",
    msp_price: "",
    unit: "",
    season: "",
  });

  useEffect(() => {
    fetchCrops();
  }, []);

  /* =========================
     FETCH CROPS
  ========================= */
  const fetchCrops = async () => {
    try {
      setLoading(true);

      const response = await API.get("/crops/");

      setCrops(response.data);
      setError("");
    } catch (error) {
      console.error(error);

      setError(
        isHindi
          ? "फसलें लोड नहीं हो सकीं। कृपया बैकएंड कनेक्शन जांचें।"
          : "Unable to load crops. Please check the backend connection."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     HANDLE INPUT CHANGE
  ========================= */
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  /* =========================
     OPEN ADD MODAL
  ========================= */
  const openAddModal = () => {
    setEditingCrop(null);

    setFormData({
      crop_name: "",
      crop_code: "",
      category: "",
      msp_price: "",
      unit: "",
      season: "",
    });

    setShowModal(true);
  };

  /* =========================
     OPEN EDIT MODAL
  ========================= */
  const openEditModal = (crop) => {
    setEditingCrop(crop);

    setFormData({
      crop_name: crop.crop_name || "",
      crop_code: crop.crop_code || "",
      category: crop.category || "",
      msp_price: crop.msp_price || "",
      unit: crop.unit || "",
      season: crop.season || "",
    });

    setShowModal(true);
  };

  /* =========================
     CLOSE MODAL
  ========================= */
  const closeModal = () => {
    setShowModal(false);
    setEditingCrop(null);

    setFormData({
      crop_name: "",
      crop_code: "",
      category: "",
      msp_price: "",
      unit: "",
      season: "",
    });
  };

  /* =========================
     ADD OR UPDATE CROP
  ========================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingCrop) {
        await API.put(`/crops/${editingCrop.id}`, formData);

        alert(
          isHindi
            ? "फसल सफलतापूर्वक अपडेट की गई!"
            : "Crop updated successfully!"
        );
      } else {
        await API.post("/crops/", formData);

        alert(
          isHindi
            ? "फसल सफलतापूर्वक जोड़ी गई!"
            : "Crop added successfully!"
        );
      }

      closeModal();
      fetchCrops();
    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.error ||
          (isHindi
            ? "फसल सेव नहीं की जा सकी।"
            : "Failed to save crop.")
      );
    }
  };

  /* =========================
     DELETE CROP
  ========================= */
  const handleDeleteCrop = async (crop) => {
    const confirmDelete = window.confirm(
      isHindi
        ? `क्या आप "${crop.crop_name}" फसल को हटाना चाहते हैं?`
        : `Are you sure you want to delete "${crop.crop_name}"?`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await API.delete(`/crops/${crop.id}`);

      alert(
        isHindi
          ? "फसल सफलतापूर्वक हटाई गई!"
          : "Crop deleted successfully!"
      );

      await fetchCrops();
    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.error ||
          (isHindi
            ? "फसल हटाई नहीं जा सकी।"
            : "Failed to delete crop.")
      );
    }
  };

  /* =========================
     SEARCH FILTER
  ========================= */
  const filteredCrops = crops.filter((crop) => {
    const searchText = search.toLowerCase();

    return (
      crop.crop_name?.toLowerCase().includes(searchText) ||
      crop.crop_code?.toLowerCase().includes(searchText) ||
      crop.category?.toLowerCase().includes(searchText)
    );
  });

  return (
    <div className="crops-page">
      {/* PAGE HEADER */}
      <div className="page-top">
        <div>
          <h2>
            {isHindi ? "फसल प्रबंधन" : "Crops Management"}
          </h2>

          <p>
            {isHindi
              ? "फसलों, श्रेणियों और न्यूनतम समर्थन मूल्य का प्रबंधन करें"
              : "Manage crops, categories and minimum support prices"}
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={openAddModal}
        >
          <Plus size={18} />

          {isHindi ? "फसल जोड़ें" : "Add Crop"}
        </button>
      </div>

      {/* TOOLBAR */}
      <div className="farmers-toolbar">
        <div className="search-bar">
          <Search size={18} />

          <input
            type="text"
            placeholder={
              isHindi
                ? "फसल का नाम, कोड या श्रेणी खोजें..."
                : "Search by crop name, code or category..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="farmer-count">
          <Sprout size={18} />

          <span>
            {isHindi ? "कुल फसलें" : "Total Crops"}: {crops.length}
          </span>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="alert-error">
          {error}
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="dashboard-message">
          {isHindi
            ? "फसलें लोड हो रही हैं..."
            : "Loading crops..."}
        </div>
      )}

      {/* CROPS TABLE */}
      {!loading && !error && (
        <div className="data-card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{isHindi ? "आईडी" : "ID"}</th>

                  <th>
                    {isHindi ? "फसल का नाम" : "Crop Name"}
                  </th>

                  <th>
                    {isHindi ? "फसल कोड" : "Crop Code"}
                  </th>

                  <th>
                    {isHindi ? "श्रेणी" : "Category"}
                  </th>

                  <th>
                    {isHindi ? "MSP मूल्य" : "MSP Price"}
                  </th>

                  <th>
                    {isHindi ? "इकाई" : "Unit"}
                  </th>

                  <th>
                    {isHindi ? "कार्य" : "Actions"}
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredCrops.length > 0 ? (
                  filteredCrops.map((crop) => (
                    <tr key={crop.id}>
                      {/* ID */}
                      <td>
                        #{crop.id}
                      </td>

                      {/* CROP NAME */}
                      <td className="farmer-name">
                        {crop.crop_name}
                      </td>

                      {/* CROP CODE */}
                      <td>
                        <span className="crop-code">
                          {crop.crop_code}
                        </span>
                      </td>

                      {/* CATEGORY */}
                      <td>
                        <span className="category-badge">
                          {crop.category}
                        </span>
                      </td>

                      {/* MSP */}
                      <td className="price-cell">
                        ₹{" "}
                        {Number(
                          crop.msp_price
                        ).toLocaleString("en-IN")}
                      </td>

                      {/* UNIT */}
                      <td>
                        {crop.unit}
                      </td>

                      {/* ACTIONS */}
                      <td>
                        <div className="action-buttons">
                          <button
                            className="edit-btn"
                            title={
                              isHindi
                                ? "फसल संपादित करें"
                                : "Edit Crop"
                            }
                            onClick={() =>
                              openEditModal(crop)
                            }
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            className="delete-btn"
                            title={
                              isHindi
                                ? "फसल हटाएं"
                                : "Delete Crop"
                            }
                            onClick={() =>
                              handleDeleteCrop(crop)
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="7"
                      className="no-data"
                    >
                      {isHindi
                        ? "कोई फसल नहीं मिली।"
                        : "No crops found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD / EDIT CROP MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>
                  {editingCrop
                    ? isHindi
                      ? "फसल संपादित करें"
                      : "Edit Crop"
                    : isHindi
                    ? "नई फसल जोड़ें"
                    : "Add New Crop"}
                </h2>

                <p>
                  {editingCrop
                    ? isHindi
                      ? "फसल की जानकारी अपडेट करें"
                      : "Update crop information"
                    : isHindi
                    ? "नीचे फसल की जानकारी दर्ज करें"
                    : "Enter crop information below"}
                </p>
              </div>

              <button
                className="close-btn"
                onClick={closeModal}
                type="button"
                title={isHindi ? "बंद करें" : "Close"}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="farmer-form"
            >
              {/* CROP NAME */}
              <div className="form-group">
                <label>
                  {isHindi
                    ? "फसल का नाम"
                    : "Crop Name"}{" "}
                  *
                </label>

                <input
                  type="text"
                  name="crop_name"
                  value={formData.crop_name}
                  onChange={handleInputChange}
                  placeholder={
                    isHindi
                      ? "फसल का नाम दर्ज करें"
                      : "Enter crop name"
                  }
                  required
                />
              </div>

              {/* CODE + CATEGORY */}
              <div className="form-row">
                <div className="form-group">
                  <label>
                    {isHindi
                      ? "फसल कोड"
                      : "Crop Code"}{" "}
                    *
                  </label>

                  <input
                    type="text"
                    name="crop_code"
                    value={formData.crop_code}
                    onChange={handleInputChange}
                    placeholder={
                      isHindi
                        ? "फसल कोड दर्ज करें"
                        : "Enter crop code"
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    {isHindi
                      ? "श्रेणी"
                      : "Category"}{" "}
                    *
                  </label>

                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder={
                      isHindi
                        ? "फसल की श्रेणी दर्ज करें"
                        : "Enter crop category"
                    }
                    required
                  />
                </div>
              </div>

              {/* MSP + UNIT */}
              <div className="form-row">
                <div className="form-group">
                  <label>
                    {isHindi
                      ? "MSP मूल्य"
                      : "MSP Price"}{" "}
                    *
                  </label>

                  <input
                    type="number"
                    name="msp_price"
                    value={formData.msp_price}
                    onChange={handleInputChange}
                    placeholder={
                      isHindi
                        ? "MSP मूल्य दर्ज करें"
                        : "Enter MSP price"
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    {isHindi
                      ? "इकाई"
                      : "Unit"}{" "}
                    *
                  </label>

                  <input
                    type="text"
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    placeholder={
                      isHindi
                        ? "उदाहरण: क्विंटल"
                        : "Example: Quintal"
                    }
                    required
                  />
                </div>
              </div>

              {/* SEASON */}
              <div className="form-group">
                <label>
                  {isHindi ? "मौसम" : "Season"}
                </label>

                <input
                  type="text"
                  name="season"
                  placeholder={
                    isHindi
                      ? "उदाहरण: रबी, खरीफ"
                      : "Example: Rabi, Kharif"
                  }
                  value={formData.season}
                  onChange={handleInputChange}
                />
              </div>

              {/* BUTTONS */}
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                >
                  {isHindi ? "रद्द करें" : "Cancel"}
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                >
                  {editingCrop
                    ? isHindi
                      ? "फसल अपडेट करें"
                      : "Update Crop"
                    : isHindi
                    ? "फसल जोड़ें"
                    : "Add Crop"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Crops;