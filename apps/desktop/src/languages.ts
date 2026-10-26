import { LanguageDescription } from '@codemirror/language'

/**
 * Code languages available inside Markdown fences.
 *
 * The blog's posts are almost entirely C++, so that one is essential; the rest
 * come from the CodeMirror packages the desktop app already depends on. Each
 * loader is dynamic, so a language only reaches the window when a fence asks
 * for it.
 */
export const codeLanguages: LanguageDescription[] = [
  LanguageDescription.of({
    name: 'C++',
    alias: ['cpp', 'c++', 'cc', 'cxx', 'hpp', 'hxx', 'h'],
    extensions: ['cpp', 'cc', 'cxx', 'hpp', 'hxx', 'h'],
    load: () => import('@codemirror/lang-cpp').then((module) => module.cpp()),
  }),
  LanguageDescription.of({
    name: 'JavaScript',
    alias: ['js', 'jsx', 'javascript'],
    extensions: ['js', 'jsx', 'mjs', 'cjs'],
    load: () => import('@codemirror/lang-javascript').then((module) => module.javascript()),
  }),
  LanguageDescription.of({
    name: 'TypeScript',
    alias: ['ts', 'tsx', 'typescript'],
    extensions: ['ts', 'tsx'],
    load: () =>
      import('@codemirror/lang-javascript').then((module) => module.javascript({ typescript: true })),
  }),
  LanguageDescription.of({
    name: 'HTML',
    alias: ['html', 'htm'],
    extensions: ['html', 'htm'],
    load: () => import('@codemirror/lang-html').then((module) => module.html()),
  }),
  LanguageDescription.of({
    name: 'CSS',
    alias: ['css'],
    extensions: ['css'],
    load: () => import('@codemirror/lang-css').then((module) => module.css()),
  }),
]
