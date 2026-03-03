export type Note = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  title: string;
  content: string;
  tags: string[];
  tz?: string;
};

export type NoteInput = {
  date: string;
  time: string;
  title: string;
  content: string;
  tags: string[];
  tz?: string;
};
