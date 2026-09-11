import { Languages, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "./LanguageContext";

function Header() {
  const navigate = useNavigate();
  const { language, toggleLanguage, t } = useLanguage();

  let user = null;

  try {
    user = JSON.parse(
      localStorage.getItem("cropp_user")
    );
  } catch {
    user = null;
  }

  const handleLogout = () => {
    localStorage.removeItem("cropp_user");
    navigate("/login", { replace: true });
  };

  return (
    <header className="header">

      <div className="header-left">
        <div>
          <h1>
            CROPP
          </h1>

          <p>
            {t("agriculturalProcurement")}
          </p>
        </div>
      </div>

      <div className="header-right">

        {/* Language Toggle */}
        <button
          type="button"
          className="language-toggle"
          onClick={toggleLanguage}
          title={t("language")}
        >
          <Languages size={18} />

          <span>
            {language === "en"
              ? "हिन्दी"
              : "English"}
          </span>
        </button>

        {/* User */}
        {user && (
          <div className="header-user">
            <div className="header-user-info">
              <strong>
                {user.username}
              </strong>

              <span>
                {user.role === "ADMIN"
                  ? t("admin")
                  : user.role === "FARMER"
                  ? t("farmer")
                  : t("consumer")}
              </span>
            </div>

            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
              title={t("logout")}
            >
              <LogOut size={18} />
              <span>
                {t("logout")}
              </span>
            </button>
          </div>
        )}

      </div>

    </header>
  );
}

export default Header;