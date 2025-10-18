import { createClient } from '@supabase/supabase-js';
import { Subject, Term, TermSubject, SubjectWithTermCount, TermWithSubjects } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

function mapTermFromDb(dbTerm: any): Term {
  return {
    id: dbTerm.id,
    name: dbTerm.term_name,
    definition: dbTerm.definition,
    is_favorite: dbTerm.is_favorite,
    created_at: dbTerm.created_at,
    updated_at: dbTerm.updated_at,
  };
}

export const database = {
  subjects: {
    async getAll(): Promise<SubjectWithTermCount[]> {
      const { data, error } = await supabase
        .from('subjects')
        .select(`
          *,
          term_count:term_subjects(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((subject) => ({
        ...subject,
        term_count: subject.term_count?.[0]?.count || 0,
      }));
    },

    async getById(id: string): Promise<Subject | null> {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },

    async create(name: string, color: string): Promise<Subject> {
      const { data, error } = await supabase
        .from('subjects')
        .insert({ name, color })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async update(id: string, name: string, color: string): Promise<Subject> {
      const { data, error } = await supabase
        .from('subjects')
        .update({ name, color })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async delete(id: string): Promise<void> {
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) throw error;
    },
  },

  terms: {
    async getAll(): Promise<TermWithSubjects[]> {
      const { data, error } = await supabase
        .from('terms')
        .select(`
          id,
          term_name,
          definition,
          is_favorite,
          created_at,
          updated_at,
          term_subjects(
            subjects(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((term) => ({
        ...mapTermFromDb(term),
        subjects: term.term_subjects?.map((ts: any) => ts.subjects) || [],
      }));
    },

    async getBySubject(subjectId: string): Promise<TermWithSubjects[]> {
      const { data, error } = await supabase
        .from('terms')
        .select(`
          id,
          term_name,
          definition,
          is_favorite,
          created_at,
          updated_at,
          term_subjects!inner(
            subject_id,
            subjects(*)
          )
        `)
        .eq('term_subjects.subject_id', subjectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((term) => ({
        ...mapTermFromDb(term),
        subjects: term.term_subjects?.map((ts: any) => ts.subjects) || [],
      }));
    },

    async getFavorites(): Promise<TermWithSubjects[]> {
      const { data, error } = await supabase
        .from('terms')
        .select(`
          id,
          term_name,
          definition,
          is_favorite,
          created_at,
          updated_at,
          term_subjects(
            subjects(*)
          )
        `)
        .eq('is_favorite', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((term) => ({
        ...mapTermFromDb(term),
        subjects: term.term_subjects?.map((ts: any) => ts.subjects) || [],
      }));
    },

    async getById(id: string): Promise<TermWithSubjects | null> {
      const { data, error } = await supabase
        .from('terms')
        .select(`
          id,
          term_name,
          definition,
          is_favorite,
          created_at,
          updated_at,
          term_subjects(
            subjects(*)
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      if (!data) return null;

      return {
        ...mapTermFromDb(data),
        subjects: data.term_subjects?.map((ts: any) => ts.subjects) || [],
      };
    },

    async create(name: string, definition: string, subjectIds: string[]): Promise<Term> {
      const { data: term, error: termError } = await supabase
        .from('terms')
        .insert({ term_name: name, definition })
        .select('id, term_name, definition, is_favorite, created_at, updated_at')
        .single();

      if (termError) throw termError;

      const mappedTerm = mapTermFromDb(term);

      if (subjectIds.length > 0) {
        const termSubjects = subjectIds.map((subjectId) => ({
          term_id: term.id,
          subject_id: subjectId,
        }));

        const { error: linkError } = await supabase.from('term_subjects').insert(termSubjects);

        if (linkError) throw linkError;
      }

      return mappedTerm;
    },

    async update(
      id: string,
      name: string,
      definition: string,
      subjectIds: string[]
    ): Promise<Term> {
      const { data: term, error: termError } = await supabase
        .from('terms')
        .update({ term_name: name, definition, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id, term_name, definition, is_favorite, created_at, updated_at')
        .single();

      if (termError) throw termError;

      const mappedTerm = mapTermFromDb(term);

      const { error: deleteError } = await supabase
        .from('term_subjects')
        .delete()
        .eq('term_id', id);

      if (deleteError) throw deleteError;

      if (subjectIds.length > 0) {
        const termSubjects = subjectIds.map((subjectId) => ({
          term_id: id,
          subject_id: subjectId,
        }));

        const { error: linkError } = await supabase.from('term_subjects').insert(termSubjects);

        if (linkError) throw linkError;
      }

      return mappedTerm;
    },

    async toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
      const { error } = await supabase
        .from('terms')
        .update({ is_favorite: isFavorite })
        .eq('id', id);

      if (error) throw error;
    },

    async delete(id: string): Promise<void> {
      const { error } = await supabase.from('terms').delete().eq('id', id);
      if (error) throw error;
    },
  },
};
