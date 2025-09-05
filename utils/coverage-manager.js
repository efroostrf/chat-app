const { glob } = require("glob");
const fs = require("fs").promises;
const path = require("path");

const REPORTS_DIR_NAME = "coverage";
const REPORTS_DIR_PATH = path.resolve(process.cwd(), REPORTS_DIR_NAME);

const GREEN = "\x1b[32m%s\x1b[0m";
const BLUE = "\x1b[34m%s\x1b[0m";

/**
 * Fetches all lcov.info files from coverage directories, excluding node_modules.
 * @returns {Promise<string[]>} A promise that resolves with an array of file paths.
 */
const getLcovFiles = function () {
  return glob(`**/coverage/lcov.info`, {
    ignore: ["**/node_modules/**", "coverage/lcov.info"],
  });
};

/**
 * Creates a temp directory for all the reports.
 * @returns {Promise<void>} A promise that resolves when the directory has been created.
 */
async function createTempDir() {
  console.log(BLUE, `Creating a temp ${REPORTS_DIR_NAME} directory…`);

  try {
    await fs.mkdir(REPORTS_DIR_PATH, { recursive: true });
    console.log(GREEN, "Done!");
  } catch (err) {
    console.error("Error creating directory:", err);
  }
}

(async function () {
  try {
    // Fetch all lcov.info files
    const files = await getLcovFiles();

    console.log("files are", files);

    // Create temp directory
    await createTempDir();

    // Read all files and join their contents
    const mergedReport = await Promise.all(
      files.map((file) => fs.readFile(file, "utf-8"))
    ).then((contents) => contents.join(""));

    console.log(BLUE, `Copying the coverage report…`);

    // Write the merged report to a new lcov.info file
    await fs.writeFile(
      path.resolve(REPORTS_DIR_PATH, `lcov.info`),
      mergedReport
    );

    console.log("Code coverage has been saved!");
  } catch (err) {
    console.error("Error:", err);
  }
})();
