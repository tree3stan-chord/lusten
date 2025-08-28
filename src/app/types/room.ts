export interface Room {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  currentTrack?: {
    name: string;
    artist: string;
    album?: string;
    duration?: number;
    position?: number;
  };
  listeners: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  isLoggedIn: boolean;
  spotifyConnected?: boolean;
}