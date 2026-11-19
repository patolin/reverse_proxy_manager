import { useCallback, useEffect, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import { ApiError, apiRequest, getCurrentUser } from "./api.js";
import LoginView from "./features/auth/LoginView.jsx";
import SitesDashboard from "./features/sites/SitesDashboard.jsx";
import { messages } from "./messages.js";

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setCheckingAuth(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleRequestError = useCallback((requestError) => {
    if (requestError instanceof ApiError && requestError.status === 401) {
      setUser(null);
      setError(messages.sessionExpired);
      return;
    }
    setError(requestError.message);
  }, []);

  async function login(username, password) {
    setError("");
    try {
      const result = await apiRequest("/api/auth/login", {
        method: "POST",
        body: { username, password },
      });
      setUser(result.user);
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    }
  }

  async function logout() {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
      setUser(null);
      setError("");
    } catch (requestError) {
      handleRequestError(requestError);
    }
  }

  if (checkingAuth) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress aria-label={messages.checkingSession} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {user ? (
        <SitesDashboard
          username={user.username}
          error={error}
          onSignOut={logout}
          onClearError={() => setError("")}
          onRequestError={handleRequestError}
        />
      ) : (
        <LoginView error={error} onSubmit={login} />
      )}
    </Box>
  );
}
