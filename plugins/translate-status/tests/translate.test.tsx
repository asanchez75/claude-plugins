import { expect, test } from 'claude-code/testing'

import { isTranslatable, shortLabel, unwrap } from '../hooks/register'

test('unwrap strips one echoed container tag', async () => {
  expect(unwrap('<texte>\nBonjour\n</texte>')).toBe('Bonjour')
  expect(unwrap('  Bonjour  ')).toBe('Bonjour')
  expect(unwrap('<a>x</b>')).toBe('<a>x</b>')
})

test('slash commands and bang escapes are not translated', async () => {
  expect(isTranslatable('/translate off')).toBe(false)
  expect(isTranslatable('!ls')).toBe(false)
  expect(isTranslatable('   ')).toBe(false)
  expect(isTranslatable('fix the bug')).toBe(true)
})

test('shortLabel collapses whitespace and cuts at 40', async () => {
  expect(shortLabel('a\n\n b')).toBe('a b')
  expect(shortLabel('x'.repeat(50)).length).toBe(40)
})

test('a prompt goes through unchanged and its translation lands in state', async ($, on) => {
  const writes: Array<{ key: string; value: unknown }> = []
  let sentPrompt = ''
  let seen = ''
  on('state.set', (_, e) => {
    writes.push({ key: e.key, value: e.value })
    return { value: { isSet: true, version: 1 } }
  })
  on('model.complete', (_, e) => {
    sentPrompt = e.prompt
    return { value: { isAnswered: true, text: '<texte>Corrige le bogue</texte>', usage: {} } }
  })
  on('clock.after', () => ({ value: undefined }))
  on('prompt.submit', (_, e) => {
    seen = e.text
    return e
  })

  await $.prompt.submit({ text: 'fix the bug' })
  await new Promise(r => setTimeout(r, 50))

  expect(seen).toBe('fix the bug')
  expect(sentPrompt).toBe('<texte>\nfix the bug\n</texte>')
  const shown = writes.filter(w => w.key === 'shown').at(-1)
  expect(shown?.value).toEqual({ source: 'fix the bug', french: 'Corrige le bogue' })
})
