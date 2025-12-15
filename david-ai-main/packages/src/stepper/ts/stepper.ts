// Stepper Component
const initializedStepperElements = new WeakSet<Element>();

type StepperContainer = HTMLElement & {
  __stepperCleanup?: () => void;
};

function updateStepperState(container: StepperContainer): void {
  const steps = container.querySelectorAll<HTMLElement>("[data-dui-step]");
  const stepContents = container.querySelectorAll<HTMLElement>("[data-dui-step-content]");
  const prevButtons = container.querySelectorAll<HTMLButtonElement>("[data-dui-stepper-prev]");
  const nextButtons = container.querySelectorAll<HTMLButtonElement>("[data-dui-stepper-next]");
  let currentStep = parseInt(container.getAttribute("data-dui-step") || "1", 10);

  function updateState(): void {
    // Update step circles and connector lines
    steps.forEach((step, index) => {
      const stepNumber = index + 1;
      step.setAttribute("data-active", String(stepNumber === currentStep));
      step.setAttribute("data-completed", String(stepNumber < currentStep));
      step.setAttribute("aria-disabled", String(stepNumber > currentStep));
    });

    // Update step content visibility
    stepContents.forEach((content) => {
      const contentStep = parseInt(content.getAttribute("data-dui-step-content") || "0", 10);
      if (contentStep === currentStep) {
        content.classList.remove("hidden");
      } else {
        content.classList.add("hidden");
      }
    });

    // Enable/disable buttons based on step
    prevButtons.forEach((button) => {
      button.disabled = currentStep === 1;
    });

    nextButtons.forEach((button) => {
      button.disabled = currentStep === steps.length;
    });
  }

  // Event listeners for buttons
  function onNextButtonClick(): void {
    if (currentStep < steps.length) {
      currentStep++;
      container.setAttribute("data-dui-step", String(currentStep));
      updateState();
    }
  }

  function onPrevButtonClick(): void {
    if (currentStep > 1) {
      currentStep--;
      container.setAttribute("data-dui-step", String(currentStep));
      updateState();
    }
  }

  nextButtons.forEach((button) => {
    button.addEventListener("click", onNextButtonClick);
  });

  prevButtons.forEach((button) => {
    button.addEventListener("click", onPrevButtonClick);
  });

  // Store references to cleanup
  container.__stepperCleanup = () => {
    nextButtons.forEach((button) => {
      button.removeEventListener("click", onNextButtonClick);
    });

    prevButtons.forEach((button) => {
      button.removeEventListener("click", onPrevButtonClick);
    });
  };

  // Initialize the state
  updateState();
}

// Function to initialize all steppers
export function initStepper(): void {
  document.querySelectorAll<StepperContainer>("[data-dui-stepper-container]").forEach((container) => {
    if (!initializedStepperElements.has(container)) {
      initializedStepperElements.add(container);

      // Set initial step based on attribute
      const initialStep = parseInt(container.getAttribute("data-dui-initial-step") || "1", 10);
      container.setAttribute("data-dui-step", String(initialStep));

      updateStepperState(container);
    }
  });
}

// Cleanup function to remove all steppers
export function cleanupSteppers(): void {
  document.querySelectorAll<StepperContainer>("[data-dui-stepper-container]").forEach((container) => {
    if (container.__stepperCleanup) {
      container.__stepperCleanup();
      delete container.__stepperCleanup;
    }

    initializedStepperElements.delete(container);
  });
}

// Auto-initialize steppers on DOMContentLoaded and observe dynamically added elements
if (typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    initStepper();
    new MutationObserver(initStepper).observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}
