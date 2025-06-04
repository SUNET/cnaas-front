import React from "react";
import { BrowserRouter } from "react-router-dom";
import AuthContextProvider from "./contexts/AuthContext";
import { Footer } from "./components/Footer";
import Header from "./components/Header/Header";
import Panel from "./components/Panel";

function App() {
  return (
    <div className="container">
      <AuthContextProvider>
        <BrowserRouter>
          <Header />
          <Panel />
        </BrowserRouter>
      </AuthContextProvider>
      <Footer />
    </div>
  );
}

export default App;
