import { expect, test } from 'claude-code/testing'

test('#tldr autocompletes to its content', async ($, on) => {
  on('prompt.autocomplete', () => ({ suggestions: [] }))
  const r = await $.prompt.autocomplete({ text: 'hi #tl', cursor: 6, token: '#tl', start: 3 })
  const row = r.suggestions.find((s) => s.label === '#tldr')
  expect(row?.text).toBe('provide a TL;DR summary of your answer in plain text.')
})

test('non-# token gets no rows', async ($, on) => {
  on('prompt.autocomplete', () => ({ suggestions: [] }))
  const r = await $.prompt.autocomplete({ text: 'hi tl', cursor: 5, token: 'tl', start: 3 })
  expect(r.suggestions.length).toBe(0)
})

test('submit expands remaining #tags and keeps unknown ones', async ($, on) => {
  let seen = ''
  on('prompt.submit', ($, e) => { seen = e.text; return e })
  await $.prompt.submit({ text: 'fix it #tldr #nope' })
  expect(seen).toBe('fix it provide a TL;DR summary of your answer in plain text. #nope')
})
