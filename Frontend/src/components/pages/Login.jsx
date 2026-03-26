import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../css/auth.css";
import api from "../../services/api";
import { setAuth } from "../../utils/auth";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/api/auth/login", {
        email: email.trim(),
        password
      });
      const token = response?.data?.token;
      const user = response?.data?.data;
      if (token) {
        setAuth(token, user);
        navigate(location.state?.from || "/my-profile", {
          replace: true,
          state: location.state?.trip ? { trip: location.state.trip } : null
        });
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error ? <p className="err-msg">{error}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
        <p>
          New user? <Link to="/register">Create account</Link>
        </p>
      </form>
    </section>
  );
}

export default Login;
