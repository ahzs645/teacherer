import type { AppState, Category, Klass, Level, PickCode } from './types'
import { LEVELS } from './types'
import { uid } from './lib/util'
import { makeStudent } from './lib/pronouns'

/*
 * Default comment bank, extracted from RPcomment_tooltemplate (19/08/2026).
 *
 * Placeholders understood by the generator:
 *   [Student]                     -> student's name
 *   [He/She/They] / [he/she/they] -> subject pronoun (capitalised / lowercase)
 *   [His/Her/Their] / [his/her/their] -> possessive pronoun (the capitalised
 *                                        token is replaced lowercase, matching
 *                                        the original spreadsheet's behaviour)
 *   [Him/Her/Them] / [him/her/them]   -> object pronoun
 *
 * Levels follow the 1-4 proficiency scale used in the template, except
 * "Using Class Time" where the four options are independent issues rather than
 * a scale (Practice, Check work, Participation, Absences) — so it is marked
 * `multi` and a student can carry more than one.
 *
 * Each level holds a *pool* of interchangeable phrasings. The second entry for
 * Content Knowledge mirrors the template's "Comment2" column (AX): wording for
 * when the comment continues a paragraph instead of opening it. The sheet
 * stored those as bare fragments (" has demonstrated a solid…"); here they open
 * with a pronoun, which is what the fragment was concatenated onto. Add or
 * remove phrasings for any level from the Comment Bank tab.
 *
 * The template also carries empty scaffolding for US3, US4, COMM4 and CR1-CR4.
 * Those slots have no text in the workbook, so they are not seeded — add them
 * from the Comment Bank tab if you fill them in.
 */

interface SeedCategory {
  name: string
  group: string
  include: boolean
  multi?: boolean
  levelLabels?: Partial<Record<Level, string>>
  levels: Record<Level, string>
  altLevels?: Partial<Record<Level, string>>
}

const SEED_CATEGORIES: SeedCategory[] = [
  {
    name: 'Content Knowledge',
    group: 'Content',
    include: true,
    levels: {
      '1': '[Student] has demonstrated an incomplete understanding of the concepts covered so far.',
      '2': '[Student] has demonstrated a basic understanding of the concepts covered so far.',
      '3': '[Student] has demonstrated a solid understanding of the concepts covered so far.',
      '4': '[Student] has demonstrated an excellent understanding of the concepts covered so far.',
    },
    altLevels: {
      '1': '[He/She/They] has demonstrated an incomplete understanding of the concepts covered so far.',
      '2': '[He/She/They] has demonstrated a basic understanding of the concepts covered so far.',
      '3': '[He/She/They] has demonstrated a solid understanding of the concepts covered so far.',
      '4': '[He/She/They] has demonstrated an excellent understanding of the concepts covered so far.',
    },
  },
  {
    name: 'RA4',
    group: 'Reasoning & Analyzing',
    include: false,
    levels: {
      '1': '[Student] is beginning to recognize patterns and use logical thinking in mathematical tasks. With continued guidance and practice, [he/she/they] will develop greater confidence in analyzing problems.',
      '2': '[Student] is developing the ability to analyze mathematical problems and use reasoning to find solutions. With support, [he/she/they] can identify patterns and apply steps effectively.',
      '3': '[Student] consistently uses logical reasoning and recognizes patterns to solve problems efficiently. [He/She/They] can explain [His/Her/Their] reasoning clearly.',
      '4': '[Student] demonstrates strong analytical skills, often discovering new patterns and using advanced reasoning to explore and solve problems in creative ways.',
    },
  },
  {
    name: 'US1',
    group: 'Understanding & Solving',
    include: true,
    levels: {
      '1': '[Student] is learning to select and apply basic strategies when solving problems. Additional practice and support will help strengthen [His/Her/Their] understanding.',
      '2': '[Student] is developing confidence in solving familiar problems using appropriate strategies. [He/She/They] is learning to apply those strategies to new contexts with growing independence.',
      '3': '[Student] uses effective strategies to solve both familiar and unfamiliar problems. [He/She/They] works independently and approaches problems with a sense of confidence and curiosity.',
      '4': '[Student] confidently solves complex problems using a range of appropriate strategies. [He/She/They] is able to apply [His/Her/Their] understanding to new and unfamiliar contexts effectively.',
    },
  },
  {
    name: 'US2',
    group: 'Understanding & Solving',
    include: false,
    levels: {
      '1': 'They are not yet able to recognize which math concepts to use when solving problems or how to use them appropriately.',
      '2': 'They are able to identify appropriate math concepts required to solve some basic types of problems but sometimes forget important steps or apply concepts incorrectly.',
      '3': 'They are able to identify which concepts are required to solve a problem and apply them appropriately.',
      '4': 'They are able to make connections between different concepts to approach problems in creative ways.',
    },
  },
  {
    name: 'COMM1',
    group: 'Communicating',
    include: false,
    levels: {
      '1': '[Student] is learning to express mathematical ideas and often needs support to use appropriate terminology, symbols, and representations.',
      '2': '[Student] is developing the ability to communicate ideas clearly and is becoming more consistent in using correct mathematical symbols and vocabulary.',
      '3': '[Student] communicates mathematical thinking clearly using accurate terminology, symbols, and visuals to support understanding.',
      '4': '[Student] communicates mathematical reasoning in detailed and thoughtful ways, using a variety of representations and adapting explanations to suit the context or audience.',
    },
  },
  {
    name: 'COMM2',
    group: 'Communicating',
    include: false,
    levels: {
      '1': 'Provides basic answers without much explanation and sometimes struggles to explain the reasoning behind decisions.',
      '2': 'Gives some explanation of their thinking and is able to describe why they made certain choices but may need some prompts.',
      '3': 'Clearly explains their thinking by providing appropriate detail and justifies solutions with examples or mathematical reasoning.',
      '4': 'Provides clear, detailed explanations and reasoning. Justifies choices thoughtfully, often exploring alternatives.',
    },
  },
  {
    name: 'COMM3',
    group: 'Communicating',
    include: false,
    levels: {
      '1': 'Struggles to show thinking clearly, relying on only one way, like writing numbers. Needs support to communicate ideas in other ways, like diagrams or words.',
      '2': 'Can use numbers, words, or diagrams to explain their thinking but may need support. Beginning to try different ways to explain ideas, like drawing or providing examples.',
      '3': 'Uses a variety of ways (like diagrams, examples, and words) to explain ideas. Adapts how they show thinking to match the problem or audience.',
      '4': 'Uses multiple methods flexibly, choosing the best way to explain their ideas. Combines different ways (words, visuals, models) to thoroughly communicate ideas.',
    },
  },
  {
    name: 'Engagement',
    group: 'Work habits',
    include: false,
    levels: {
      '1': 'Needs reminders to participate in activities and often appears distracted.',
      '2': 'Participates in most activities, with some prompts to stay on task.',
      '3': 'Regularly contributes to discussions and class activities. Maintains engagement during lessons and shows interest in learning.',
      '4': 'Engages fully, often asking questions and leading discussions. Helps others stay engaged and contributes enthusiastically.',
    },
  },
  {
    name: 'Seeking Support',
    group: 'Work habits',
    include: false,
    levels: {
      '1': 'Reluctant to ask questions. Needs encouragement to ask for support.',
      '2': 'Seeks support occasionally but may not always utilize tutorials or help outside of class time.',
      '3': 'Asks for help when needed and uses feedback to improve understanding.',
      '4': 'Proactively asks questions to gain a deeper understanding and uses feedback to extend their understanding.',
    },
  },
  {
    name: 'Using Class Time',
    group: 'Work habits',
    include: true,
    multi: true,
    levelLabels: { '1': 'Practice', '2': 'Check work', '3': 'Participation', '4': 'Absences' },
    levels: {
      '1': 'Completing more of the assigned practice prior to assessments and seeking support is something [Student] should work on going forward.',
      '2': 'Taking the time to look over [His/Her/Their] work and correct any mistakes in calculations or conceptual thinking may help to improve understanding and prevent similar errors in the future.',
      '3': 'More consistent participation in lessons and class activities is something that [Student] needs to improve on going forward.',
      '4': 'Frequent absences made it difficult for [Student] to keep up with lessons and build a solid understanding.',
    },
  },
]

