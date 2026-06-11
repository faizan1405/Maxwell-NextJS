'use client';

import React, { useState } from 'react';
import { useAuth } from './AdminProvider';
import { Alert, Spinner } from '../ui';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) {
      return setError('Please enter your username and password.');
    }
    setLoading(true);
    setError('');
    const res = await login(username, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
    }
  }

  return (
    <div className="admin-auth-page">
      <div className="admin-auth-bg">
        <div className="bg-glow bg-glow-top" />
        <div className="bg-glow bg-glow-bottom" />
      </div>

      <div className="admin-auth-container animate-fadein">
        <div className="admin-auth-header">
          <div className="admin-auth-logo-wrapper">
            <img
              src="/assets/amahle-blue-logo.jpg"
              alt="Amahle Blue"
              className="admin-auth-logo"
            />
          </div>
          <h1 className="admin-auth-title">Admin Panel</h1>
          <p className="admin-auth-subtitle">Sign in to manage your store</p>
        </div>

        <div className="admin-auth-card">
          <form onSubmit={handleSubmit} className="admin-auth-form">
            {error && (
              <Alert type="error" message={error} onClose={() => setError('')} />
            )}

            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => {
                  setUsername(e.target.value);
                  setError('');
                }}
                autoComplete="username"
                placeholder="Enter your username"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="form-control"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="password-toggle-btn"
                >
                  {showPw ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="admin-auth-submit-btn"
            >
              {loading ? (
                <>
                  <Spinner size={16} /> Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="admin-auth-footer-text">
            Contact the store owner if you need credentials.
          </p>
        </div>

        <p className="admin-auth-copyright">
          Protected admin area · Amahle Blue © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
