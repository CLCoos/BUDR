'use client'
// BUDR App – Flow 5: Måltrappen
// PARK-metodik | KRAP-inspireret: Måltrappen (#32) + Successikring (#33)

import { useState, useEffect } from 'react'
import { getGoalsWithSteps, completeStep } from '@/lib/park-queries'
import type { Goal, GoalStep } from '@/types/park'

interface Props {
  residentId: string
}

export default function GoalLadder({ residentId }: Props) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [completingStep, setCompletingStep] = useState<string | null>(null)
  const [noteModal, setNoteModal] = useState<{ stepId: string; stepTitle: string } | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    getGoalsWithSteps(residentId).then(data => {
      setGoals((data as unknown as Goal[]) ?? [])
      setLoading(false)
    })
  }, [residentId])

  async function handleCompleteStep(stepId: string) {
    setCompletingStep(stepId)
    try {
      const updated = await completeStep(stepId, note || undefined)
      setGoals(prev =>
        prev.map(g => ({
          ...g,
          steps: g.steps?.map(s => s.id === updated.id ? updated : s),
        }))
      )
      setNoteModal(null)
      setNote('')
    } catch (e) {
      console.error(e)
    } finally {
      setCompletingStep(null)
    }
  }

  if (loading) return <div className="park-loading">Henter dine mål...</div>

  if (goals.length === 0) {
    return (
      <div className="park-card park-card--center">
        <span className="park-empty-icon">🎯</span>
        <h2>Ingen mål endnu</h2>
        <p>Dit personale vil oprette mål sammen med dig.</p>
      </div>
    )
  }

  return (
    <div className="park-goal-list">
      {goals.map(goal => {
        const steps = goal.steps ?? []
        const completedSteps = steps.filter(s => s.completed).length
        const progress = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0
        const nextStep = steps.find(s => !s.completed)

        return (
          <div key={goal.id} className="park-goal">
            <div className="park-goal__header">
              <h3>{goal.title}</h3>
              {goal.description && <p>{goal.description}</p>}
              <div className="park-progress-bar">
                <div className="park-progress-bar__fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="park-progress-label">{completedSteps} af {steps.length} trin</span>
            </div>

            <div className="park-ladder">
              {[...steps].sort((a, b) => a.step_number - b.step_number).map(step => (
                <div
                  key={step.id}
                  className={`park-ladder__step ${step.completed ? 'done' : ''} ${nextStep?.id === step.id ? 'next' : ''}`}
                >
                  <div className="park-ladder__step-indicator">
                    {step.completed ? '✓' : step.step_number}
                  </div>
                  <div className="park-ladder__step-content">
                    <span className="park-ladder__step-title">{step.title}</span>
                    {step.description && (
                      <span className="park-ladder__step-desc">{step.description}</span>
                    )}
                    {step.completed && step.resident_note && (
                      <span className="park-ladder__step-note">"{step.resident_note}"</span>
                    )}
                  </div>
                  {nextStep?.id === step.id && (
                    <button
                      className="park-btn park-btn--small park-btn--primary"
                      onClick={() => setNoteModal({ stepId: step.id, stepTitle: step.title })}
                    >
                      Klaret! ✓
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Note modal ved trin-afslutning */}
      {noteModal && (
        <div className="park-modal-overlay" onClick={() => setNoteModal(null)}>
          <div className="park-modal" onClick={e => e.stopPropagation()}>
            <h3>🎉 Du klarede: {noteModal.stepTitle}</h3>
            <p>Vil du skrive noget om, hvordan det gik?</p>
            <textarea
              className="park-textarea"
              placeholder="Hvad tænkte du? Hvordan føltes det?"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
            />
            <div className="park-btn-row">
              <button
                className="park-btn park-btn--secondary"
                onClick={() => { setNoteModal(null); setNote('') }}
              >
                Annuller
              </button>
              <button
                className="park-btn park-btn--primary"
                disabled={completingStep === noteModal.stepId}
                onClick={() => handleCompleteStep(noteModal.stepId)}
              >
                {completingStep === noteModal.stepId ? 'Gemmer...' : 'Gem og fejr'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
