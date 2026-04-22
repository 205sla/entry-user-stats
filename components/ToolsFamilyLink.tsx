/**
 * "도구.엔트리.org" 패밀리 사이트 프로모 링크.
 *
 * 여러 서비스의 푸터에서 공용으로 쓰도록 단독 컴포넌트로 분리했다.
 * 다른 프로젝트로 옮길 때는 이 파일만 복사하면 동작한다
 * (Tailwind + brand-500/600/700 색상 토큰에만 의존).
 */
export default function ToolsFamilyLink() {
  return (
    <a
      href="https://도구.엔트리.org"
      target="_blank"
      rel="noreferrer"
      aria-label="도구.엔트리.org 에서 다른 도구 보러가기"
      className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm text-slate-600 shadow-sm transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
    >
      <span>다른 도구 보러가기</span>
      <span
        aria-hidden="true"
        className="h-3 w-px bg-slate-200 transition group-hover:bg-brand-500/40"
      />
      <span className="font-semibold text-brand-600 transition group-hover:text-brand-700">
        도구.엔트리.org
      </span>
      <span
        aria-hidden="true"
        className="text-brand-600 transition group-hover:translate-x-0.5 group-hover:text-brand-700"
      >
        →
      </span>
    </a>
  )
}
