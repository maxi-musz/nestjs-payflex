/**
 * Registration Steps Configuration
 * 
 * This is the SINGLE SOURCE OF TRUTH for all registration steps.
 * When adding a new step, only update this file and the database schema.
 * 
 * All other files will automatically use this configuration.
 */

export enum RegistrationStepKey {
  START_REGISTRATION = 'START_REGISTRATION',
  OTP_VERIFICATION = 'OTP_VERIFICATION',
  ID_INFORMATION = 'ID_INFORMATION',
  FACE_VERIFICATION = 'FACE_VERIFICATION',
  RESIDENTIAL_ADDRESS = 'RESIDENTIAL_ADDRESS',
  PEP_DECLARATION = 'PEP_DECLARATION',
  INCOME_DECLARATION = 'INCOME_DECLARATION',
  PASSWORD_SETUP = 'PASSWORD_SETUP',
  ACCOUNT_TIER_INFO = 'ACCOUNT_TIER_INFO',
  COMPLETE = 'COMPLETE',
}

export interface StepConfig {
  stepNumber: number;
  stepKey: RegistrationStepKey;
  name: string;
  nextStep: RegistrationStepKey;
  requiresVerification?: boolean;
  verificationField?: string; // e.g., 'id_verification_status', 'face_verification_status'
  hasVerifiedFlag?: boolean; // e.g., step_3_verified
  isOptional?: boolean;
  canSkip?: boolean;
  getStatusMessage?: (verificationStatus?: string | null) => string;
}

/**
 * Registration Steps Configuration
 * 
 * To add a new step:
 * 1. Add the step key to RegistrationStepKey enum above
 * 2. Add the step config below in the correct order
 * 3. Update the database schema to add step_X_completed field
 * 4. That's it! All other code will automatically work.
 */
export const REGISTRATION_STEPS: StepConfig[] = [
  {
    stepNumber: 1,
    stepKey: RegistrationStepKey.START_REGISTRATION,
    name: 'Phone Registration',
    nextStep: RegistrationStepKey.OTP_VERIFICATION,
    getStatusMessage: () => 'Please complete phone registration.',
  },
  {
    stepNumber: 2,
    stepKey: RegistrationStepKey.OTP_VERIFICATION,
    name: 'OTP Verification',
    nextStep: RegistrationStepKey.ID_INFORMATION,
    requiresVerification: true,
    verificationField: 'is_phone_verified',
    getStatusMessage: () => 'Please verify your phone number with OTP.',
  },
  {
    stepNumber: 3,
    stepKey: RegistrationStepKey.ID_INFORMATION,
    name: 'ID Information',
    nextStep: RegistrationStepKey.FACE_VERIFICATION,
    requiresVerification: true,
    verificationField: 'id_verification_status',
    hasVerifiedFlag: true, // step_3_verified
    getStatusMessage: (verificationStatus?: string | null) => {
      if (verificationStatus === 'verified') {
        return 'ID verified successfully. You can proceed to face verification.';
      } else if (verificationStatus === 'pending') {
        return 'ID verification is pending. Please wait for verification to complete.';
      } else if (verificationStatus === 'failed') {
        return 'ID verification failed. Please check your ID and try again.';
      } else {
        return 'Please submit your ID information (NIN or BVN).';
      }
    },
  },
  {
    stepNumber: 4,
    stepKey: RegistrationStepKey.FACE_VERIFICATION,
    name: 'Face Verification',
    nextStep: RegistrationStepKey.RESIDENTIAL_ADDRESS,
    requiresVerification: true,
    verificationField: 'face_verification_status',
    getStatusMessage: (verificationStatus?: string | null) => {
      if (verificationStatus === 'verified') {
        return 'Face verification completed. You can proceed to address information.';
      } else if (verificationStatus === 'pending') {
        return 'Face verification is pending. Please wait for verification to complete.';
      } else if (verificationStatus === 'failed') {
        return 'Face verification failed. Please try again.';
      } else {
        return 'Please complete face verification.';
      }
    },
  },
  {
    stepNumber: 5,
    stepKey: RegistrationStepKey.RESIDENTIAL_ADDRESS,
    name: 'Residential Address',
    nextStep: RegistrationStepKey.PEP_DECLARATION,
    getStatusMessage: () => 'Please provide your residential address.',
  },
  {
    stepNumber: 6,
    stepKey: RegistrationStepKey.PEP_DECLARATION,
    name: 'PEP Declaration',
    nextStep: RegistrationStepKey.INCOME_DECLARATION,
    getStatusMessage: () => 'Please complete PEP (Politically Exposed Person) declaration.',
  },
  {
    stepNumber: 7,
    stepKey: RegistrationStepKey.INCOME_DECLARATION,
    name: 'Income Declaration',
    nextStep: RegistrationStepKey.PASSWORD_SETUP,
    getStatusMessage: () => 'Please declare your income range.',
  },
  {
    stepNumber: 8,
    stepKey: RegistrationStepKey.PASSWORD_SETUP,
    name: 'Password Setup',
    nextStep: RegistrationStepKey.ACCOUNT_TIER_INFO,
    getStatusMessage: () => 'Please set up your 6-digit login password.',
  },
  {
    stepNumber: 9,
    stepKey: RegistrationStepKey.ACCOUNT_TIER_INFO,
    name: 'Account Tier Information',
    nextStep: RegistrationStepKey.COMPLETE,
    getStatusMessage: () => 'Please review your account tier information.',
  },
];

