export type Recurrence =
  | {
      type: 'none';
    }
  | {
      type: 'weekly';
      weekday: number; // 0 Pazar ... 6 Cumartesi
    };

export type Attachment = {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
};

export type Note = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  endTime?: string; // HH:mm
  title: string;
  content: string;
  tags: string[];
  tz?: string;
  recurrence?: Recurrence;
  recurrenceExceptions?: string[]; // YYYY-MM-DD, sadece o tekrar örneğini atla
  reminderDaysBefore?: number;
  attachments?: Attachment[];
};

export type NoteInput = {
  date: string;
  time: string;
  endTime?: string;
  title: string;
  content: string;
  tags: string[];
  tz?: string;
  recurrence?: Recurrence;
  recurrenceExceptions?: string[];
  reminderDaysBefore?: number;
  attachments?: Attachment[];
};
