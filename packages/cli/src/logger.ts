export const Logger = {
  logInfo(message: string): void {
    console.log(`Info: ${message}`);
  },

  logWarning(message: string): void {
    console.warn(`Warning: ${message}`);
  },

  logError(message: string): void {
    throw new Error(
      `\n› The following error occurred\n› ${message}\n› See more help with --help`
    );
  }
};