/**
 * Helper functions to work with steps
 */
export class RegistrationStepsHelper {
  /**
   * Get step config by step number
   */
  static getStepByNumber(stepNumber: number): StepConfig | undefined {
    return REGISTRATION_STEPS.find((step) => step.stepNumber === stepNumber);
  }

  /**
   * Get step config by step key
   */
  static getStepByKey(stepKey: RegistrationStepKey): StepConfig | undefined {
    return REGISTRATION_STEPS.find((step) => step.stepKey === stepKey);
  }

  /**
   * Get all steps
   */
  static getAllSteps(): StepConfig[] {
    return REGISTRATION_STEPS;
  }

  /**
   * Get total number of steps
   */
  static getTotalSteps(): number {
    return REGISTRATION_STEPS.length;
  }

  /**
   * Check if step is completed based on registration progress
   */
  static isStepCompleted(
    stepNumber: number,
    registrationProgress: any,
  ): boolean {
    const stepField = `step_${stepNumber}_completed`;
    return registrationProgress[stepField] || false;
  }

  /**
   * Check if step is verified (for steps that require verification)
   */
  static isStepVerified(
    stepNumber: number,
    registrationProgress: any,
  ): boolean {
    const step = this.getStepByNumber(stepNumber);
    if (!step) return false;

    // Check if step has a verified flag (e.g., step_3_verified)
    if (step.hasVerifiedFlag) {
      const verifiedField = `step_${stepNumber}_verified`;
      return registrationProgress[verifiedField] || false;
    }

    // Check verification field (e.g., id_verification_status)
    if (step.verificationField) {
      const verificationStatus = registrationProgress[step.verificationField];
      return verificationStatus === 'verified';
    }

    // For steps without verification, completed = verified
    return this.isStepCompleted(stepNumber, registrationProgress);
  }

  /**
   * Get verification status for a step
   */
  static getVerificationStatus(
    stepNumber: number,
    registrationProgress: any,
  ): string | null {
    const step = this.getStepByNumber(stepNumber);
    if (!step || !step.verificationField) return null;

    return registrationProgress[step.verificationField] || null;
  }

  /**
   * Find the current step based on registration progress
   * Returns the first incomplete step
   */
  static findCurrentStep(registrationProgress: any): {
    stepNumber: number;
    stepKey: RegistrationStepKey;
    nextStep: RegistrationStepKey;
    canProceed: boolean;
  } {
    for (const step of REGISTRATION_STEPS) {
      const isCompleted = this.isStepCompleted(
        step.stepNumber,
        registrationProgress,
      );
      const isVerified = this.isStepVerified(
        step.stepNumber,
        registrationProgress,
      );

      // Special handling for step 3 (ID Information)
      if (step.stepNumber === 3) {
        if (!isCompleted) {
          return {
            stepNumber: step.stepNumber,
            stepKey: step.stepKey,
            nextStep: step.nextStep,
            canProceed: false,
          };
        }
        if (isCompleted && !isVerified) {
          // ID submitted but not verified yet
          return {
            stepNumber: step.stepNumber,
            stepKey: step.stepKey,
            nextStep: step.stepKey, // Stay on same step
            canProceed: false,
          };
        }
        if (isCompleted && isVerified) {
          // Step 3 verified, check next step
          continue;
        }
      }

      // For other steps
      if (!isCompleted) {
        return {
          stepNumber: step.stepNumber,
          stepKey: step.stepKey,
          nextStep: step.nextStep,
          canProceed: true,
        };
      }
    }

    // All steps completed
    return {
      stepNumber: REGISTRATION_STEPS.length,
      stepKey: RegistrationStepKey.COMPLETE,
      nextStep: RegistrationStepKey.COMPLETE,
      canProceed: true,
    };
  }

