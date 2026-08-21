import { useRef, useState } from 'react'
import type { Category, Klass, Level, PickCode } from '../types'
import { LEVELS } from '../types'
import { seedCategories } from '../seedData'
import { exportBankJson, exportBankXlsx, parseBankFile } from '../lib/exportImport'
import { parsePick, formatPick, poolFor } from '../lib/ratings'
import { uid } from '../lib/util'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Disclosure,
  EmptyState,
  Field,
  LevelChip,
  Toolbar,
  ToolbarSpacer,
} from './ui'

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
    updateClass((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === id ? patch(c) : c)),
    }))
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
      levels: {
        '1': [...cat.levels['1']],
        '2': [...cat.levels['2']],
        '3': [...cat.levels['3']],
        '4': [...cat.levels['4']],
      },
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
      if (
        replace &&
        !confirm(
          `Replace all ${klass.categories.length} categories with the ${categories.length} in this file? Existing ratings will be cleared.`,
        )
      ) {
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
  const included = klass.categories.filter((c) => c.include).length

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h2>Comment bank</h2>
          <p className="hint">
            {klass.name} · {klass.categories.length} categor
            {klass.categories.length === 1 ? 'y' : 'ies'}, {included} in the comment. Every level
            holds a pool of interchangeable phrasings — the first is the default, the rest are
            alternates you can pick per student. Categories are stitched together top to bottom.
          </p>
        </div>
        <Toolbar>
          <Button variant="primary" icon="plus" onClick={addCategory}>
            Add category
          </Button>
          <Button
            icon={allOpen ? 'chevronRight' : 'chevronDown'}
            onClick={() =>
              setOpenIds(allOpen ? new Set() : new Set(klass.categories.map((c) => c.id)))
            }
          >
            {allOpen ? 'Collapse all' : 'Expand all'}
          </Button>
        </Toolbar>
      </div>

      <Disclosure summary="Placeholders you can use in any wording">
        <p className="hint" style={{ margin: 0 }}>
          <code>[Student]</code>, <code>[He/She/They]</code>, <code>[he/she/they]</code>,{' '}
          <code>[His/Her/Their]</code>, <code>[him/her/them]</code> — each one is filled in from the
          student&apos;s name and pronouns as the comment is generated.
        </p>
      </Disclosure>

      <Disclosure summary="Share this bank — export, import, reset" className="section--no-print">
        <Toolbar>
          <Button icon="download" onClick={() => void exportBankXlsx(klass)}>
            Export .xlsx
          </Button>
          <Button icon="download" onClick={() => exportBankJson(klass)}>
            Export .json
          </Button>
          <Button icon="upload" onClick={() => pickBankFile('add')}>
            Import &amp; add…
          </Button>
          <Button icon="upload" onClick={() => pickBankFile('replace')}>
            Import &amp; replace…
          </Button>
          <ToolbarSpacer />
          <Button
            variant="dashed"
            onClick={resetBank}
            title="Restore the bank that shipped with the app"
          >
            Reset to template
          </Button>
        </Toolbar>
        <p className="hint" style={{ margin: 0 }}>
          A bank file carries the categories and every phrasing — hand it to a colleague, or move it
          between your classes. <strong>Add</strong> appends to this bank; <strong>replace</strong>{' '}
          swaps it out and clears this class&apos;s ratings.
        </p>
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
      </Disclosure>

      <div className="bank-list" style={{ marginTop: 'var(--space-4)' }}>
        {klass.categories.map((cat, idx) => {
          const open = isOpen(cat.id)
          return (
            <div
              key={cat.id}
              className="bank-cat"
              data-open={open ? 'true' : undefined}
              data-included={cat.include ? undefined : 'false'}
            >
              <div className="bank-cat__head">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={open ? 'chevronDown' : 'chevronRight'}
                  aria-expanded={open}
                  title={open ? 'Collapse' : 'Expand'}
                  aria-label={open ? `Collapse ${cat.name}` : `Expand ${cat.name}`}
                  onClick={() => toggleOpen(cat.id)}
                />
                <Checkbox
                  checked={cat.include}
                  onChange={(checked) => patchCategory(cat.id, (c) => ({ ...c, include: checked }))}
                  aria-label={`Include ${cat.name} in the final comment`}
                  title="Whether this category is stitched into the generated comment"
                  label={<span className="bank-cat__include-text">in comment</span>}
                />
                <input
                  type="text"
                  className="bank-cat__name"
                  aria-label="Category name"
                  value={cat.name}
                  onChange={(e) => patchCategory(cat.id, (c) => ({ ...c, name: e.target.value }))}
                />
                {cat.multi && <Badge tone="neutral">multi</Badge>}
                <div className="bank-cat__actions">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="arrowUp"
                    title="Move up"
                    aria-label={`Move ${cat.name} up`}
                    disabled={idx === 0}
                    onClick={() => moveCategory(idx, -1)}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="arrowDown"
                    title="Move down"
                    aria-label={`Move ${cat.name} down`}
                    disabled={idx === klass.categories.length - 1}
                    onClick={() => moveCategory(idx, 1)}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="duplicate"
                    title="Duplicate"
                    aria-label={`Duplicate ${cat.name}`}
                    onClick={() => duplicateCategory(cat, idx)}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="trash"
                    title="Delete"
                    aria-label={`Delete ${cat.name}`}
                    onClick={() => deleteCategory(cat)}
                  />
                </div>
              </div>

              {!open && (
                <p className="bank-cat__summary">
                  {poolFor(cat, '1')[0]?.slice(0, 110) || 'No text yet'}
                  {(poolFor(cat, '1')[0]?.length ?? 0) > 110 ? '…' : ''}
                </p>
              )}

              {open && (
                <>
                  <div className="bank-cat__settings">
                    <Field label="Competency group" grow>
                      <input
                        type="text"
                        placeholder="e.g. Communicating"
                        value={cat.group}
                        onChange={(e) =>
                          patchCategory(cat.id, (c) => ({ ...c, group: e.target.value }))
                        }
                      />
                    </Field>
                    <Checkbox
                      checked={cat.multi}
                      onChange={(checked) => patchCategory(cat.id, (c) => ({ ...c, multi: checked }))}
                      title="Let a student carry more than one of these at once"
                      label="multi-pick (a student can carry more than one)"
                    />
                  </div>

                  <div className="bank-levels">
                    {LEVELS.map((lvl) => {
                      const pool = poolFor(cat, lvl)
                      return (
                        <div key={lvl} className="bank-level">
                          <div className="bank-level__head">
                            <LevelChip level={lvl} />
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
                                placeholder={
                                  i === 0 ? `Comment text for level ${lvl}…` : 'Alternate wording…'
                                }
                                value={text}
                                onChange={(e) => editPhrasing(cat, lvl, i, e.target.value)}
                              />
                              <div className="phrasing__tools">
                                <Badge tone={i === 0 ? 'brand' : 'outline'}>
                                  {i === 0 ? 'default' : `alt ${i}`}
                                </Badge>
                                {i > 0 && (
                                  <Button size="xs" onClick={() => makeDefault(cat, lvl, i)}>
                                    Make default
                                  </Button>
                                )}
                                {pool.length > 1 && (
                                  <Button
                                    size="xs"
                                    variant="danger"
                                    icon="trash"
                                    aria-label={`Remove level ${lvl} wording ${i + 1}`}
                                    onClick={() => removePhrasing(cat, lvl, i)}
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                          <Button
                            size="sm"
                            variant="dashed"
                            icon="plus"
                            block
                            onClick={() => addPhrasing(cat, lvl)}
                          >
                            Add wording
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )
        })}

        {!klass.categories.length && (
          <Card padding="none">
            <EmptyState
              icon="bank"
              title="This bank is empty"
              actions={
                <Button variant="primary" icon="plus" onClick={addCategory}>
                  Add a category
                </Button>
              }
            >
              Add a category, import one a colleague shared, or reset to the built-in template.
            </EmptyState>
          </Card>
        )}
      </div>
    </>
  )
}
