"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface ScoreChartProps {
  score: number;
  enhanced?: boolean;
  size?: number;
}

export default function ScoreChart({ score, enhanced = false, size = 200 }: ScoreChartProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = size / 2 - 20;
  const circumference = 2 * Math.PI * radius;
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 300);
    return () => clearTimeout(timer);
  }, [score]);

  // Calculate stroke dash offset for the progress
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;
  
  // Determine color based on score (use blue token palette)
  const getColor = () => {
    // Use CSS variables so the theme drives actual hue
    // Fallback to heat-100 if heat-200 is not defined
    if (score >= 80) return "var(--heat-200, var(--heat-100))"; // deeper royal blue (fallback safe)
    if (score >= 60) return "var(--heat-100)"; // primary royal blue
    if (score >= 40) return "var(--heat-40)"; // lighter blue
    return "var(--heat-20)"; // faint blue
  };
  
  const getGradientId = enhanced ? "enhanced-gradient" : "normal-gradient";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={getGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={getColor()} stopOpacity="1" />
            {/* When enhanced, lean into a stronger blue for the tail of the arc */}
            <stop offset="100%" stopColor={enhanced ? "var(--heat-200, var(--heat-100))" : getColor()} stopOpacity="0.7" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(0,0,0,0.05)"
          strokeWidth="12"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${getGradientId})`}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          filter="url(#glow)"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          className="text-4xl font-bold text-heat-150"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {animatedScore}%
        </motion.div>
        {enhanced && (
          <motion.div
            className="text-xs text-heat-100 mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            AI強化
          </motion.div>
        )}
      </div>
    </div>
  );
}
