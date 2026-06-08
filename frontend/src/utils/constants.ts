export const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'css', label: 'CSS' },
  { value: 'html', label: 'HTML' },
  { value: 'bash', label: 'Bash' },
  { value: 'sql', label: 'SQL' },
  { value: 'rust', label: 'Rust' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
] as const;

export const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public', description: 'Anyone can see this gist' },
  { value: 'UNLISTED', label: 'Unlisted', description: 'Only people with the link can see this gist' },
  { value: 'PRIVATE', label: 'Private', description: 'Only you can see this gist' },
] as const;

export type LanguageValue = typeof LANGUAGES[number]['value'];
export type VisibilityValue = typeof VISIBILITY_OPTIONS[number]['value'];
