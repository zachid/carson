/**
 * Thin wrappers around @heroicons/react/24/outline.
 * Pass `size` (default 14) or override with `style`.
 */
import {
  PencilSquareIcon,
  XMarkIcon,
  CheckIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  SunIcon,
  MoonIcon,
  ArrowsPointingOutIcon,
  BookmarkIcon,
  DocumentDuplicateIcon,
  Squares2X2Icon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';

import { BookmarkIcon as BookmarkSolid, CheckCircleIcon } from '@heroicons/react/24/solid';

function icon(Component) {
  return function Icon({ size = 14, style, ...props }) {
    return <Component style={{ width: size, height: size, flexShrink: 0, ...style }} {...props} />;
  };
}

export const IconEdit       = icon(PencilSquareIcon);
export const IconClose      = icon(XMarkIcon);
export const IconCheck      = icon(CheckIcon);
export const IconCheckFill  = icon(CheckCircleIcon);
export const IconDownload   = icon(ArrowDownTrayIcon);
export const IconUpload     = icon(ArrowUpTrayIcon);
export const IconRefresh    = icon(ArrowPathIcon);
export const IconBack       = icon(ArrowLeftIcon);
export const IconNext       = icon(ArrowRightIcon);
export const IconChevRight  = icon(ChevronRightIcon);
export const IconChevDown   = icon(ChevronDownIcon);
export const IconSun        = icon(SunIcon);
export const IconMoon       = icon(MoonIcon);
export const IconFullscreen = icon(ArrowsPointingOutIcon);
export const IconBookmark   = icon(BookmarkIcon);
export const IconBookmarkFill = icon(BookmarkSolid);
export const IconCopy       = icon(DocumentDuplicateIcon);
export const IconLayout     = icon(Squares2X2Icon);
export const IconSync       = icon(CloudArrowUpIcon);
