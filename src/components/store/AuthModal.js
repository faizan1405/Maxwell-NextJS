'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCustomer } from '../../lib/storeContext';
import { User, X, ArrowLeft, RefreshCw } from '../ui/Icons';

function AuthSpinner() {
  return (
    <span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', flexShrink:0, display:'inline-block', animation:'spin .7s linear infinite' }} />
  );
}

export function AuthModal() {
  const { authOpen, closeAuth, login, apiBase } = useCustomer();
  const [step,        setStep]        = useState('email'); // 'email' | 'otp'
  const [email,       setEmail]       = useState('');
  const [otp,         setOtp]         = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [resendSecs,  setResendSecs]  = useState(0);
  const [isNew,       setIsNew]       = useState(false);
  const [devOtp,      setDevOtp]      = useState('');
  const otpFormRef = useRef(null);

  /* Reset on close */
  useEffect(() => {
    if (!authOpen) {
      const t = setTimeout(() => {
        setStep('email'); setEmail(''); setOtp('');
        setError(''); setResendSecs(0); setDevOtp('');
      }, 300);
      return () => clearTimeout(t);
    }
  }, [authOpen]);

  /* Resend countdown */
  useEffect(() => {
    if (resendSecs <= 0) return;
    const t = setTimeout(() => setResendSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendSecs]);

  async function doSendOtp(e) {
    if (e) e.preventDefault();
    const trimEmail = email.trim().toLowerCase();
    if (!trimEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${apiBase}/api/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to send code. Try again.'); setLoading(false); return; }
      setIsNew(!!data.isNew);
      setStep('otp');
      setResendSecs(60);
      if (data.devOtp) { setOtp(data.devOtp); setDevOtp(data.devOtp); }
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  }

  async function doVerifyOtp(e) {
    if (e) e.preventDefault();
    const code = otp.trim();
    if (code.length !== 6) { setError('Please enter the 6-digit code.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${apiBase}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid code. Please try again.'); setOtp(''); setLoading(false); return; }
      login(data.customer);
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  }

  function handleOtpInput(e) {
    const v = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(v);
    setError('');
    if (v.length === 6) setTimeout(() => otpFormRef.current?.requestSubmit(), 80);
  }

  if (!authOpen) return null;

  return (
    <div className="auth-modal">
      <div onClick={closeAuth} className="auth-modal__backdrop" />
      <div className="auth-modal__content">

        {/* Header gradient */}
        <div className="auth-modal__header">
          <button onClick={closeAuth} className="auth-modal__close">
            <X size={18} />
          </button>
          <div className="auth-modal__brand">
            <span className="icon-wrap"><User size={16} /></span>
            <span className="name">Amahle Blue</span>
          </div>
          <h2 className="auth-modal__title">
            {step === 'email'
              ? (isNew ? 'Create account' : 'Welcome back')
              : 'Check your email'}
          </h2>
          <p className="auth-modal__sub">
            {step === 'email'
              ? 'Enter your email to receive a sign-in code — no password needed.'
              : `We sent a 6-digit code to ${email}`}
          </p>
        </div>

        {/* Body */}
        <div className="auth-modal__body">
          {step === 'email' ? (
            <form key="email" onSubmit={doSendOtp} className="auth-form">
              <div className="auth-form__field">
                <label className="auth-form__label">Email address</label>
                <input type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="your@email.com" autoFocus
                  className={`auth-form__input ${error ? 'auth-form__input--error' : ''}`}
                />
                {error && <p className="auth-form__error">{error}</p>}
              </div>
              <button type="submit" disabled={loading} className="auth-form__btn">
                {loading ? <><AuthSpinner /> Sending…</> : 'Send sign-in code →'}
              </button>
              <p className="auth-form__footer-text">
                New here? An account is created automatically on first sign-in.
              </p>
            </form>
          ) : (
            <form key="otp" ref={otpFormRef} onSubmit={doVerifyOtp} className="auth-form">
              {devOtp && (
                <div className="auth-form__dev-note">
                  Email delivery paused — domain not yet verified. Code pre-filled for testing.
                </div>
              )}
              <div className="auth-form__field">
                <label className="auth-form__label">6-digit code</label>
                <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                  value={otp} onChange={handleOtpInput} autoFocus
                  placeholder="000000"
                  className={`auth-form__input-otp ${error ? 'auth-form__input-otp--error' : ''}`}
                />
                {error && <p className="auth-form__error">{error}</p>}
              </div>
              <button type="submit" disabled={loading || otp.length !== 6} className="auth-form__btn">
                {loading ? <><AuthSpinner /> Verifying…</> : 'Verify & sign in →'}
              </button>
              <div className="auth-form__actions">
                <button type="button" onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                  className="auth-form__link">
                  <ArrowLeft size={14} /> Change email
                </button>
                {resendSecs > 0 ? (
                  <span className="auth-form__link" style={{ cursor: 'default' }}>Resend in {resendSecs}s</span>
                ) : (
                  <button type="button" onClick={doSendOtp} className="auth-form__link auth-form__link--primary">
                    <RefreshCw size={13} /> Resend code
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
