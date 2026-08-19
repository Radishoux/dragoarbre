/**
 * Full display names.
 *
 * Small, but it encodes a rule that is easy to get backwards: French puts the
 * species word first ("Dragodinde Amande"), English puts it last ("Almond
 * Dragoturkey"). The species word is a parameter rather than a lookup, which
 * is what lets the same function serve all three species.
 */

import { describe, expect, test } from 'bun:test'
import { getColorById } from '../data'
import { composeFullName } from './names'

const almond = getColorById('almond') as never
const almondGinger = getColorById('almond-ginger') as never

describe('composeFullName', () => {
  test('French leads with the species word', () => {
    expect(composeFullName(almond, 'fr', 'Dragodinde')).toBe('Dragodinde Amande')
  })

  test('English trails with it', () => {
    expect(composeFullName(almond, 'en', 'Dragoturkey')).toBe('Almond Dragoturkey')
  })

  test('the other language never leaks into the result', () => {
    expect(composeFullName(almondGinger, 'fr', 'Dragodinde')).toBe('Dragodinde Amande et Rousse')
    expect(composeFullName(almondGinger, 'en', 'Dragoturkey')).toBe('Almond and Ginger Dragoturkey')
  })

  test('the species word is whatever it is given, so all three species work', () => {
    // This is what phase 3 fixed: the word used to be hardcoded to Dragoturkey,
    // which titled every Seemyool and Rhineetle wrongly.
    const seemyoolCrimson = getColorById('seemyool-crimson') as never
    expect(composeFullName(seemyoolCrimson, 'fr', 'Muldo')).toBe('Muldo Pourpre')
    expect(composeFullName(seemyoolCrimson, 'en', 'Seemyool')).toBe('Crimson Seemyool')
  })
})
