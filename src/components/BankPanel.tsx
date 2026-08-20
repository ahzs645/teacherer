import { useRef, useState } from 'react'
import type { Category, Klass, Level, PickCode } from '../types'
import { LEVELS } from '../types'
import { seedCategories } from '../seedData'
import { exportBankJson, exportBankXlsx, parseBankFile } from '../lib/exportImport'
import { parsePick, formatPick, poolFor } from '../lib/ratings'
import { uid } from '../lib/util'

interface Props {
  klass: Klass
  updateClass: (fn: (prev: Klass) => Klass) => void
}

/** How a pool edit moves existing choices: old phrasing index -> new index. */
type Remap = (variant: number) => number

function emptyCategory(): Category {
  return {
    id: uid(),
    name: 'New category',
    group: '',
    include: true,
    multi: false,
    levelLabels: null,
    levels: { '1': [''], '2': [''], '3': [''], '4': [''] },
  }
}

export default function BankPanel({ klass, updateClass }: Props) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const bankInput = useRef<HTMLInputElement>(null)
  const importMode = useRef<'replace' | 'add'>('add')

  const isOpen = (id: string) => openIds.has(id)
  const toggleOpen = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const patchCategory = (id: string, patch: (c: Category) => Category) => {
    updateClass((prev) => ({ ...prev, categories: prev.categories.map((c) => (c.id === id ? patch(c) : c)) }))
  }

  const moveCategory = (idx: number, delta: number) => {
    updateClass((prev) => {
      const to = idx + delta
      if (to < 0 || to >= prev.categories.length) return prev
      const categories = [...prev.categories]
      ;[categories[idx], categories[to]] = [categories[to], categories[idx]]
      return { ...prev, categories }
    })
  }

  const deleteCategory = (cat: Category) => {
    if (!confirm(`Delete “${cat.name}”? Student ratings for it will be removed too.`)) return
    updateClass((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== cat.id),
      students: prev.students.map((s) => {
        const ratings = { ...s.ratings }
        delete ratings[cat.id]
        return { ...s, ratings }
      }),
    }))
  }

  const duplicateCategory = (cat: Category, idx: number) => {
    const copy: Category = {
      ...cat,
      id: uid(),
      name: `${cat.name} (copy)`,
      levelLabels: cat.levelLabels ? { ...cat.levelLabels } : null,
      levels: { '1': [...cat.levels['1']], '2': [...cat.levels['2']], '3': [...cat.levels['3']], '4': [...cat.levels['4']] },
    }
    updateClass((prev) => {
      const categories = [...prev.categories]
      categories.splice(idx + 1, 0, copy)
      return { ...prev, categories }
    })
    setOpenIds((prev) => new Set(prev).add(copy.id))
  }

  const addCategory = () => {
    const cat = emptyCategory()
    updateClass((prev) => ({ ...prev, categories: [...prev.categories, cat] }))
    setOpenIds((prev) => new Set(prev).add(cat.id))
  }

  /**
   * Change one level's phrasing pool and carry every student's existing choice
   * across, so editing the bank never silently re-words a finished comment.
   */
  const mutatePool = (cat: Category, lvl: Level, nextPool: string[], remap: Remap) => {
    updateClass((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === cat.id ? { ...c, levels: { ...c.levels, [lvl]: nextPool } } : c,
      ),
      students: prev.students.map((s) => {
        const picks = s.ratings[cat.id]
        if (!picks) return s
        const moved: PickCode[] = picks.map((code) => {
          const p = parsePick(code)
          if (!p || p.level !== lvl) return code
          return formatPick(p.level, Math.min(remap(p.variant), nextPool.length - 1))
        })
        return { ...s, ratings: { ...s.ratings, [cat.id]: moved } }
      }),
    }))
  }

  const editPhrasing = (cat: Category, lvl: Level, idx: number, text: string) => {
    const pool = [...poolFor(cat, lvl)]
    pool[idx] = text
    patchCategory(cat.id, (c) => ({ ...c, levels: { ...c.levels, [lvl]: pool } }))
  }

  const addPhrasing = (cat: Category, lvl: Level) => {
    mutatePool(cat, lvl, [...poolFor(cat, lvl), ''], (v) => v)
  }

  const removePhrasing = (cat: Category, lvl: Level, idx: number) => {
    const pool = poolFor(cat, lvl)
    if (pool.length < 2) return
    const next = pool.filter((_, i) => i !== idx)
    // anyone who had the deleted wording falls back to the default
    mutatePool(cat, lvl, next, (v) => (v === idx ? 0 : v > idx ? v - 1 : v))
  }

  const makeDefault = (cat: Category, lvl: Level, idx: number) => {
    if (idx === 0) return
    const pool = poolFor(cat, lvl)
    const next = [pool[idx], ...pool.filter((_, i) => i !== idx)]
    mutatePool(cat, lvl, next, (v) => (v === idx ? 0 : v < idx ? v + 1 : v))
  }

  const resetBank = () => {
    if (
      !confirm(
        `Replace ${klass.name}'s comment bank with the built-in template? Students are kept, but their ratings will be cleared.`,
      )
    ) {
      return
    }
    updateClass((prev) => ({
      ...prev,
      categories: seedCategories(),
      students: prev.students.map((s) => ({ ...s, ratings: {} })),
    }))
  }

  const importBank = async (file: File) => {
    try {
      const categories = await parseBankFile(file)
      const replace = importMode.current === 'replace'
      if (replace && !confirm(`Replace all ${klass.categories.length} categories with the ${categories.length} in this file? Existing ratings will be cleared.`)) {
        return
      }
      updateClass((prev) => ({
        ...prev,
        categories: replace ? categories : [...prev.categories, ...categories],
        students: replace ? prev.students.map((s) => ({ ...s, ratings: {} })) : prev.students,
      }))
      alert(`Imported ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}.`)
    } catch (err) {
      alert(`Could not read that bank: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const pickBankFile = (mode: 'replace' | 'add') => {
    importMode.current = mode
    bankInput.current?.click()
  }

  const allOpen = klass.categories.length > 0 && openIds.size === klass.categories.length

  return (
    <div>
      <div className="bank-head">
        <h2>Comment bank · {klass.name}</h2>
        <p className="hint">
          Every level holds a pool of interchangeable phrasings — the first is the default, the rest
          are alternates you can pick per student. Checked categories are stitched together, top to
          bottom. Placeholders: <code>[Student]</code>, <code>[He/She/They]</code>,{' '}
          <code>[he/she/they]</code>, <code>[His/Her/Their]</code>, <code>[him/her/them]</code>.
        </p>
        <div className="btn-row">
          <button className="btn primary" onClick={addCategory}>
            + Add category
          </button>
          <button
            className="btn"
            onClick={() => setOpenIds(allOpen ? new Set() : new Set(klass.categories.map((c) => c.id)))}
          >
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
          <details className="tool-group">
            <summary>Share this bank…</summary>
            <div className="btn-row">
              <button className="btn" onClick={() => void exportBankXlsx(klass)}>
                Export (.xlsx)
              </button>
              <button className="btn" onClick={() => exportBankJson(klass)}>
                Export (.json)
              </button>
              <button className="btn" onClick={() => pickBankFile('add')}>
                Import &amp; add…
              </button>
              <button className="btn" onClick={() => pickBankFile('replace')}>
                Import &amp; replace…
              </button>
              <button className="btn subtle" onClick={resetBank} title="Restore the bank that shipped with the app">
                Reset to template
              </button>
            </div>
            <p className="hint">
              A bank file carries the categories and every phrasing — hand it to a colleague, or move
              it between your classes. <strong>Add</strong> appends to this bank; <strong>replace</strong>{' '}
              swaps it out and clears this class's ratings.
            </p>
          </details>
          <input
            ref={bankInput}
            type="file"
            accept=".xlsx,.xls,.csv,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void importBank(file)
            }}
          />
        </div>
      </div>

      <div className="bank-list">
        {klass.categories.map((cat, idx) => (
          <div key={cat.id} className={`bank-cat${isOpen(cat.id) ? '' : ' collapsed'}`}>
            <div className="bank-cat-head">
              <button
                className="btn small chevron"
                aria-expanded={isOpen(cat.id)}
                title={isOpen(cat.id) ? 'Collapse' : 'Expand'}
                onClick={() => toggleOpen(cat.id)}
              >
                {isOpen(cat.id) ? '▾' : '▸'}
              </button>
              <label className="include-toggle">
                <input
                  type="checkbox"
                  aria-label={`Include ${cat.name} in the final comment`}
                  checked={cat.include}
                  onChange={(e) => patchCategory(cat.id, (c) => ({ ...c, include: e.target.checked }))}
                />
                <span>in comment</span>
              </label>
              <input
                type="text"
                className="cat-name-input"
                aria-label="Category name"
                value={cat.name}
                onChange={(e) => patchCategory(cat.id, (c) => ({ ...c, name: e.target.value }))}
              />
              <div className="cat-actions">
                <button className="btn small" title="Move up" onClick={() => moveCategory(idx, -1)}>
                  ↑
                </button>
                <button className="btn small" title="Move down" onClick={() => moveCategory(idx, 1)}>
                  ↓
                </button>
                <button className="btn small" title="Duplicate" onClick={() => duplicateCategory(cat, idx)}>
                  ⧉
                </button>
                <button className="btn small danger" title="Delete" onClick={() => deleteCategory(cat)}>
                  ✕
                </button>
              </div>
            </div>

            {isOpen(cat.id) && (
              <div className="bank-cat-settings">
                <label className="field grow">
                  <span>Competency group</span>
                  <input
                    type="text"
                    placeholder="e.g. Communicating"
                    value={cat.group}
                    onChange={(e) => patchCategory(cat.id, (c) => ({ ...c, group: e.target.value }))}
                  />
                </label>
                <label className="include-toggle" title="Let a student carry more than one of these at once">
                  <input
                    type="checkbox"
                    checked={cat.multi}
                    onChange={(e) => patchCategory(cat.id, (c) => ({ ...c, multi: e.target.checked }))}
                  />
                  <span>multi-pick (a student can carry more than one)</span>
                </label>
              </div>
            )}

            {!isOpen(cat.id) && (
              <p className="bank-summary">
                {poolFor(cat, '1')[0]?.slice(0, 90) || 'No text yet'}
                {(poolFor(cat, '1')[0]?.length ?? 0) > 90 ? '…' : ''}
              </p>
            )}

            <div className="bank-levels">
              {LEVELS.map((lvl) => {
                const pool = poolFor(cat, lvl)
                return (
                  <div key={lvl} className="bank-level">
                    <div className="lvl-head">
                      <strong>Level {lvl}</strong>
                      <input
                        type="text"
                        placeholder="label (optional)"
                        aria-label={`Level ${lvl} label`}
                        value={cat.levelLabels?.[lvl] ?? ''}
                        onChange={(e) =>
                          patchCategory(cat.id, (c) => ({
                            ...c,
                            levelLabels: { ...(c.levelLabels ?? {}), [lvl]: e.target.value },
                          }))
                        }
                      />
                    </div>
                    {pool.map((text, i) => (
                      <div key={i} className="phrasing">
                        <textarea
                          rows={4}
                          aria-label={`Level ${lvl} phrasing ${i + 1}`}
                          placeholder={i === 0 ? `Comment text for level ${lvl}…` : 'Alternate wording…'}
                          value={text}
                          onChange={(e) => editPhrasing(cat, lvl, i, e.target.value)}
                        />
                        <div className="phrasing-tools">
                          <span className="phrasing-tag">{i === 0 ? 'default' : `alt ${i}`}</span>
                          {i > 0 && (
                            <button className="btn small" onClick={() => makeDefault(cat, lvl, i)}>
                              Make default
                            </button>
                          )}
                          {pool.length > 1 && (
                            <button className="btn small danger" onClick={() => removePhrasing(cat, lvl, i)}>
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <button className="btn small subtle" onClick={() => addPhrasing(cat, lvl)}>
                      + Add wording
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {!klass.categories.length && (
          <p className="empty-note">
            This bank is empty. Add a category, import one, or reset to the built-in template.
          </p>
        )}
      </div>
    </div>
  )
}
