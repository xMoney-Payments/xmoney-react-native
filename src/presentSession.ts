import type { PaymentSheetEvent } from './types';

/** Tracks one process-wide present so a second call can replace an idle sheet. */
export class PresentSession {
  inFlight = false;
  isProcessing = false;
  generation = 0;

  /**
   * `canceled` when a present is already processing, or when a wallet present
   * (`assumeProcessing`) is already in flight.
   * Otherwise starts a new generation (idle PaymentSheet presents are replaced).
   */
  begin(options?: { assumeProcessing?: boolean }): 'canceled' | 'go' {
    if (this.inFlight && (this.isProcessing || options?.assumeProcessing)) {
      return 'canceled';
    }
    this.generation += 1;
    this.inFlight = true;
    if (options?.assumeProcessing) {
      this.isProcessing = true;
    }
    return 'go';
  }

  track(
    generation: number,
    onEvent?: (event: PaymentSheetEvent) => void
  ): (event: PaymentSheetEvent) => void {
    return (event) => {
      if (generation === this.generation && event.type === 'processing') {
        this.isProcessing = event.isProcessing;
      }
      onEvent?.(event);
    };
  }

  finish(generation: number): void {
    if (generation === this.generation) {
      this.inFlight = false;
      this.isProcessing = false;
    }
  }

  reset(): void {
    this.inFlight = false;
    this.isProcessing = false;
    this.generation = 0;
  }
}
