import React, { useState } from 'react';
import { SyncCoordinator } from '../lib/audioSync/syncCoordinator';
import styles from './SyncButton.module.css';

interface SyncButtonProps {
    isHost?: boolean;
    clientNumber?: number;
}

export const SyncButton: React.FC<SyncButtonProps> = ({ isHost = false, clientNumber = 1 }) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [coordinator] = useState(() => new SyncCoordinator());

    const handleSync = async () => {
        try {
            setIsSyncing(true);
            
            if (isHost) {
                await coordinator.initializeAsHost();
            } else {
                await coordinator.initializeAsGuest(clientNumber);
            }
            
            await coordinator.startSyncProcess();
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleStop = () => {
        coordinator.stopSync();
        setIsSyncing(false);
    };

    return (
        <button 
            className={`${styles.syncButton} ${isSyncing ? styles.syncing : ''}`}
            onClick={isSyncing ? handleStop : handleSync}
            disabled={isSyncing && !isHost} // Only host can stop sync
        >
            {isSyncing ? 'Stop Sync' : 'Start Sync'}
        </button>
    );
};