  /**
   * Build steps object for response
   */
  static buildStepsObject(registrationProgress: any, regData?: any): any {
    const steps: any = {};

    for (const step of REGISTRATION_STEPS) {
      const isCompleted = this.isStepCompleted(
        step.stepNumber,
        registrationProgress,
      );
      const isVerified = this.isStepVerified(
        step.stepNumber,
        registrationProgress,
      );
      const verificationStatus = this.getVerificationStatus(
        step.stepNumber,
        registrationProgress,
      );

      const stepData: any = {
        name: step.name,
        completed: isCompleted,
        verified: isVerified,
      };

      // Add step-specific data
      if (step.stepNumber === 2) {
        stepData.is_phone_verified =
          registrationProgress.is_phone_verified || false;
      }

      if (step.stepNumber === 3) {
        stepData.id_type = regData?.id_type || null;
        stepData.id_number = regData?.id_number
          ? `${regData.id_number.substring(0, 3)}***${regData.id_number.substring(8)}`
          : null;
        stepData.verification_status = verificationStatus;
        stepData.verification_provider = regData?.verification_provider || null;
        stepData.verification_data = regData?.verification_result?.data || null;
      }

      if (step.stepNumber === 4) {
        stepData.verification_status = verificationStatus;
      }

      steps[`step_${step.stepNumber}`] = stepData;
    }

    return steps;
  }

  /**
   * Get status message for a step
   */
  static getStatusMessage(
    stepNumber: number,
    registrationProgress: any,
  ): string {
    const step = this.getStepByNumber(stepNumber);
    if (!step || !step.getStatusMessage) {
      return 'Please continue your registration.';
    }

    const verificationStatus = this.getVerificationStatus(
      stepNumber,
      registrationProgress,
    );

    return step.getStatusMessage(verificationStatus);
  }

  /**
   * Check if a step is pending verification
   * A step is pending if:
   * - It requires verification
   * - It is completed (submitted)
   * - But it is not yet verified
   * - And verification status is 'pending'
   */
  static isStepPending(
    stepNumber: number,
    registrationProgress: any,
  ): boolean {
    const step = this.getStepByNumber(stepNumber);
    if (!step || !step.requiresVerification) {
      return false; // Steps without verification cannot be pending
    }

    const isCompleted = this.isStepCompleted(stepNumber, registrationProgress);
    const isVerified = this.isStepVerified(stepNumber, registrationProgress);
    const verificationStatus = this.getVerificationStatus(
      stepNumber,
      registrationProgress,
    );

    // Step is pending if: completed but not verified, and status is 'pending'
    return (
      isCompleted && !isVerified && verificationStatus === 'pending'
    );
  }

  /**
   * Build comprehensive step pending status object
   * Returns an object with flags for each step indicating if it's pending
   * Example: { is_step_1_pending: false, is_step_2_pending: true, ... }
   */
  static buildStepPendingStatus(registrationProgress: any): {
    [key: string]: boolean;
  } {
    const pendingStatus: { [key: string]: boolean } = {};

    for (const step of REGISTRATION_STEPS) {
      const pendingKey = `is_step_${step.stepNumber}_pending`;
      pendingStatus[pendingKey] = this.isStepPending(
        step.stepNumber,
        registrationProgress,
      );
    }

    return pendingStatus;
  }

  /**
   * Get verification status for all steps that require verification
   * Returns an object with verification status for each step
   * Example: { step_2_verification_status: 'verified', step_3_verification_status: 'pending', ... }
   */
  static buildStepVerificationStatus(registrationProgress: any): {
    [key: string]: string | null;
  } {
    const verificationStatus: { [key: string]: string | null } = {};

    for (const step of REGISTRATION_STEPS) {
      if (step.requiresVerification) {
        const statusKey = `step_${step.stepNumber}_verification_status`;
        verificationStatus[statusKey] = this.getVerificationStatus(
          step.stepNumber,
          registrationProgress,
        );
      }
    }

    return verificationStatus;
  }
}

