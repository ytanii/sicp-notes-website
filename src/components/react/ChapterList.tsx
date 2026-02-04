import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
    initiallyOpen: boolean
    onToggle: (e: React.MouseEvent) => void
    isOpen: boolean
}> = ({ chapter, sections, exercises, onToggle, isOpen }) => {
    const hasSections = sections.length > 0
    const hasExercises = exercises.length > 0
    const hasContent = hasSections || hasExercises

    return (
        <li className={`chapter-item ${isOpen ? 'open' : ''}`}>
            <div className="chapter-summary-wrapper">
                {hasContent ? (
                    <button
                        className={`chapter-toggle ${isOpen ? 'open' : ''}`}
                        onClick={onToggle}
                        aria-label={isOpen ? "Collapse chapter" : "Expand chapter"}
                    />
                ) : (
                    <span className="chapter-toggle-placeholder" />
                )}

                <a
                    href={`/${chapter.id.replace(/\/index$/, '').replace(/\.mdx?$/, '')}/`}
                    className="chapter-link"
                >
                    <span className="chapter-number">{chapter.data.chapter}</span>
                    <span className="chapter-title">{chapter.data.title}</span>
                </a>
            </div>

            <AnimatePresence initial={false}>
                {isOpen && hasContent && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="section-list-wrapper">
                            <div className="tree-trunk" />
                            {hasSections && (
                                <ul className="section-list">
                                    {sections.map((section, index) => (
                                        <li
                                            key={section.id}
                                            className="section-item"
                                            style={{ '--item-index': index } as React.CSSProperties}
                                        >
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
                                        {exercises.map((exercise, index) => (
                                            <li
                                                key={exercise.id}
                                                className="exercise-chip"
                                                style={{ '--item-index': index } as React.CSSProperties}
                                            >
                                                <a href={`/${exercise.id.replace(/\.mdx?$/, '')}/`} title={exercise.data.title}>
                                                    {exercise.data.section ? `${chapter.data.chapter}.${exercise.data.section}` : exercise.data.title}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
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

    const toggleChapter = (chapterNum: number, e: React.MouseEvent) => {
        e.preventDefault()
        setOpenChapters((prev: Record<number, boolean>) => ({
            ...prev,
            [chapterNum]: !prev[chapterNum],
        }))
    }

    return (
        <ul className="chapter-list">
            {chapters.map((chapter) => (
                <ChapterItem
                    key={chapter.id}
                    chapter={chapter}
                    sections={sectionsByChapter[chapter.data.chapter || 0] || []}
                    exercises={exercisesByChapter[chapter.data.chapter || 0] || []}
                    initiallyOpen={openChapters[chapter.data.chapter || 0]}
                    isOpen={openChapters[chapter.data.chapter || 0]} // Pass tracked state
                    onToggle={(e) => toggleChapter(chapter.data.chapter || 0, e)}
                />
            ))}
        </ul>
    )
}
