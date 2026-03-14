import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Box, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import ParticleWarehouse from '../../components/three/ParticleWarehouse';
import { useAuthStore } from '../../store/authStore';
import { getErrorMessage } from '../../utils/errors';

export default function LoginPage() {
  const [email, setEmail] = useState('manager@coreinventory.com');
  const [password, setPassword] = useState('manager123');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await client.post('/auth/login', { email, password });
      login(data.accessToken, data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate('/dashboard');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Login failed'));
    } finally {
      setLoading(false);
    }
  }

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
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 80% 50%, rgba(6,182,212,0.1) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, rotateY: -15, scale: 0.9 }}
        animate={{ opacity: 1, rotateY: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 440, padding: '0 24px' }}
      >
        <div
          style={{
            background: 'rgba(10,14,26,0.85)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 24,
            padding: 40,
            boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(99,102,241,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'var(--grad-violet)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-glow-violet)',
              }}
            >
              <Box size={24} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontFamily: 'Space Grotesk', fontWeight: 700, color: 'var(--txt-primary)' }}>
                Core<span style={{ color: 'var(--clr-violet)' }}>Inventory</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--txt-muted)', letterSpacing: '0.1em' }}>
                INVENTORY MANAGEMENT 2026
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: '1.5rem', fontFamily: 'Space Grotesk', marginBottom: 6 }}>Welcome back</h2>
          <p style={{ color: 'var(--txt-secondary)', fontSize: '0.9rem', marginBottom: 28 }}>
            Sign in to your workspace
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Email</label>
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
                  placeholder="you@coreinventory.com"
                  style={{ paddingLeft: 42 }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
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
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="********"
                  style={{ paddingLeft: 42, paddingRight: 42 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((value) => !value)}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--txt-muted)',
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Link
                to="/reset-password"
                style={{ fontSize: '0.8rem', color: 'var(--clr-violet)', textDecoration: 'none' }}
              >
                Forgot password?
              </Link>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ marginTop: 8, justifyContent: 'center', width: '100%' }}
            >
              {loading ? 'Signing in...' : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </form>

          <div
            style={{
              marginTop: 24,
              padding: 14,
              borderRadius: 10,
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.15)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--clr-violet-hover)', fontWeight: 600, marginBottom: 8 }}>
              Demo Credentials
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--txt-secondary)', lineHeight: 1.8 }}>
              <b style={{ color: 'var(--txt-primary)' }}>Manager:</b> manager@coreinventory.com / manager123
              <br />
              <b style={{ color: 'var(--txt-primary)' }}>Staff:</b> staff@coreinventory.com / staff123
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

