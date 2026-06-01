export const READER_ONBOARDING_STORAGE_KEY = "novelang.readerOnboarding.v1";

export type ReaderOnboardingStep = "sentence" | "word" | "ratio" | "done";

type ReaderOnboardingAction =
  | "sentence-toggled"
  | "word-opened"
  | "ratio-changed";

export function advanceReaderOnboarding(
  step: ReaderOnboardingStep,
  action: ReaderOnboardingAction
): ReaderOnboardingStep {
  if (step === "sentence" && action === "sentence-toggled") return "word";
  if (step === "word" && action === "word-opened") return "ratio";
  if (step === "ratio" && action === "ratio-changed") return "done";
  return step;
}
