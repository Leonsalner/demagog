let shuttingDownFlag = false;
let inFlightCount = 0;

export function isServerShuttingDown(): boolean {
  return shuttingDownFlag;
}

export function incrementInFlight(): void {
  inFlightCount++;
}

export function decrementInFlight(): void {
  inFlightCount--;
  if (inFlightCount < 0) {
    inFlightCount = 0;
  }
}

export async function awaitPendingRequests(timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while (inFlightCount > 0) {
    if (Date.now() - start > timeoutMs) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

export function setServerShuttingDown(): void {
  shuttingDownFlag = true;
}
