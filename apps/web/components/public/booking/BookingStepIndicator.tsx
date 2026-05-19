import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookingStepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
  labels: {
    details: string;
    review: string;
    payment: string;
    confirmation: string;
  };
}

export function BookingStepIndicator({ currentStep, labels }: BookingStepIndicatorProps) {
  const steps = [
    { number: 1 as const, label: labels.details },
    { number: 2 as const, label: labels.review },
    { number: 3 as const, label: labels.payment },
    { number: 4 as const, label: labels.confirmation },
  ];

  return (
    <nav aria-label="Booking progress" className="flex items-center justify-center w-full">
      {steps.map((step, index) => {
        const isCompleted = step.number < currentStep;
        const isCurrent = step.number === currentStep;

        return (
          <div key={step.number} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <div className="flex flex-col items-center shrink-0">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full border-2 text-sm font-bold transition-all',
                  isCompleted && 'bg-brand-gold border-brand-gold text-ink',
                  isCurrent && 'bg-surface border-brand-gold text-brand-gold-dark shadow-pill',
                  !isCompleted && !isCurrent && 'bg-surface border-line text-ink-3'
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" strokeWidth={3} />
                ) : (
                  <span dir="ltr">{step.number}</span>
                )}
              </div>
              <span
                className={cn(
                  'mt-2 text-xs font-medium transition-colors whitespace-nowrap',
                  (isCompleted || isCurrent) ? 'text-ink' : 'text-ink-3'
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2 sm:mx-3 mb-6 rounded-full transition-colors min-w-[20px]',
                  isCompleted ? 'bg-brand-gold' : 'bg-line'
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
