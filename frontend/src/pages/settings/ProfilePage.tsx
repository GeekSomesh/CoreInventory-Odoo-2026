import { useEffect, useState } from 'react';
import { KeyRound, Save, UserCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import { useAuthStore } from '../../store/authStore';
import type { User } from '../../types/api';
import { formatDateTime } from '../../utils/format';
import { getErrorMessage } from '../../utils/errors';

export default function ProfilePage() {
  const authUser = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  const [profile, setProfile] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  async function loadProfile() {
    try {
      const response = await client.get<User>('/auth/me');
      setProfile(response.data);
      setName(response.data.name ?? '');
      setAvatar(response.data.avatar ?? '');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load profile'));
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const response = await client.put<User>('/auth/profile', { name, avatar });
      setProfile(response.data);
      updateUser({ name: response.data.name, avatar: response.data.avatar ?? undefined });
      toast.success('Profile updated');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update profile'));
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Enter current and new password');
      return;
    }
    setSavingPassword(true);
    try {
      await client.put('/auth/password', { currentPassword, newPassword });
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to change password'));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="My Profile"
        subtitle="Manage profile details, avatar, and account password."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14 }}>
        <section className="section-card">
          <div className="section-card-header">
            <h3>Profile Details</h3>
          </div>
          <form onSubmit={saveProfile} style={{ padding: 16, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'var(--grad-violet)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {avatar ? (
                  <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <UserCircle2 size={32} color="white" />
                )}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{authUser?.name ?? profile?.name ?? '-'}</div>
                <div style={{ color: 'var(--txt-muted)', fontSize: '0.8rem' }}>
                  {authUser?.email ?? profile?.email ?? '-'}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input className="form-input" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Avatar URL</label>
              <input
                className="form-input"
                value={avatar}
                onChange={(event) => setAvatar(event.target.value)}
                placeholder="https://..."
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={savingProfile} style={{ justifyContent: 'center' }}>
              <Save size={16} />
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </section>

        <section className="section-card">
          <div className="section-card-header">
            <h3>Security</h3>
          </div>
          <form onSubmit={changePassword} style={{ padding: 16, display: 'grid', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                className="form-input"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                className="form-input"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={6}
                required
              />
            </div>
            <button className="btn btn-secondary" type="submit" disabled={savingPassword} style={{ justifyContent: 'center' }}>
              <KeyRound size={16} />
              {savingPassword ? 'Updating...' : 'Change Password'}
            </button>
            <div style={{ fontSize: '0.8rem', color: 'var(--txt-muted)' }}>
              Last profile load: {formatDateTime(profile?.created_at)}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

