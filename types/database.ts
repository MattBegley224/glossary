export interface Subject {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Term {
  id: string;
  name: string;
  definition: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface TermSubject {
  term_id: string;
  subject_id: string;
}

export interface SubjectWithTermCount extends Subject {
  term_count: number;
}

export interface TermWithSubjects extends Term {
  subjects: Subject[];
}
