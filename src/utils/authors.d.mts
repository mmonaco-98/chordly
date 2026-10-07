export interface Aliases {
  overrides: Record<string, string[]>
  names: Record<string, string>
}
export type Canon = Map<string, string>

export const EMPTY_ALIASES: Aliases

export function compareKey(name: string): string
export function splitAuthors(raw: string | null | undefined, aliases?: Aliases): string[]
export function makeCanon(names: Iterable<string>, aliases?: Aliases): Canon
export function applyCanon(authors: readonly string[], canon: Canon): string[]
export function joinAuthors(authors: readonly string[]): string
export function resolveAuthors(
  authors: readonly string[] | null | undefined,
  artist: string | null | undefined,
): string[]
export function parseAuthorsInput(text: string | null | undefined, canon: Canon): string[]
export function parseAuthorsColumn(value: string | null | undefined): string[]
export function normalizeList(names: readonly string[], aliases?: Aliases): string[]
export function splitWarnings(raw: string | null | undefined, aliases?: Aliases): string[]
export function hyphenAmbiguities(raw: string | null | undefined, aliases?: Aliases): string[]
