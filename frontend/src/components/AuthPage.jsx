import React, { useState } from "react";
import { login, register } from "../api";

export default function AuthPage({ onAuth, onClose }) {
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data =
        tab === "login"
          ? await login(email, password)
          : await register(email, password);
      onAuth({ user_id: data.user_id, email: data.email, is_admin: data.is_admin });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: onClose ? "100%" : "100vh",
        background: onClose ? "transparent" : "#f0f2f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "40px 36px",
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
          position: "relative",
        }}
      >
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: "transparent",
              border: "none",
              fontSize: 20,
              color: "#64748b",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "#1a1a2e",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Tech Feed
        </h1>
        <p style={{ fontSize: 14, color: "#64748b", textAlign: "center", marginBottom: 28 }}>
          AI が選ぶ技術まとめ
        </p>

        {/* タブ */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28 }}>
          {[
            { key: "login", label: "ログイン" },
            { key: "register", label: "新規登録" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setError(null); }}
              style={{
                flex: 1,
                background: tab === key ? "#3ea8ff" : "transparent",
                color: tab === key ? "#fff" : "#94a3b8",
                border: tab === key ? "none" : "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "8px 0",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: tab === key ? 700 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="8文字以上"
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: "#dc2626", fontWeight: 600, margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? "#94a3b8" : "#3ea8ff",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "12px 0",
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: 4,
            }}
          >
            {loading ? "処理中..." : tab === "login" ? "ログイン" : "アカウント作成"}
          </button>
        </form>
      </div>
    </div>
  );
}
