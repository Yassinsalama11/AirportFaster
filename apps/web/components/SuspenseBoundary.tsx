import { Suspense } from 'react';

type SuspenseBoundaryProps = {
  fallback?: React.ReactNode;
  children?: React.ReactNode;
};

export const SuspenseBoundary = Suspense as unknown as (
  props: SuspenseBoundaryProps,
) => React.ReactNode;
