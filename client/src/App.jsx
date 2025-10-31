// client/src/App.jsx

import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ChatApp from "./components/ChatApp";
import Login from "./components/Login";
import Register from "./components/Register";
import "./index.css";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  return (
    <div id="app">
      <Routes>
        {/* Default route → Login */}
        <Route
          path="/"
          element={<Login setLoggedIn={setLoggedIn} />}
        />

        {/* Register route */}
        <Route
          path="/register"
          element={<Register />}
        />

        {/* Chat route (protected) */}
        <Route
          path="/chat"
          element={
            loggedIn ? <ChatApp /> : <Navigate to="/" replace />
          }
        />
      </Routes>
    </div>
  );
}

export default App;
