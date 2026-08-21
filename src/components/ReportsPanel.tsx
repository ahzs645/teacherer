import { useMemo, useState } from 'react'
import type { AppState, Klass } from '../types'
import { generateComment } from '../lib/generate'
import { exportCsv, exportJson, exportXlsx } from '../lib/exportImport'
import { copyText } from '../lib/util'
import {
  Button,
  Card,
  EmptyState,
  SegmentedControl,
  Toolbar,
  ToolbarDivider,
  ToolbarSpacer,
} from './ui'
import type { SegmentOption } from './ui'

interface Props {
  state: AppState
  klass: Klass
  /** jump to the Students tab focused on this student */
  onOpenStudent: (id: string) => void
}

type Filter = 'all' | 'written' | 'missing'

const FILTERS: SegmentOption<Filter>[] = [
  { value: 'all', label: 'All' },
  { value: 'written', label: 'Written' },
  { value: 'missing', label: 'Missing' },
]

export default function ReportsPanel({ state, klass, onOpenStudent }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')

  /** Every student with their finished text, generated once per render pass. */
  const rows = useMemo(
    () => klass.students.map((st) => ({ student: st, comment: generateComment(klass.categories, st) })),
    [klass.categories, klass.students],
  )

  const written = rows.filter((r) => r.comment.trim() !== '')
  const shown =
    filter === 'written' ? written : filter === 'missing' ? rows.filter((r) => !r.comment.trim()) : rows

  const avgLength = written.length
    ? Math.round(written.reduce((n, r) => n + r.comment.length, 0) / written.length)
    : 0

  const copyOne = (id: string, text: string) => {
    void copyText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500)
  }

  const copyAll = () => {
    const text = rows
      .map(({ student, comment }) => `${student.name || '(unnamed)'}\n${comment}`)
      .join('\n\n')
    void copyText(text)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 1500)
  }

  return (
    <>
      <div className="page-head section--no-print">
        <div className="page-head__text">
          <h2>Reports</h2>
          <p className="hint">
            Every comment in {klass.name}, ready to copy into your reporting system — or print
            straight from this page.
          </p>
        </div>
        <Toolbar>
          <Button variant="primary" icon="download" onClick={() => void exportXlsx(state)}>
            .xlsx — all classes
          </Button>
          <Button icon="download" onClick={() => void exportCsv(state)}>
            .csv — this class
          </Button>
          <Button icon="download" onClick={() => exportJson(state)} title="A full backup of every class">
            .json backup
          </Button>
          <ToolbarDivider />
          <Button icon={copiedAll ? 'check' : 'copy'} onClick={copyAll}>
            {copiedAll ? 'Copied' : 'Copy all'}
          </Button>
          <Button icon="printer" onClick={() => window.print()}>
            Print
          </Button>
        </Toolbar>
      </div>

      <div className="stat-row section--no-print">
        <div className="stat">
          <span className="stat__value">{klass.students.length}</span>
          <span className="stat__label">Students</span>
        </div>
        <div className="stat">
          <span className="stat__value">{written.length}</span>
          <span className="stat__label">Comments written</span>
        </div>
        <div className="stat">
          <span className="stat__value">{rows.length - written.length}</span>
          <span className="stat__label">Still empty</span>
        </div>
        <div className="stat">
          <span className="stat__value">{avgLength}</span>
          <span className="stat__label">Average characters</span>
        </div>
      </div>

      {rows.length > 0 && (
        <Toolbar className="section--no-print" between>
          <SegmentedControl label="Filter comments" value={filter} onChange={setFilter} options={FILTERS} />
          <ToolbarSpacer />
          <span className="hint" style={{ fontSize: 'var(--text-xs)' }}>
            Showing {shown.length} of {rows.length}
          </span>
        </Toolbar>
      )}

      <div className="report-list" style={{ marginTop: 'var(--space-3)' }}>
        {shown.map(({ student, comment }) => (
          <Card key={student.id} className="report-card" interactive>
            <div className="report-card__head">
              <button
                className="link-btn report-card__name"
                style={{ textDecoration: 'none' }}
                title={`Open ${student.name || 'this student'} on the Students tab`}
                onClick={() => onOpenStudent(student.id)}
              >
                {student.name || 'Unnamed student'}
              </button>
              <span className="report-card__tools section--no-print">
                <span className="muted tabular" style={{ fontSize: 'var(--text-xs)' }}>
                  {comment.length}
                </span>
                <Button
                  size="xs"
                  variant="ghost"
                  icon={copiedId === student.id ? 'check' : 'copy'}
                  aria-label={`Copy ${student.name || 'this student'}'s comment`}
                  onClick={() => copyOne(student.id, comment)}
                />
              </span>
            </div>
            <p className="report-card__body" data-empty={comment ? undefined : 'true'}>
              {comment || 'No ratings selected yet.'}
            </p>
          </Card>
        ))}
      </div>

      {!rows.length && (
        <Card padding="none">
          <EmptyState icon="students" title="No students in this class yet">
            Add some on the Students tab, or import a roster from the Classes &amp; data tab, and
            their comments show up here.
          </EmptyState>
        </Card>
      )}

      {rows.length > 0 && !shown.length && (
        <Card padding="none">
          <EmptyState
            icon="check"
            title={filter === 'missing' ? 'Every student has a comment' : 'Nothing written yet'}
          >
            {filter === 'missing'
              ? 'Nothing left to fill in for this class.'
              : 'Rate a few categories on the Students or Mark grid tab and the comments appear here.'}
          </EmptyState>
        </Card>
      )}
    </>
  )
}
