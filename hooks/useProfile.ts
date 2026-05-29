import { useState } from 'react';
import { useAuth } from './useAuth.ts';
import { profileService } from '../services/profileService.ts';

export const useProfile = () => {
  const { user, profile, isGuest } = useAuth();
  const [updating, setUpdating] = useState(false);

  const editProfileFields = async (fields: { name?: string; aboutMe?: string; country?: string }) => {
    if (isGuest || !user) return;
    setUpdating(true);
    try {
      await profileService.updateProfileFields(user.uid, fields);
    } finally {
      setUpdating(false);
    }
  };

  const uploadPhoto = async (fileOrBlob: File | Blob) => {
    if (isGuest || !user) return;
    setUpdating(true);
    try {
      return await profileService.uploadAvatar(user.uid, fileOrBlob);
    } finally {
      setUpdating(false);
    }
  };

  const removePhoto = async () => {
    if (isGuest || !user || !profile) return;
    setUpdating(true);
    try {
      return await profileService.removeAvatar(user.uid, profile.name);
    } finally {
      setUpdating(false);
    }
  };

  const triggerStreakUpdate = async () => {
    if (isGuest || !user) return;
    try {
      await profileService.updateStreakMetrics(user.uid);
    } catch (err) {
      console.warn('Streak update skipped:', err);
    }
  };

  return {
    profile,
    isGuest,
    updating,
    editProfileFields,
    uploadPhoto,
    removePhoto,
    triggerStreakUpdate
  };
};
export default useProfile;
