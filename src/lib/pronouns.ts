import type { Pronouns, PronounPreset, Student, PickCode } from '../types'
import { uid } from './util'

export const PRONOUN_PRESETS: Record<Exclude<PronounPreset, 'custom'>, Omit<Pronouns, 'preset'>> = {
  she: { subject: 'she', object: 'her', possessive: 'her' },
  he: { subject: 'he', object: 'him', possessive: 'his' },
  they: { subject: 'they', object: 'them', possessive: 'their' },
}

export function isPresetKey(v: string): v is Exclude<PronounPreset, 'custom'> {
  return v === 'she' || v === 'he' || v === 'they'
}

export function makeStudent(
  name: string,
  preset: string,
  ratings: Record<string, PickCode[]> = {},
): Student {
  const key = isPresetKey(preset) ? preset : 'they'
  return {
    id: uid(),
    name,
    pronouns: { preset: key, ...PRONOUN_PRESETS[key] },
    ratings,
    note: '',
  }
}

/** Map a free-form pronoun string ("she/her", "He", "they/them"…) to a preset. */
export function presetFromText(text: string): Exclude<PronounPreset, 'custom'> {
  const p = text.trim().toLowerCase()
  if (/^(she|her)/.test(p)) return 'she'
  if (/^(he|him|his)/.test(p)) return 'he'
  return 'they'
}
