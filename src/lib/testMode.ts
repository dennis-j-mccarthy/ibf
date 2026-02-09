// Shared in-memory test mode state (resets on server restart)
// Only works in development mode

let testModeEnabled = false;

export function isTestModeEnabled(): boolean {
  return testModeEnabled;
}

export function setTestMode(enabled: boolean): void {
  testModeEnabled = enabled;
}
