import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { useLanguage } from "../components/LanguageContext";

function Login() {
  const navigate = useNavigate();
  const { language, toggleLanguage } = useLanguage();

  const isHindi = language === "hi";

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    const username = formData.username.trim();
    const password = formData.password;

    if (!username || !password) {
      setError(
        isHindi
          ? "कृपया यूज़रनेम और पासवर्ड दर्ज करें।"
          : "Please enter username and password."
      );
      return;
    }

    setLoading(true);

    try {
      // Remove any old/invalid session before creating a new one
      localStorage.removeItem("cropp_user");

      const response = await API.post("/auth/login", {
        username,
        password,
      });

      console.log("Login response:", response.data);

      const user = response.data?.user;

      if (!user) {
        throw new Error("User information was not returned by the server.");
      }

      // Save current logged-in user
      localStorage.setItem(
        "cropp_user",
        JSON.stringify(user)
      );

      // Redirect according to role
      if (user.role === "ADMIN") {
        navigate("/", { replace: true });
      } else if (user.role === "FARMER") {
        navigate("/farmer", { replace: true });
      } else if (user.role === "CONSUMER") {
        navigate("/consumer", { replace: true });
      } else {
        localStorage.removeItem("cropp_user");

        setError(
          isHindi
            ? "अमान्य यूज़र भूमिका।"
            : "Invalid user role."
        );
      }
    } catch (error) {
      console.error("Login error:", error);

      if (error.response) {
        setError(
          error.response.data?.error ||
            (isHindi
              ? "यूज़रनेम या पासवर्ड गलत है।"
              : "Invalid username or password.")
        );
      } else if (error.request) {
        setError(
          isHindi
            ? "बैकएंड सर्वर से कनेक्शन नहीं हो पाया। सुनिश्चित करें कि Flask सर्वर चल रहा है।"
            : "Unable to connect to the backend server. Please make sure the Flask server is running."
        );
      } else {
        setError(
          isHindi
            ? "लॉगिन के दौरान एक समस्या हुई।"
            : "Something went wrong during login."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* LANGUAGE BUTTON */}
      <button
        type="button"
        onClick={toggleLanguage}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          padding: "9px 14px",
          borderRadius: "10px",
          border: "1px solid #d9e2d9",
          background: "#ffffff",
          color: "#2f5d3a",
          fontWeight: "600",
          cursor: "pointer",
        }}
      >
        {isHindi ? "English" : "हिन्दी"}
      </button>

      <div className="login-card">

        <div className="login-logo">
          🌱
        </div>

        <h1>CROPP</h1>

        <p className="login-tagline">
          Connected Rural & Organized Procurement Platform
        </p>

        <p className="login-subtitle">
          {isHindi
            ? "स्मार्ट कृषि खरीद को आसान बनाएं।"
            : "Smart agricultural procurement made simple."}
        </p>

        <form onSubmit={handleLogin}>

          {/* USERNAME */}
          <div className="login-field">
            <label>
              {isHindi ? "यूज़रनेम" : "Username"}
            </label>

            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder={
                isHindi
                  ? "यूज़रनेम दर्ज करें"
                  : "Enter username"
              }
              autoComplete="username"
              disabled={loading}
            />
          </div>

          {/* PASSWORD */}
          <div className="login-field">
            <label>
              {isHindi ? "पासवर्ड" : "Password"}
            </label>

            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={
                isHindi
                  ? "पासवर्ड दर्ज करें"
                  : "Enter password"
              }
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {/* ERROR */}
          {error && (
            <div className="login-error">
              ⚠️ {error}
            </div>
          )}

          {/* LOGIN BUTTON */}
          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading
              ? isHindi
                ? "लॉगिन हो रहा है..."
                : "Logging in..."
              : isHindi
              ? "लॉगिन करें"
              : "Login"}
          </button>

        </form>

        {/* DEMO ACCOUNTS */}
        <div className="demo-accounts">

          <h3>
            {isHindi
              ? "डेमो अकाउंट"
              : "Demo Accounts"}
          </h3>

          <div className="demo-account">
            <span>
              🏢 {isHindi ? "एडमिन" : "Admin"}
            </span>

            <code>
              admin / admin123
            </code>
          </div>

          <div className="demo-account">
            <span>
              👨‍🌾 {isHindi ? "किसान" : "Farmer"}
            </span>

            <code>
              ramesh / ramesh123
            </code>
          </div>

          <div className="demo-account">
            <span>
              🛒 {isHindi ? "उपभोक्ता" : "Consumer"}
            </span>

            <code>
              consumer / consumer123
            </code>
          </div>

        </div>

      </div>
    </div>
  );
}

export default Login;