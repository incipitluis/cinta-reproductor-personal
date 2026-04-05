'use client';

import { useState } from 'react';
import { PlayerProvider } from '@/components/PlayerContext';
import Sidebar from '@/components/Sidebar';
import PlayerBar from '@/components/PlayerBar';
import PlaylistView from '@/components/views/PlaylistView';
import LibraryView from '@/components/views/LibraryView';
import SearchView from '@/components/views/SearchView';
import UploadView from '@/components/views/UploadView';

type View = 'playlist' | 'library' | 'search' | 'upload';

export default function MainPanel() {
    const [view, setView] = useState<View>('playlist');
    const [activePl, setActivePl] = useState<string | null>(null);

    const handlePlaylist = (id: string) => {
        setActivePl(id);
        setView('playlist');
    };

    return (
        <PlayerProvider>
            <div
                style={{
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    background: '#0f1014',
                    color: '#e8e4df',
                }}
            >
                {/* Main area: sidebar + content */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    <Sidebar
                        view={view}
                        activePl={activePl}
                        onNav={(v) => setView(v)}
                        onPlaylist={handlePlaylist}
                    />

                    <main style={{ flex: 1, overflow: 'auto' }}>
                        {view === 'playlist' && <PlaylistView playlistId={activePl} />}
                        {view === 'library' && <LibraryView />}
                        {view === 'search' && <SearchView />}
                        {view === 'upload' && <UploadView />}
                    </main>
                </div>

                {/* Persistent player bar */}
                <PlayerBar />
            </div>
        </PlayerProvider>
    );
}
