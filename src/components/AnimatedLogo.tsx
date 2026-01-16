'use client';

const AnimatedLogo = () => (
  <div className="w-48 h-48 animate-slow-spin">
    <svg viewBox="0 0 100 100" className="w-full h-full animate-glow" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))' }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--secondary))' }} />
        </linearGradient>
      </defs>
      
      <polygon points="50,5 85,25 95,60 75,90 35,95 10,70 5,40 25,15" fill="none" stroke="url(#logo-gradient)" strokeWidth="0.5" />
      
      <path d="M50,5 L35,95 M85,25 L10,70 M95,60 L5,40 M75,90 L25,15" stroke="url(#logo-gradient)" strokeWidth="0.2" />
       <path d="M50,5 L10,70 M50,5 L75,90" stroke="url(#logo-gradient)" strokeWidth="0.2" />
       <path d="M85,25 L5,40 M85,25 L35,95" stroke="url(#logo-gradient)" strokeWidth="0.2" />
       <path d="M95,60 L25,15 M95,60 L75,90" stroke="url(#logo-gradient)" strokeWidth="0.2" />

      <circle cx="50" cy="5" r="1" fill="white" />
      <circle cx="85" cy="25" r="1" fill="white" />
      <circle cx="95" cy="60" r="1" fill="white" />
      <circle cx="75" cy="90" r="1" fill="white" />
      <circle cx="35" cy="95" r="1" fill="white" />
      <circle cx="10" cy="70" r="1" fill="white" />
      <circle cx="5" cy="40" r="1" fill="white" />
      <circle cx="25" cy="15" r="1" fill="white" />
    </svg>
  </div>
);

export default AnimatedLogo;
