// Native builds: no Learn library (web app only). Never rendered, since
// LEARN_AVAILABLE is false outside the web.
export function LearnScreen(_props: { onClose: () => void }) {
  return null;
}
