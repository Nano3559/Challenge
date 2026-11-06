export const healthPaths = ['/health', '/health/configcheck', '/health/dbcheck', '/health/db', '/health/memory', '/health/uptime'] as const;
export const expectedGames = ['Quiz', 'Hangman', 'Minesweeper', 'Bug Eater', 'Tic Tac Toe', 'Sudoku', 'Maze'];
export const missingGameId = 999999;
export const chartTypes = ['table', 'pie', 'chart'] as const;
export const generatedDayCounts = [1, 3, 91];
export const advancedRoiScenario = {
  baseTestCases: 10, startingTestCases: 0, automationNotApplicable: 0, numberOfSprints: 2,
  newTestsPerRelease: 0, modifiedTestsPerRelease: 0, removedTestsPerRelease: 0,
  manualCreationHours: 1, manualExecutionHours: 1, averageEffortOnModificationOfManualTC: 0,
  hourlyCost: 10, numberOfEnvs: 1, numberOfAutomationOfBaseTestCases: 1,
  automationCreationHours: 1, automationExecutionHours: 0.1, averageEffortOnModificationOfAutomatedTC: 0, additionalMaintenanceHours: 0,
};
