'use client'

interface Props {
  message: string | null;
}

export function FeedbackToast({ message }: Props) {
  if (!message) return null;
  return (
    <div className="feedback-toast">
      {message}
    </div>
  );
}
