import { useState, useEffect } from "react";

interface TypewriterAnimationProps {
  texts: string[];
  speed?: number;
  deleteSpeed?: number;
  pause?: number;
  className?: string;
}

export const TypewriterAnimation = ({
  texts,
  speed = 150,
  deleteSpeed = 75,
  pause = 2000,
  className = "",
}: TypewriterAnimationProps) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const targetText = texts[currentTextIndex];

    const timer = setTimeout(
      () => {
        if (!isDeleting && currentText.length < targetText.length) {
          // Typing
          setCurrentText(targetText.substring(0, currentText.length + 1));
        } else if (!isDeleting && currentText.length === targetText.length) {
          // Pause before deleting
          setTimeout(() => setIsDeleting(true), pause);
        } else if (isDeleting && currentText.length > 0) {
          // Deleting
          setCurrentText(targetText.substring(0, currentText.length - 1));
        } else if (isDeleting && currentText.length === 0) {
          // Move to next text
          setIsDeleting(false);
          setCurrentTextIndex((prevIndex) => (prevIndex + 1) % texts.length);
        }
      },
      isDeleting ? deleteSpeed : speed,
    );

    return () => clearTimeout(timer);
  }, [
    currentText,
    currentTextIndex,
    isDeleting,
    texts,
    speed,
    deleteSpeed,
    pause,
  ]);

  return (
    <span className={className}>
      {currentText}
      <span className="animate-pulse text-accent">|</span>
    </span>
  );
};
