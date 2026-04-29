// Boxed "activity" card. Used for in-class activities students will
// run during a session — bias hunts, drag-the-line labs, Teachable
// Machine training. Visually marked with the accent color so it pops
// out of the prose.

export function Activity({
  title,
  duration,
  children,
}: {
  title: string;
  duration?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="lesson-activity">
      <div className="lesson-activity-header">
        <span className="lesson-activity-label">Activity</span>
        <span className="lesson-activity-title">{title}</span>
        {duration && (
          <span className="lesson-activity-duration">· {duration}</span>
        )}
      </div>
      <div className="lesson-activity-body">{children}</div>
    </div>
  );
}
