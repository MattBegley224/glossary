export interface ImportedTerm {
  name: string;
  definition: string;
}

export interface ImportResult {
  success: boolean;
  terms: ImportedTerm[];
  errors: string[];
}

export async function parseCSV(content: string): Promise<ImportResult> {
  const errors: string[] = [];
  const terms: ImportedTerm[] = [];

  try {
    const lines = content.split('\n').filter((line) => line.trim());

    if (lines.length === 0) {
      return { success: false, terms: [], errors: ['File is empty'] };
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

    const nameIndex = headers.findIndex((h) => h === 'name' || h === 'term');
    const definitionIndex = headers.findIndex(
      (h) => h === 'definition' || h === 'def' || h === 'meaning'
    );

    if (nameIndex === -1 || definitionIndex === -1) {
      return {
        success: false,
        terms: [],
        errors: [
          'CSV must have "name" (or "term") and "definition" (or "def"/"meaning") columns',
        ],
      };
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const values = parseCSVLine(line);

      if (values.length <= Math.max(nameIndex, definitionIndex)) {
        errors.push(`Line ${i + 1}: Invalid format`);
        continue;
      }

      const name = values[nameIndex]?.trim();
      const definition = values[definitionIndex]?.trim();

      if (!name || !definition) {
        errors.push(`Line ${i + 1}: Missing name or definition`);
        continue;
      }

      terms.push({ name, definition });
    }

    return {
      success: terms.length > 0,
      terms,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      terms: [],
      errors: [`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export async function parseJSON(content: string): Promise<ImportResult> {
  try {
    const data = JSON.parse(content);

    if (!Array.isArray(data)) {
      return {
        success: false,
        terms: [],
        errors: ['JSON must be an array of terms'],
      };
    }

    const terms: ImportedTerm[] = [];
    const errors: string[] = [];

    data.forEach((item, index) => {
      if (typeof item !== 'object' || item === null) {
        errors.push(`Item ${index + 1}: Must be an object`);
        return;
      }

      const name = item.name || item.term;
      const definition = item.definition || item.def || item.meaning;

      if (!name || typeof name !== 'string') {
        errors.push(`Item ${index + 1}: Missing or invalid "name" field`);
        return;
      }

      if (!definition || typeof definition !== 'string') {
        errors.push(`Item ${index + 1}: Missing or invalid "definition" field`);
        return;
      }

      terms.push({
        name: name.trim(),
        definition: definition.trim(),
      });
    });

    return {
      success: terms.length > 0,
      terms,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      terms: [],
      errors: [`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

export async function importFile(uri: string, fileName: string): Promise<ImportResult> {
  try {
    const response = await fetch(uri);
    const content = await response.text();

    if (fileName.endsWith('.json')) {
      return parseJSON(content);
    } else if (fileName.endsWith('.csv')) {
      return parseCSV(content);
    } else {
      return {
        success: false,
        terms: [],
        errors: ['Unsupported file format. Please use .json or .csv files'],
      };
    }
  } catch (error) {
    return {
      success: false,
      terms: [],
      errors: [`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}
