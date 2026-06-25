import fs from 'fs';
import path from 'path';
import { preprocessBeagleCourses } from '../preprocess/coursePreprocessor';

const main = async (): Promise<void> => {
  const dataDir = path.resolve(__dirname, '../../../data');
  const outputDir = path.resolve(__dirname, '../../../data/processed');
  const outputPath = path.join(outputDir, 'beagle_courses_preprocessed.json');
  const summaryPath = path.join(outputDir, 'beagle_courses_preprocess_summary.json');
  const issuesPath = path.join(outputDir, 'beagle_course_quality_issues.json');

  fs.mkdirSync(outputDir, { recursive: true });

  const result = await preprocessBeagleCourses(dataDir);

  fs.writeFileSync(outputPath, JSON.stringify(result.courses, null, 2), 'utf8');
  fs.writeFileSync(summaryPath, JSON.stringify(result.summary, null, 2), 'utf8');
  fs.writeFileSync(issuesPath, JSON.stringify(result.qualityIssues, null, 2), 'utf8');

  console.log('Course preprocessing complete.');
  console.log(JSON.stringify(result.summary, null, 2));
  console.log(`Output: ${outputPath}`);
  console.log(`Summary: ${summaryPath}`);
  console.log(`Issues: ${issuesPath}`);
};

main().catch((error) => {
  console.error('Course preprocessing failed:', error);
  process.exit(1);
});
