/** Progress list sync — no large snapshot columns. */
export const PROGRESS_META_COLUMNS =
  "challenge_id, completed, updated_at, blocks_updated_at";

/** Single-challenge draft restore — snapshots only. */
export const PROGRESS_SNAPSHOT_COLUMNS =
  "challenge_id, code_snapshot, blocks_snapshot, blocks_updated_at, updated_at";

/** Homework assignment lists — no saved code. */
export const HOMEWORK_LIST_COLUMNS =
  "id, student_id, challenge_id, assigned_by, assigned_at, due_date, completed, completed_at";

/** Mentor submission lists — no code body. */
export const SUBMISSION_LIST_COLUMNS =
  "id, student_id, challenge_id, submitted_at, status, grade, feedback, graded_at, graded_by";

/** Mentor custom challenge lists — no starter/instructions blobs. */
export const CHALLENGE_LIST_COLUMNS =
  "id, title, difficulty, xp, created_by, created_at";
