import type { AppState, Category } from '../types'
import { LEVELS } from '../types'
import { freshStateFromSeed } from '../seedData'
import { uid } from '../lib/util'

interface Props {
  state: AppState
  update: (fn: (prev: AppState) => AppState) => void
}

export default function BankPanel({ state, update }: Props) {
  const patchCategory = (id: string, patch: (c: Category) => Category) => {
    update((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === id ? patch(c) : c)),
    }))
  }

  const moveCategory = (idx: number, delta: number) => {
    update((prev) => {
      const to = idx + delta
      if (to < 0 || to >= prev.categories.length) return prev
      const categories = [...prev.categories]
      ;[categories[idx], categories[to]] = [categories[to], categories[idx]]
      return { ...prev, categories }
    })
  }

  const deleteCategory = (cat: Category) => {
    if (!confirm(`Delete category “${cat.name}”? Student ratings for it will be removed too.`)) return
    update((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== cat.id),
      students: prev.students.map((s) => {
        const ratings = { ...s.ratings }
        delete ratings[cat.id]
        return { ...s, ratings }
      }),
    }))
  }

  const addCategory = () => {
    update((prev) => ({
      ...prev,
      categories: [
        ...prev.categories,
        {
          id: uid(),
          name: 'New category',
          include: true,
          levelLabels: null,
          levels: { '1': '', '2': '', '3': '', '4': '' },
        },
      ],
    }))
  }

  const resetBank = () => {
    if (
      !confirm(
        'Replace the current comment bank with the built-in template? Students are kept, but their ratings will be cleared.',
      )
    ) {
      return
    }
    const seeded = freshStateFromSeed()
    update((prev) => ({
      ...prev,
      categories: seeded.categories,
      students: prev.students.map((s) => ({ ...s, ratings: {} })),
    }))
  }

  return (
    <div>
      <div className="bank-head">
        <h2>Comment bank</h2>
        <p className="hint">
          Checked categories are stitched together, top to bottom, into each student's final
          comment. Use placeholders: <code>[Student]</code>, <code>[He/She/They]</code>,{' '}
          <code>[he/she/they]</code>, <code>[His/Her/Their]</code>, <code>[him/her/them]</code>.
        </p>
        <div className="btn-row">
          <button className="btn primary" onClick={addCategory}>
            + Add category
          </button>
          <button
            className="btn subtle"
            onClick={resetBank}
            title="Restore the bank that shipped with the app"
          >
            Reset bank to template
          </button>
        </div>
      </div>

      <div className="bank-list">
        {state.categories.map((cat, idx) => (
          <div key={cat.id} className="bank-cat">
            <div className="bank-cat-head">
              <label className="include-toggle">
                <input
                  type="checkbox"
                  checked={cat.include}
                  onChange={(e) => patchCategory(cat.id, (c) => ({ ...c, include: e.target.checked }))}
                />
                <span>in final comment</span>
              </label>
              <input
                type="text"
                value={cat.name}
                onChange={(e) => patchCategory(cat.id, (c) => ({ ...c, name: e.target.value }))}
              />
              <button className="btn" title="Move up" onClick={() => moveCategory(idx, -1)}>
                ↑
              </button>
              <button className="btn" title="Move down" onClick={() => moveCategory(idx, 1)}>
                ↓
              </button>
              <button className="btn danger" onClick={() => deleteCategory(cat)}>
                Delete
              </button>
            </div>
            <div className="bank-levels">
              {LEVELS.map((lvl) => (
                <div key={lvl} className="bank-level">
                  <div className="lvl-head">
                    <strong>Level {lvl}</strong>
                    <input
                      type="text"
                      placeholder="label (optional)"
                      value={cat.levelLabels?.[lvl] ?? ''}
                      onChange={(e) =>
                        patchCategory(cat.id, (c) => ({
                          ...c,
                          levelLabels: { ...(c.levelLabels ?? {}), [lvl]: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <textarea
                    rows={4}
                    placeholder={`Comment text for level ${lvl}…`}
                    value={cat.levels[lvl]}
                    onChange={(e) =>
                      patchCategory(cat.id, (c) => ({
                        ...c,
                        levels: { ...c.levels, [lvl]: e.target.value },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
