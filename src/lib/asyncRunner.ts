/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Intelligent Asynchronous Background Runner
 * Handles deferring non-essential compute, heavy parsing loops, secondary DB writes,
 * and background metrics updates without blocking the browser's main UI thread.
 */

type AsyncTask<T> = () => Promise<T> | T;

export class AsyncRunner {
  private static activeJobsCount = 0;

  /**
   * Run a task fully in the background. It will execute as an unawaited safe Promise.
   * Dispatches immediately and catches all internal exceptions.
   */
  static runInBackground<T>(taskName: string, task: AsyncTask<T>): void {
    this.activeJobsCount++;
    console.log(`[Async Background Runner] Starting job: [${taskName}] (Active: ${this.activeJobsCount})`);

    // Use a macro-task queue deferral (setTimeout of 0) to ensure the UI thread 
    // completes its immediate render cycle before initializing the background job.
    setTimeout(async () => {
      try {
        await task();
        console.log(`[Async Background Runner] Job completed successfully: [${taskName}]`);
      } catch (error) {
        console.error(`[Async Background Runner] Exception caught in background job [${taskName}]:`, error);
      } finally {
        this.activeJobsCount = Math.max(0, this.activeJobsCount - 1);
      }
    }, 0);
  }

  /**
   * Defer a priority checker (like alert triggering, notifications dispatch, or report consolidation)
   * to execute when the CPU is idle or after a slight delay, preventing main thread lag on initial boot.
   */
  static deferExecution<T>(taskName: string, task: AsyncTask<T>, delayMs = 1500): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      setTimeout(async () => {
        try {
          console.log(`[Async Background Deferral] Executing idle deferred job: [${taskName}]`);
          const result = await task();
          resolve(result);
        } catch (error) {
          console.error(`[Async Background Deferral] Error in deferred job [${taskName}]:`, error);
          reject(error);
        }
      }, delayMs);
    });
  }
}
