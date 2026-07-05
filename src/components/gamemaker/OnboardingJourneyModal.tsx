import { useState } from "react";
import type {
  BuddySelection,
  TemplateExport,
} from "../../types/index.ts";
import {
  defaultBuddySelection,
  isBuddySelectionValid,
} from "../../types/buddyPicker.ts";
import type { CreateOnboardingJourneyInput } from "../../use-cases/createOnboardingJourney.ts";
import { useBuddyPickerOptions } from "../../hooks/useBuddyPickerOptions.ts";
import { BottomSheet } from "../patterns/BottomSheet.tsx";
import Button from "../ui/Button.tsx";
import { BUTTON_VARIANT } from "../ui/types.ts";
import { Input } from "../ui/Input.tsx";
import BuddyPicker from "./BuddyPicker.tsx";
import TemplateRadioList from "./TemplateRadioList.tsx";

type WizardStep = 1 | 2 | 3;

interface OnboardingJourneyModalProps {
  readonly sessionId: string;
  readonly templates: ReadonlyArray<TemplateExport>;
  readonly loading: boolean;
  readonly onSubmit: (input: CreateOnboardingJourneyInput) => void;
  readonly onClose: () => void;
}

const STEP_TITLES: Record<WizardStep, string> = {
  1: "Player name",
  2: "Assign buddy",
  3: "Choose template",
};

const OnboardingJourneyModal = ({
  sessionId,
  templates,
  loading,
  onSubmit,
  onClose,
}: OnboardingJourneyModalProps) => {
  const [step, setStep] = useState<WizardStep>(1);
  const [playerName, setPlayerName] = useState("");
  const [buddy, setBuddy] = useState<BuddySelection | null>(null);
  const [templateName, setTemplateName] = useState<string | null>(null);

  const {
    options: buddyOptions,
    loading: buddyLoading,
  } = useBuddyPickerOptions(sessionId, true);

  const trimmedName = playerName.trim();
  const canContinueStep1 = trimmedName.length > 0;
  const canContinueStep2 = isBuddySelectionValid(buddy);
  const stepTitle = STEP_TITLES[step];

  const handleContinue = () => {
    if (step === 1 && canContinueStep1) {
      setBuddy((current) =>
        current ?? defaultBuddySelection(sessionId, buddyOptions)
      );
      setStep(2);
      return;
    }
    if (step === 2 && canContinueStep2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const handleCreate = () => {
    if (!buddy || !canContinueStep2) return;
    onSubmit({
      playerName: trimmedName,
      buddy,
      templateName,
    });
  };

  const sheetHeader = (
    <div className="sheet-header sheet-header--stacked">
      <div className="sheet-header__meta">
        <span className="sheet-header__step">Step {step} of 3</span>
        <button
          type="button"
          className="sheet-header__cancel"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </button>
      </div>
      <h2 id="onboarding-journey-modal-title" className="sheet-header__title">
        {stepTitle}
      </h2>
    </div>
  );

  const sheetFooter = (
    <div className="sheet-footer oj-sheet__footer">
      <div className="oj-sheet__actions">
        {step > 1 && (
          <Button
            type="button"
            variant={BUTTON_VARIANT.GHOST}
            onClick={handleBack}
            disabled={loading}
          >
            Back
          </Button>
        )}
        {step < 3
          ? (
            <Button
              type="button"
              variant={BUTTON_VARIANT.PRIMARY}
              fullWidth={step === 1}
              onClick={handleContinue}
              disabled={
                loading ||
                (step === 1 && !canContinueStep1) ||
                (step === 2 && !canContinueStep2)
              }
              data-testid="oj-continue-btn"
            >
              Continue
            </Button>
          )
          : (
            <Button
              type="button"
              variant={BUTTON_VARIANT.PRIMARY}
              onClick={handleCreate}
              disabled={loading}
              data-testid="oj-create-journey-btn"
            >
              {loading ? "Creating…" : "Create journey"}
            </Button>
          )}
      </div>
    </div>
  );

  return (
    <BottomSheet
      open
      onClose={onClose}
      ariaLabel="New onboarding journey"
      testId="onboarding-journey-modal"
      sheetClassName="oj-sheet"
      dismissOnBackdrop={!loading}
      header={sheetHeader}
      footer={sheetFooter}
    >
      <div className="oj-sheet__body">
        {step === 1 && (
          <div data-testid="oj-step-name" className="oj-sheet__step-panel">
            <div className="form-field">
              <label className="form-label" htmlFor="oj-player-name">
                Player name
              </label>
              <Input
                id="oj-player-name"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="e.g. Sofia Chen"
                autoFocus
                data-testid="oj-player-name-input"
              />
            </div>
            <p className="oj-sheet__hint">
              This name appears on the player card and invite.
            </p>
          </div>
        )}

        {step === 2 && (
          <div data-testid="oj-step-buddy" className="oj-sheet__step-panel">
            <BuddyPicker
              sessionId={sessionId}
              options={buddyOptions}
              loading={buddyLoading}
              value={buddy}
              onChange={setBuddy}
            />
          </div>
        )}

        {step === 3 && (
          <div data-testid="oj-step-template" className="oj-sheet__step-panel">
            <TemplateRadioList
              templates={templates}
              value={templateName}
              onChange={setTemplateName}
            />
          </div>
        )}
      </div>
    </BottomSheet>
  );
};

export default OnboardingJourneyModal;
