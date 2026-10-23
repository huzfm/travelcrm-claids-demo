'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/providers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PhoneInput, formatE164ForDisplay } from '@/components/ui/phone-input';
import { toast } from 'sonner';
import {
  User,
  Building2,
  Mail,
  Shield,
  Loader2,
  Eye,
  EyeOff,
  Edit2,
  Save,
  X,
  Phone,
} from 'lucide-react';
import api from '@/lib/axios';
import { setCurrentUser } from '@/lib/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarUpload } from '@/components/users/avatar-upload';
import { roleLabel } from '@/lib/permissions';

export default function ProfilePage() {
  const { user, setUser } = useAuthContext();
  const router = useRouter();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [profileData, setProfileData] = useState<{
    name: string;
    email: string;
    phone: string;
    avatarUrl: string | null;
  }>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatarUrl: user?.avatarUrl ?? null,
  });

  // Fetch fresh user data (includes phone) from backend
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.data.success && res.data.data) {
          const freshUser = res.data.data;
          setProfileData({
            name: freshUser.name || '',
            email: freshUser.email || '',
            phone: freshUser.phone || '',
            avatarUrl: freshUser.avatarUrl ?? null,
          });
        }
      } catch {
        // Silently fail - use session data
      }
    };
    fetchMe();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { changePassword, clearAuth } = await import('@/lib/auth');
      const response = await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      toast.success(
        response.data.data?.message || 'Password changed successfully. Please login again.'
      );
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });

      // Clear auth and redirect to login
      clearAuth();
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || 'Failed to change password';
      toast.error(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!profileData.email.trim()) {
      toast.error('Email is required');
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.patch('/auth/profile', {
        name: profileData.name.trim(),
        email: profileData.email.trim(),
        phone: profileData.phone?.trim() || undefined,
        // Null is meaningful — it clears the photo — so it is always sent.
        avatarUrl: profileData.avatarUrl,
      });

      if (response.data.success) {
        const updatedUser = response.data.data;
        setCurrentUser(updatedUser);
        setUser(updatedUser);
        // View-mode reads `profileData`; sync it now so the new phone shows
        // before the mount-only /auth/me refetch lands.
        setProfileData({
          name: updatedUser.name || '',
          email: updatedUser.email || '',
          phone: updatedUser.phone || '',
          avatarUrl: updatedUser.avatarUrl ?? null,
        });
        toast.success('Profile updated successfully');
        setIsEditing(false);
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || 'Failed to update profile';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Your personal account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label>Profile Photo</Label>
                  <AvatarUpload
                    value={profileData.avatarUrl}
                    onChange={url => setProfileData(prev => ({ ...prev, avatarUrl: url }))}
                    name={profileData.name}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={profileData.name}
                    onChange={e => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email Address</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={profileData.email}
                    onChange={e => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone Number</Label>
                  <PhoneInput
                    id="edit-phone"
                    value={profileData.phone}
                    onChange={v => setProfileData(prev => ({ ...prev, phone: v }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} disabled={isSaving} className="flex-1">
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                </div>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    {profileData.avatarUrl && <AvatarImage src={profileData.avatarUrl} alt="" />}
                    <AvatarFallback className="text-base">
                      {(user?.name || '?')
                        .trim()
                        .split(/\s+/)
                        .map(part => part[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user?.name || '-'}</p>
                    <p className="text-xs text-muted-foreground">{roleLabel(user?.role)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Full Name</Label>
                  <p className="font-medium">{user?.name || '-'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <p className="font-medium">{user?.email || '-'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <p className="font-medium">
                    {profileData.phone ? formatE164ForDisplay(profileData.phone) : '-'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Role
                  </Label>
                  <p className="font-medium capitalize">{user?.role || '-'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Branch
                  </Label>
                  <p className="font-medium">
                    {user?.branch?.name || '-'}
                    {user?.branch?.country && ` (${user.branch.country})`}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={e =>
                      setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))
                    }
                    placeholder="Enter current password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={e =>
                      setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))
                    }
                    placeholder="Enter new password (min 6 characters)"
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={e =>
                    setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isChangingPassword}>
                {isChangingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
