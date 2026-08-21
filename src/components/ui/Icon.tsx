import type { SVGProps } from 'react'

/**
 * A small hand-rolled icon set.
 *
 * Adding an icon library to a 3-dependency offline-first app would cost more
 * than it is worth, so these are plain 24×24 stroked paths that inherit
 * `currentColor` and the surrounding font size.
 */
export type IconName =
  | 'students'
  | 'grid'
  | 'bank'
  | 'reports'
  | 'data'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'help'
  | 'plus'
  | 'search'
  | 'copy'
  | 'check'
  | 'close'
  | 'trash'
  | 'duplicate'
  | 'printer'
  | 'download'
  | 'upload'
  | 'arrowUp'
  | 'arrowDown'
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronDown'
  | 'shuffle'
  | 'sparkles'
  | 'lock'
  | 'inbox'
  | 'wifiOff'

const PATHS: Record<IconName, string> = {
  students:
    'M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20 M12 7.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0 M22 20v-1.5a4 4 0 0 0-3-3.87 M16.5 4.13a4 4 0 0 1 0 7.75',
  grid: 'M3 3h18v18H3z M3 9h18 M3 15h18 M9 3v18 M15 3v18',
  bank: 'M4 4.5A1.5 1.5 0 0 1 5.5 3H9v18H5.5A1.5 1.5 0 0 1 4 19.5z M13 3h5.5A1.5 1.5 0 0 1 20 4.5v15a1.5 1.5 0 0 1-1.5 1.5H13z M13 8h7 M13 13h7',
  reports:
    'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M9 13h6 M9 17h4',
  data: 'M12 3c4.42 0 8 1.34 8 3s-3.58 3-8 3-8-1.34-8-3 3.58-3 8-3z M20 6v12c0 1.66-3.58 3-8 3s-8-1.34-8-3V6 M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M12 1.5v2 M12 20.5v2 M3.5 12h-2 M22.5 12h-2 M5.6 5.6 4.2 4.2 M19.8 19.8l-1.4-1.4 M18.4 5.6l1.4-1.4 M4.2 19.8l1.4-1.4',
  moon: 'M20.5 14.3A8.5 8.5 0 1 1 9.7 3.5a6.8 6.8 0 0 0 10.8 10.8z',
  monitor: 'M3 4.5h18v11H3z M8.5 20.5h7 M12 15.5v5',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M9.4 9.3a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2.7-2.6 2.7 M12 17.1h.01',
  plus: 'M12 5v14 M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20.5 20.5 16 16',
  copy: 'M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1z M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  check: 'm4.5 12.5 5 5 10-11',
  close: 'M6 6l12 12 M18 6 6 18',
  trash: 'M4 6.5h16 M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7 M6.5 6.5 7.4 20a1.3 1.3 0 0 0 1.3 1.2h6.6a1.3 1.3 0 0 0 1.3-1.2l.9-13.5 M10.5 10.5v6 M13.5 10.5v6',
  duplicate: 'M8 8h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z M4 16a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1',
  printer:
    'M7 8V3.5h10V8 M6 18H4.5A1.5 1.5 0 0 1 3 16.5v-6A1.5 1.5 0 0 1 4.5 9h15A1.5 1.5 0 0 1 21 10.5v6a1.5 1.5 0 0 1-1.5 1.5H18 M7 14h10v6.5H7z M17.5 12h.01',
  download: 'M12 3.5v12 M7.5 11l4.5 4.5 4.5-4.5 M4 20.5h16',
  upload: 'M12 15.5v-12 M7.5 8 12 3.5 16.5 8 M4 20.5h16',
  arrowUp: 'M12 19V5 M6 11l6-6 6 6',
  arrowDown: 'M12 5v14 M6 13l6 6 6-6',
  chevronLeft: 'm14.5 5-7 7 7 7',
  chevronRight: 'm9.5 5 7 7-7 7',
  chevronDown: 'm5 9.5 7 7 7-7',
  shuffle: 'M16 3.5 20.5 8 16 12.5 M3.5 8h17 M8 11.5 3.5 16 8 20.5 M20.5 16h-17',
  sparkles:
    'M12 3.5 13.6 8.4 18.5 10 13.6 11.6 12 16.5 10.4 11.6 5.5 10 10.4 8.4z M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z',
  lock: 'M6.5 10.5h11a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z M8.5 10.5V7a3.5 3.5 0 1 1 7 0v3.5',
  inbox:
    'M3.5 13.5h4l1.5 3h6l1.5-3h4 M5.2 4.6 3.5 13.5v5a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1v-5L18.8 4.6a1 1 0 0 0-1-.6H6.2a1 1 0 0 0-1 .6z',
  wifiOff:
    'M3 3l18 18 M8.8 15.6a4.5 4.5 0 0 1 6.4 0 M5.3 12.2a9 9 0 0 1 3.2-2.1 M18.7 12.2a9 9 0 0 0-6.2-2.6 M2 8.8A14 14 0 0 1 6.4 6 M22 8.8a14 14 0 0 0-8.6-3.7 M12 19.2h.01',
}

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  /** Any CSS length; defaults to 1.15em so icons track the text they sit beside. */
  size?: number | string
}

export default function Icon({ name, size = '1.15em', ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
