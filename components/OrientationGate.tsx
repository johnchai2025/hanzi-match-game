'use client'

/** 竖屏时显示「请横屏」提示（仅靠 CSS @media 控制显隐）。 */
export function OrientationGate() {
  return (
    <div className="orient-gate">
      <div className="orient-emoji">🔄</div>
      <div className="orient-text">把平板横过来玩吧～</div>
    </div>
  );
}
