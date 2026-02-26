import type { Song } from "../types";
import nelBlu from "./nel-blu.json";
import azzurro from "./azzurro.json";
import azzurro2 from "./azzurro2.json";
import grandeGrande from "./grande-grande.json";
import romagnaMia from "./romagna-mia.json";

type RawSong = Omit<Song, "content"> & { content: string | string[] };

function normalize(raw: RawSong): Song {
  return {
    ...raw,
    content: Array.isArray(raw.content) ? raw.content.join("\n") : raw.content,
  };
}

const songs: Song[] = [
  normalize(nelBlu as RawSong),
  normalize(azzurro as RawSong),
  normalize(grandeGrande as RawSong),
  normalize(romagnaMia as RawSong),
  normalize(azzurro2 as RawSong),
];

export default songs;
