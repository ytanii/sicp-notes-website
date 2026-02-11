/* @jsxRuntime classic */
import React, { useState } from 'react'
import './ChapterList.css'

interface Section {
  id: string
  data: {
    title: string
    section?: number
    pubDate?: string | Date
  }
}

interface Chapter {
  id: string
  data: {
    title: string
    chapter?: number
  }
}

interface Exercise {
  id: string
  data: {
    title: string
    section?: number
    chapter?: number
  }
}

interface ChapterListProps {
  chapters: Chapter[]
  sectionsByChapter: Record<number, Section[]>
  exercisesByChapter: Record<number, Exercise[]>
}

const ChapterItem: React.FC<{
  chapter: Chapter
  sections: Section[]
  exercises: Exercise[]
  onToggle: () => void
  staggerIndex: number
  isOpen: boolean
}> = ({ chapter, sections, exercises, onToggle, staggerIndex, isOpen }) => {
  const hasSections = sections.length > 0
  const hasExercises = exercises.length > 0
  const hasContent = hasSections || hasExercises
  const chapterNumber = chapter.data.chapter || 0
  const chapterTitle = chapter.data.title || `Chapter ${chapterNumber}`
  const chapterKey = `${chapter.data.chapter ?? chapter.id}`
  const contentId = `chapter-${chapterKey.replace(/[^a-zA-Z0-9-_]/g, '-')}-content`

  const handleSummaryClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!hasContent) return
    const target = event.target as HTMLElement
    if (target.closest('a')) return
    onToggle()
  }

  const handleSummaryKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!hasContent) return
    if (event.key !== 'Enter' && event.key !== ' ') return

    const target = event.target as HTMLElement
    if (target.closest('a')) return

    event.preventDefault()
    onToggle()
  }

  return (
    <li className={`chapter-item ${isOpen ? 'open' : ''}`} style={{ '--stagger': staggerIndex } as React.CSSProperties}>
      <div
        className="chapter-summary-wrapper"
        onClick={handleSummaryClick}
        onKeyDown={handleSummaryKeyDown}
        role={hasContent ? 'button' : undefined}
        tabIndex={hasContent ? 0 : undefined}
        aria-expanded={hasContent ? isOpen : undefined}
        aria-controls={hasContent ? contentId : undefined}
        aria-label={hasContent ? (isOpen ? `Collapse ${chapterTitle}` : `Expand ${chapterTitle}`) : undefined}
      >
        {hasContent ? (
          <span className={`chapter-toggle ${isOpen ? 'open' : ''}`} aria-hidden="true" />
        ) : (
          <span className="chapter-toggle-placeholder" />
        )}

        <a href={`/${chapter.id.replace(/\/index$/, '').replace(/\.mdx?$/, '')}/`} className="chapter-link">
          <span className="chapter-number">{chapter.data.chapter}</span>
          <span className="chapter-title">{chapter.data.title}</span>
        </a>
      </div>

      {hasContent && (
        <div id={contentId} className={`chapter-content ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
          <div className="chapter-content-inner">
            <div className="section-list-wrapper">
              <div className="tree-trunk" />
              {hasSections && (
                <ul className="section-list">
                  {sections.map((section) => (
                    <li key={section.id} className="section-item">
                      <a href={`/${section.id.replace(/\.mdx?$/, '')}/`}>
                        <span className="section-number">
                          {chapter.data.chapter}.{section.data.section}
                        </span>
                        <span className="section-title">{section.data.title}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              {hasExercises && (
                <div className="exercises-wrapper">
                  <div className="exercises-header">Exercises</div>
                  <ul className="exercises-list">
                    {exercises.map((exercise) => (
                      <li key={exercise.id} className="exercise-chip">
                        <a href={`/${exercise.id.replace(/\.mdx?$/, '')}/`} title={exercise.data.title}>
                          {exercise.data.section
                            ? `${chapter.data.chapter}.${exercise.data.section}`
                            : exercise.data.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </li>
  )
}

export const ChapterList: React.FC<ChapterListProps> = ({ chapters, sectionsByChapter, exercisesByChapter }) => {
  // Track open state for each chapter (default all open)
  const [openChapters, setOpenChapters] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {}
    chapters.forEach((c: Chapter) => {
      initial[c.data.chapter || 0] = true
    })
    return initial
  })

  const toggleChapter = (chapterNum: number) => {
    setOpenChapters((prev: Record<number, boolean>) => ({
      ...prev,
      [chapterNum]: !prev[chapterNum]
    }))
  }

  return (
    <ul className="chapter-list">
      {chapters.map((chapter, index) => (
        <ChapterItem
          key={chapter.id}
          chapter={chapter}
          sections={sectionsByChapter[chapter.data.chapter || 0] || []}
          exercises={exercisesByChapter[chapter.data.chapter || 0] || []}
          staggerIndex={index}
          isOpen={openChapters[chapter.data.chapter || 0]}
          onToggle={() => toggleChapter(chapter.data.chapter || 0)}
        />
      ))}
    </ul>
  )
}
