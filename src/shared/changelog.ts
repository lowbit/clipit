export interface ChangelogEntry {
  version: string
  changes: string[]
}

const changelog: ChangelogEntry[] = [
  {
    version: '1.3.2',
    changes: [
      'Fixed TypeScript type errors in settings modal (codec, quality, fps, resolution)',
      'Removed unused imports and variables across the codebase',
    ],
  },
  {
    version: '1.3.1',
    changes: [
      'Fixed thumbnail generation issue',
    ],
  },
  {
    version: '1.3.0',
    changes: [
      'Added Streamable upload integration (direct video uploads)',
    ],
  },
]

export default changelog
