import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { Song } from "../types";

interface Props {
  song: Song;
  navState?: unknown;
}

export function SongCard({ song, navState }: Props) {
  const navigate = useNavigate();

  return (
    <button className="song-card" onClick={() => navigate(`/song/${song.id}`, { state: navState })}>
      <div className="song-card__text">
        <span className="song-card__title">{song.title}</span>
        <span className="song-card__artist">{song.artist}</span>
      </div>
      <ChevronRight size={16} className="song-card__chevron" />
    </button>
  );
}
