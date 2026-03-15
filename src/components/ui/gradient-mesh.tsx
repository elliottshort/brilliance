'use client'

export function GradientMesh() {
  return (
    <>
      <style>{`
        @keyframes mesh-drift-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.05); }
        }
        @keyframes mesh-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-20px, 15px) scale(1.03); }
          66% { transform: translate(15px, 10px) scale(0.97); }
        }
        @keyframes mesh-drift-3 {
          0%, 100% { transform: translate(0, 0) scale(1.02); }
          50% { transform: translate(-25px, -15px) scale(0.98); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mesh-blob { animation: none !important; }
        }
      `}</style>
      <div
        className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        {/* Primary blue — top right */}
        <div
          className="mesh-blob absolute -top-[10%] -right-[5%] h-[35rem] w-[35rem] rounded-full bg-primary/[0.06] blur-3xl dark:bg-primary/[0.04]"
          style={{ animation: 'mesh-drift-1 25s ease-in-out infinite' }}
        />

        {/* Warm rose — bottom left */}
        <div
          className="mesh-blob absolute -bottom-[15%] -left-[10%] h-[30rem] w-[30rem] rounded-full bg-rose-300/[0.05] blur-[100px] dark:bg-rose-400/[0.03]"
          style={{ animation: 'mesh-drift-2 30s ease-in-out infinite' }}
        />

        {/* Violet accent — center left */}
        <div
          className="mesh-blob absolute top-[40%] left-[10%] h-[25rem] w-[25rem] rounded-full bg-violet-300/[0.04] blur-3xl dark:bg-violet-400/[0.03]"
          style={{ animation: 'mesh-drift-3 22s ease-in-out infinite' }}
        />

        {/* Subtle teal — upper center */}
        <div
          className="mesh-blob absolute top-[15%] right-[25%] h-[20rem] w-[20rem] rounded-full bg-emerald-300/[0.04] blur-[100px] dark:bg-emerald-400/[0.02]"
          style={{ animation: 'mesh-drift-1 28s ease-in-out infinite reverse' }}
        />
      </div>
    </>
  )
}
