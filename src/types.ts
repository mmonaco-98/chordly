export interface Song {
  id: string
  title: string
  artist: string
  key: string
  bpm?: number
  content: string
  tags?: string[]
}

export interface Playlist {
  id: string
  name: string
  songIds: string[]
}