const SEED_STUDENTS: { name: string; pronouns: string; ratings: Record<string, PickCode[]> }[] = [
  { name: 'Student A', pronouns: 'she', ratings: { 'Content Knowledge': ['3'], US1: ['3'], 'Using Class Time': ['1'] } },
  { name: 'Student B', pronouns: 'he', ratings: { 'Content Knowledge': ['2'], US1: ['2'], 'Using Class Time': ['3'] } },
]

export function seedCategories(): Category[] {
  return SEED_CATEGORIES.map((c) => {
    const levels = {} as Record<Level, string[]>
    for (const lvl of LEVELS) {
      const alt = c.altLevels?.[lvl]
      levels[lvl] = alt ? [c.levels[lvl], alt] : [c.levels[lvl]]
    }
    return {
      id: uid(),
      name: c.name,
      group: c.group,
      include: c.include,
      multi: !!c.multi,
      levelLabels: c.levelLabels ? { ...c.levelLabels } : null,
      levels,
    }
  })
}

export function seedClass(name = 'My class'): Klass {
  const categories = seedCategories()
  const idByName = new Map(categories.map((c) => [c.name, c.id]))
  const students = SEED_STUDENTS.map((s) => {
    const ratings: Record<string, PickCode[]> = {}
    for (const [catName, picks] of Object.entries(s.ratings)) {
      const id = idByName.get(catName)
      if (id) ratings[id] = [...picks]
    }
    return makeStudent(s.name, s.pronouns, ratings)
  })
  return { id: uid(), name, categories, students }
}

/** A new class that starts from the built-in bank with nobody in it yet. */
export function emptyClass(name: string): Klass {
  return { id: uid(), name, categories: seedCategories(), students: [] }
}

/** A new class with no bank at all, for importing someone else's. */
export function blankClass(name: string): Klass {
  return { id: uid(), name, categories: [], students: [] }
}

export function freshStateFromSeed(): AppState {
  const klass = seedClass()
  return { version: 2, classes: [klass], activeClassId: klass.id }
}
