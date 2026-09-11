import { createContext, useContext, useEffect, useState } from "react";

const LanguageContext = createContext();

const translations = {
  en: {
    dashboard: "Dashboard",
    farmers: "Farmers",
    crops: "Crops",
    centers: "Centers",
    procurements: "Procurements",
    supplyChain: "Supply Chain",
    consumerOrders: "Consumer Orders",
    liveQueue: "Live Queue",
    liveMap: "Live Map",
    payments: "Payments",

    agriculturalProcurement:
      "Agricultural Procurement Platform",

    sihProject: "SIH 2026 Project",
    gniot: "GNIOT",

    admin: "Admin",
    farmer: "Farmer",
    consumer: "Consumer",

    english: "English",
    hindi: "हिन्दी",

    logout: "Logout",
    language: "Language",

    welcome: "Welcome",
    search: "Search",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    edit: "Edit",
    delete: "Delete",
    add: "Add",
    submit: "Submit",
    refresh: "Refresh",
    status: "Status",
    date: "Date",
    quantity: "Quantity",
    price: "Price",
    total: "Total",
    actions: "Actions",
  },

  hi: {
    dashboard: "डैशबोर्ड",
    farmers: "किसान",
    crops: "फसलें",
    centers: "खरीद केंद्र",
    procurements: "खरीद",
    supplyChain: "सप्लाई चेन",
    consumerOrders: "उपभोक्ता ऑर्डर",
    liveQueue: "लाइव कतार",
    liveMap: "लाइव मैप",
    payments: "भुगतान",

    agriculturalProcurement:
      "कृषि खरीद प्रबंधन प्लेटफ़ॉर्म",

    sihProject: "SIH 2026 प्रोजेक्ट",
    gniot: "GNIOT",

    admin: "एडमिन",
    farmer: "किसान",
    consumer: "उपभोक्ता",

    english: "English",
    hindi: "हिन्दी",

    logout: "लॉग आउट",
    language: "भाषा",

    welcome: "स्वागत है",
    search: "खोजें",
    save: "सहेजें",
    cancel: "रद्द करें",
    close: "बंद करें",
    edit: "संपादित करें",
    delete: "हटाएं",
    add: "जोड़ें",
    submit: "जमा करें",
    refresh: "रिफ्रेश",
    status: "स्थिति",
    date: "दिनांक",
    quantity: "मात्रा",
    price: "कीमत",
    total: "कुल",
    actions: "कार्य",
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("cropp_language") || "en";
  });

  useEffect(() => {
    localStorage.setItem("cropp_language", language);
    document.documentElement.lang = language === "hi" ? "hi" : "en";
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((current) => (current === "en" ? "hi" : "en"));
  };

  const t = (key) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}