import { Router } from 'express';
import {
  requireAuth,
  type AuthenticatedRequest,
} from '../middleware/authMiddleware.js';
import {
  getOnboardingPreferences,
  saveOnboardingPreferences,
} from '../services/onboardingService.js';

import {
  ALLOWED_CURRENCIES,
  MAX_SHORT_TEXT_LENGTH,
  toMinorUnits,
} from '../utils/validation.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required',
        });
      }

      const preferences =
        await getOnboardingPreferences(req.userId);

      if (!preferences) {
        return res.status(404).json({
          status: 'error',
          message: 'Onboarding preferences not found',
        });
      }

      return res.status(200).json({
        status: 'success',
        preferences,
      });
    } catch (error) {
      console.error(
        'Getting onboarding preferences failed:',
        error
      );

      return res.status(500).json({
        status: 'error',
        message:
          'Unable to get onboarding preferences',
      });
    }
  }
);

router.post(
  '/',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        currency,
        incomeSource,
        financialObjective,
        monthlyIncome,
      } = req.body;

      if (
        !currency ||
        typeof currency !== 'string'
      ) {
        return res.status(400).json({
          status: 'error',
          message: 'Currency is required',
        });
      }

      if (
        !incomeSource ||
        typeof incomeSource !== 'string'
      ) {
        return res.status(400).json({
          status: 'error',
          message: 'Income source is required',
        });
      }

      if (
        !financialObjective ||
        typeof financialObjective !== 'string'
      ) {
        return res.status(400).json({
          status: 'error',
          message: 'Financial objective is required',
        });
      }

      if (!ALLOWED_CURRENCIES.includes(currency)) {
        return res.status(400).json({
          status: 'error',
          message: 'Unsupported currency',
        });
      }

      if (
        incomeSource.trim().length > MAX_SHORT_TEXT_LENGTH ||
        financialObjective.trim().length > MAX_SHORT_TEXT_LENGTH
      ) {
        return res.status(400).json({
          status: 'error',
          message: `Answers must be ${MAX_SHORT_TEXT_LENGTH} characters or less`,
        });
      }

      let monthlyIncomeMinor: number | null = null;

      if (
        monthlyIncome !== undefined &&
        monthlyIncome !== null &&
        monthlyIncome !== ''
      ) {
        monthlyIncomeMinor = toMinorUnits(monthlyIncome, {
          allowZero: true,
        });

        if (monthlyIncomeMinor === null) {
          return res.status(400).json({
            status: 'error',
            message:
              'Monthly income must be a valid amount',
          });
        }
      }

      if (!req.userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required',
        });
      }

      const preferences =
        await saveOnboardingPreferences({
          userId: req.userId,
          currencyCode: currency,
          incomeSource: incomeSource.trim(),
          monthlyIncomeMinor,
          financialObjective: financialObjective.trim(),
        });

      return res.status(200).json({
        status: 'success',
        message: 'Onboarding completed successfully',
        preferences,
      });
    } catch (error) {
      console.error(
        'Saving onboarding preferences failed:',
        error
      );

      return res.status(500).json({
        status: 'error',
        message:
          'Unable to save onboarding preferences',
      });
    }
  }
);

export default router;