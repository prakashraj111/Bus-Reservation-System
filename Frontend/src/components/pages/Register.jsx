import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../css/auth.css";
import api from "../../services/api";
import { setAuth } from "../../utils/auth";
import { sanitizeText, validateRegisterForm } from "../../utils/validation";

function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    const validationMessage = validateRegisterForm({ username, email, password });
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/api/auth/register", {
        username: sanitizeText(username),
        email: sanitizeText(email).toLowerCase(),
        password
      });
      const token = response?.data?.token;
      const user = response?.data?.data;
      if (token) {
        setAuth(token, user);
        navigate("/my-profile");
      } else {
        setError("Registration failed. Please try again.");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Register</h2>
        <input
          placeholder="Full name"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          maxLength={60}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={100}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={6}
          maxLength={128}
          required
        />
        {error ? <p className="err-msg">{error}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Account"}
        </button>
        <p>
          Already registered? <Link to="/login">Login</Link>
        </p>
      </form>
    </section>
  );
}

export default Register;
