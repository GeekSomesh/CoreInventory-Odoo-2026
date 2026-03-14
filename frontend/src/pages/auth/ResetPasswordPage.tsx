import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Box, Check, Lock, Mail, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import ParticleWarehouse from '../../components/three/ParticleWarehouse';
import { getErrorMessage } from '../../utils/errors';

const steps = ['Email', 'Verify OTP', 'New Password'];

export default function ResetPasswordPage() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submitEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await client.post('/auth/otp/request', { email });
      toast.success('OTP sent. Check backend console for demo code.');
      setStep(1);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to request OTP'));
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await client.post('/auth/otp/verify', { email, otp });
      setResetToken(data.resetToken);
      setStep(2);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Invalid OTP'));
    } finally {
      setLoading(false);
    }
  };

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await client.post('/auth/otp/reset', { resetToken, newPassword });
      toast.success('Password reset successfully');
      navigate('/login');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to reset password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: 'var(--grad-hero)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <ParticleWarehouse />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 440, padding: '0 24px' }}
      >
        <div
          style={{
            background: 'rgba(10,14,26,0.85)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 24,
            padding: 40,
            boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--grad-violet)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box size={20} color="white" />
            </div>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: '1.1rem', fontWeight: 700 }}>
              Core<span style={{ color: 'var(--clr-violet)' }}>Inventory</span>
            </div>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontFamily: 'Space Grotesk', marginBottom: 6 }}>Reset Password</h2>
          <p style={{ color: 'var(--txt-secondary)', fontSize: '0.875rem', marginBottom: 28 }}>
            Step {step + 1} of 3
          </p>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32, gap: 0 }}>
            {steps.map((label, index) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: index < step ? 'var(--clr-success)' : index === step ? 'var(--grad-violet)' : 'var(--glass-bg)',
                      border: index === step ? 'none' : '1px solid var(--glass-border)',
                      color: index <= step ? 'white' : 'var(--txt-muted)',
                      boxShadow: index === step ? '0 0 15px rgba(99,102,241,0.4)' : undefined,
                    }}
                  >
                    {index < step ? <Check size={12} /> : index + 1}
                  </div>
                  <span style={{ fontSize: '0.65rem', color: index <= step ? 'var(--txt-primary)' : 'var(--txt-muted)' }}>
                    {label}
                  </span>
                </div>
                {index < steps.length - 1 ? (
                  <div style={{ flex: 1, height: 2, background: index < step ? 'var(--clr-success)' : 'var(--glass-border)', margin: '0 8px 20px' }} />
                ) : null}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 0 ? (
              <motion.form
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={submitEmail}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={16}
                      style={{
                        position: 'absolute',
                        left: 14,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--txt-muted)',
                      }}
                    />
                    <input
                      className="form-input"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@company.com"
                      style={{ paddingLeft: 42 }}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent: 'center' }}>
                  {loading ? 'Sending...' : (
                    <>
                      <span>Send OTP</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </motion.form>
            ) : null}

            {step === 1 ? (
              <motion.form
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={submitOtp}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <div className="form-group">
                  <label className="form-label">6 Digit OTP</label>
                  <div style={{ position: 'relative' }}>
                    <Shield
                      size={16}
                      style={{
                        position: 'absolute',
                        left: 14,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--txt-muted)',
                      }}
                    />
                    <input
                      className="form-input"
                      type="text"
                      value={otp}
                      onChange={(event) => setOtp(event.target.value)}
                      placeholder="Enter OTP from backend console"
                      style={{ paddingLeft: 42 }}
                      maxLength={6}
                      required
                    />
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--txt-muted)',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  Demo mode: OTP is printed in backend server console.
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent: 'center' }}>
                  {loading ? 'Verifying...' : (
                    <>
                      <span>Verify OTP</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </motion.form>
            ) : null}

            {step === 2 ? (
              <motion.form
                key="password"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={submitPassword}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={16}
                      style={{
                        position: 'absolute',
                        left: 14,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--txt-muted)',
                      }}
                    />
                    <input
                      className="form-input"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Minimum 6 characters"
                      style={{ paddingLeft: 42 }}
                      minLength={6}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent: 'center' }}>
                  {loading ? 'Resetting...' : (
                    <>
                      <span>Reset Password</span>
                      <Check size={16} />
                    </>
                  )}
                </button>
              </motion.form>
            ) : null}
          </AnimatePresence>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <Link to="/login" style={{ fontSize: '0.8rem', color: 'var(--clr-violet)', textDecoration: 'none' }}>
              Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

