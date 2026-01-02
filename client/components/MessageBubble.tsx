export default function MessageBubble({
    role,
    text
  }: {
    role: string;
    text: string;
  }) {
    return (
      <div className={`bubble ${role}`}>
        {text}
      </div>
    );
  }
  