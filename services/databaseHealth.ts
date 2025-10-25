import { supabase } from './database';

export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    const { error: subjectsError } = await supabase
      .from('subjects')
      .select('id')
      .limit(1);

    if (subjectsError) {
      errors.push(`Subjects table: ${subjectsError.message}`);
    }
  } catch (error) {
    errors.push(`Subjects table: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  try {
    const { error: termsError } = await supabase
      .from('terms')
      .select('id')
      .limit(1);

    if (termsError) {
      errors.push(`Terms table: ${termsError.message}`);
    }
  } catch (error) {
    errors.push(`Terms table: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  try {
    const { error: termSubjectsError } = await supabase
      .from('term_subjects')
      .select('id')
      .limit(1);

    if (termSubjectsError) {
      errors.push(`Term-Subjects table: ${termSubjectsError.message}`);
    }
  } catch (error) {
    errors.push(`Term-Subjects table: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    healthy: errors.length === 0,
    errors,
  };
}
