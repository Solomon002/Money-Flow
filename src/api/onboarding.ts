import { apiRequest } from './client.js';

export type OnboardingInput = {
  currency: string;
  incomeSource: string;
  financialObjective: string;
  monthlyIncome: string;
};

export async function saveOnboarding(
  input: OnboardingInput
) {
  return apiRequest('/api/onboarding', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getOnboardingPreferences() {
  return apiRequest('/api/onboarding', {
    method: 'GET',
  });
}