import { TermWithSubjects } from '@/types/database';

export interface TextSegment {
  text: string;
  isLink: boolean;
  termId?: string;
}

/**
 * Parses a definition text and identifies terms that should be linked
 * @param definition The definition text to parse
 * @param allTerms All available terms to check against
 * @param currentTermId The ID of the current term to avoid self-linking
 * @returns Array of text segments with link information
 */
export function parseDefinitionForLinks(
  definition: string,
  allTerms: TermWithSubjects[],
  currentTermId: string
): TextSegment[] {
  if (!definition || !allTerms.length) {
    return [{ text: definition || '', isLink: false }];
  }

  // Filter out the current term and sort by length (longest first) to match longer terms first
  const otherTerms = allTerms
    .filter((term) => term.id !== currentTermId)
    .sort((a, b) => b.name.length - a.name.length);

  const segments: TextSegment[] = [];
  let remainingText = definition;
  let processedIndex = 0;

  // Create a map of lowercase term names to term objects for case-insensitive matching
  const termMap = new Map<string, TermWithSubjects>();
  otherTerms.forEach((term) => {
    termMap.set(term.name.toLowerCase(), term);
  });

  while (processedIndex < definition.length) {
    let foundMatch = false;
    let matchStart = -1;
    let matchedTerm: TermWithSubjects | null = null;

    // Check each term for a match at the current position
    for (const term of otherTerms) {
      const searchText = definition.slice(processedIndex);
      const regex = new RegExp(`\\b${escapeRegex(term.name)}\\b`, 'i');
      const match = searchText.match(regex);

      if (match && match.index === 0) {
        matchStart = processedIndex;
        matchedTerm = term;
        foundMatch = true;
        break;
      }
    }

    if (foundMatch && matchedTerm) {
      // Add the matched term as a link segment
      segments.push({
        text: definition.slice(matchStart, matchStart + matchedTerm.name.length),
        isLink: true,
        termId: matchedTerm.id,
      });
      processedIndex = matchStart + matchedTerm.name.length;
    } else {
      // No match found, find the next potential match position
      let nextMatchPos = definition.length;

      for (const term of otherTerms) {
        const searchText = definition.slice(processedIndex);
        const regex = new RegExp(`\\b${escapeRegex(term.name)}\\b`, 'i');
        const match = searchText.match(regex);

        if (match && match.index !== undefined) {
          const absPos = processedIndex + match.index;
          if (absPos < nextMatchPos) {
            nextMatchPos = absPos;
          }
        }
      }

      // Add non-link text segment
      const text = definition.slice(processedIndex, nextMatchPos);
      if (text) {
        segments.push({
          text,
          isLink: false,
        });
      }
      processedIndex = nextMatchPos;
    }
  }

  // Merge consecutive non-link segments
  const mergedSegments: TextSegment[] = [];
  for (const segment of segments) {
    const lastSegment = mergedSegments[mergedSegments.length - 1];
    if (lastSegment && !lastSegment.isLink && !segment.isLink) {
      lastSegment.text += segment.text;
    } else {
      mergedSegments.push(segment);
    }
  }

  return mergedSegments.length > 0 ? mergedSegments : [{ text: definition, isLink: false }];
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
