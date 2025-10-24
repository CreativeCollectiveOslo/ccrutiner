import { useEffect, useState } from "react";

interface TaskCompletionAnimationProps {
  isCompleted: boolean;
}

export function TaskCompletionAnimation({ isCompleted }: TaskCompletionAnimationProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isCompleted) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isCompleted]);

  if (!showConfetti) return null;

  const confettiPieces = Array.from({ length: 15 }, (_, i) => i);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {confettiPieces.map((i) => {
        const randomX = Math.random() * 100;
        const randomDelay = Math.random() * 0.2;
        const randomRotation = Math.random() * 360;
        const randomColor = [
          "bg-primary",
          "bg-secondary",
          "bg-accent",
          "bg-yellow-400",
          "bg-green-400",
          "bg-blue-400",
          "bg-pink-400",
          "bg-purple-400",
        ][Math.floor(Math.random() * 8)];

        return (
          <div
            key={i}
            className={`absolute w-2 h-2 ${randomColor} rounded-sm animate-confetti`}
            style={{
              left: `${randomX}%`,
              top: "50%",
              animationDelay: `${randomDelay}s`,
              transform: `rotate(${randomRotation}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}
