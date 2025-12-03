'use client';

import React, { useEffect, useState } from 'react';
import { IChangelog, CheckNewChangelogResponse } from '@/types';
import { changelogsAPI } from '@/lib/api';
import { UpdateNotificationModal } from './UpdateNotificationModal';
import { useAuth } from '@/contexts/AuthContext';

export const UpdateNotifier: React.FC = () => {
  const { user } = useAuth();
  const [newChangelog, setNewChangelog] = useState<IChangelog | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  // Check for new updates on mount and periodically
  useEffect(() => {
    if (!user) return;

    const checkForNewUpdate = async () => {
      try {
        const response = await changelogsAPI.checkForNew();
        const data: CheckNewChangelogResponse = response.data;

        if (data.hasNew && data.changelog) {
          setNewChangelog(data.changelog);
        }
      } catch (error) {
        console.error('Error checking for new updates:', error);
      } finally {
        setHasChecked(true);
      }
    };

    // Check immediately
    checkForNewUpdate();

    // Poll every 5 minutes (less frequent than achievements since updates are less common)
    const interval = setInterval(checkForNewUpdate, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const handleClose = () => {
    setNewChangelog(null);
  };

  // Don't render anything until we've checked and there's a new changelog
  if (!hasChecked || !newChangelog) return null;

  return (
    <UpdateNotificationModal
      changelog={newChangelog}
      onClose={handleClose}
    />
  );
};
