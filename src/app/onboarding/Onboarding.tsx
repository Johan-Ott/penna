import { DoneStep, FolderStep, PromisesStep, WelcomeStep } from "./OnboardingSteps.js";
import { ProjectStep } from "./ProjectStep.js";
import { continueFrom, LAST_STEP, useOnboarding, type OnboardingState } from "./useOnboarding.js";
import { t } from "../../i18n/i18n.js";

interface OnboardingProps {
  knownLibraryDir: string | null;
  /** The goal a new project starts with, from Inställningar. */
  defaultDailyGoal: number;
  /** 1 for a first start; 4 when a returning writer makes a new project. */
  startStep: number;
  onFinish: (projectDir: string, libraryDir: string | null) => void;
  /** Back to the welcome screen; only offered to a writer who has been through this before. */
  onCancel: () => void;
}

function dotClass(dot: number, step: number) {
  if (dot === step) return "current";
  return dot < step ? "done" : "";
}

function Progress({ step }: { step: number }) {
  const dots = Array.from({ length: LAST_STEP }, (_unused, index) => index + 1);
  return (
    <div className="progress-dots" role="progressbar" aria-label={`Steg ${step} av ${LAST_STEP}`}>
      {dots.map((dot) => (
        <span key={dot} className={dotClass(dot, step)} />
      ))}
    </div>
  );
}

function CurrentStep({ state, isFirst }: { state: OnboardingState; isFirst: boolean }) {
  if (state.step === 1) return <WelcomeStep />;
  if (state.step === 2) return <PromisesStep />;
  if (state.step === 3) return <FolderStep state={state} />;
  if (state.step === 4) return <ProjectStep state={state} isFirst={isFirst} />;
  return <DoneStep />;
}

// "Fortsätt" on every step, "Börja skriva" on the last; importing and opening have their own.
function PrimaryButton({
  state,
  onFinish,
}: { state: OnboardingState } & Pick<OnboardingProps, "onFinish">) {
  if (state.step === LAST_STEP && state.projectDir) {
    const projectDir = state.projectDir;
    return (
      <button
        className="button primary large"
        autoFocus
        onClick={() => onFinish(projectDir, state.libraryDir)}
      >
        {t("Börja skriva")}
      </button>
    );
  }
  if (state.step === 4 && state.mode !== "new") return null;
  return (
    <button className="button primary large" onClick={() => void continueFrom(state)}>
      {t("Fortsätt")}
    </button>
  );
}

function Navigation({
  state,
  startStep,
  onFinish,
  onCancel,
}: { state: OnboardingState } & Omit<OnboardingProps, "knownLibraryDir" | "defaultDailyGoal">) {
  return (
    <div className="onboarding-nav">
      {state.step === startStep && startStep > 1 && (
        <button className="link-button quiet" onClick={onCancel}>
          {t("Avbryt")}
        </button>
      )}
      {state.step > startStep && (
        <button className="link-button quiet" onClick={() => state.setStep(state.step - 1)}>
          {t("Tillbaka")}
        </button>
      )}
      <span className="spacer" />
      <PrimaryButton state={state} onFinish={onFinish} />
    </div>
  );
}

/** The first start, as in the design: five short steps and then straight into a scene. */
export function Onboarding(props: OnboardingProps) {
  const { startStep, onFinish, onCancel } = props;
  const state = useOnboarding(props);
  return (
    <main className="onboarding">
      <div className="onboarding-card">
        <div className="onboarding-top">
          <span className="brand-mark medium" aria-hidden="true">
            P
          </span>
          <Progress step={state.step} />
        </div>
        <div className="onboarding-body">
          <CurrentStep state={state} isFirst={startStep === 1} />
          {state.problem && (
            <p className="onboarding-problem" role="alert">
              {state.problem}
            </p>
          )}
        </div>
        <Navigation state={state} startStep={startStep} onFinish={onFinish} onCancel={onCancel} />
      </div>
    </main>
  );
}
