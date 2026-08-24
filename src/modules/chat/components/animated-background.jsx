"use client";

const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <div
        className="absolute top-[10%] left-[15%] h-72 w-72 rounded-full opacity-30 blur-3xl animate-blob"
        style={{
          background: "radial-gradient(circle, #ec4899 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-[20%] right-[15%] h-80 w-80 rounded-full opacity-25 blur-3xl animate-blob animation-delay-2000"
        style={{
          background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-[15%] left-[30%] h-64 w-64 rounded-full opacity-20 blur-3xl animate-blob animation-delay-4000"
        style={{
          background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)",
        }}
      />
    </div>
  );
};

export default AnimatedBackground;