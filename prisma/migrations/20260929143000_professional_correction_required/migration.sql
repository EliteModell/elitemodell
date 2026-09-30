-- Additive status used to distinguish a correction request from a definitive rejection.
ALTER TYPE "ProfessionalStatus" ADD VALUE IF NOT EXISTS 'CORRECTION_REQUIRED';
